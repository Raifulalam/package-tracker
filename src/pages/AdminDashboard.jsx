import { useCallback, useEffect, useMemo, useState } from 'react';
import PricingEditor from '../components/PricingEditor';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';
import { shipmentStatuses } from '../lib/shipment';

const emptyPayload = {
  shipments: [],
  stats: { total: 0, pending: 0, assigned: 0, inTransit: 0, delivered: 0, cancelled: 0 },
  analytics: { dailyVolume: [], performance: [] },
  agents: [],
  usersByRole: {},
};

const fallbackMeta = { page: 1, totalPages: 1, total: 0 };

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [payload, setPayload] = useState(emptyPayload);
  const [meta, setMeta] = useState(fallbackMeta);
  const [filters, setFilters] = useState({ search: '', status: 'All', date: '', page: 1 });
  const [searchDraft, setSearchDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [pricing, setPricing] = useState(null);
  const [savingPricing, setSavingPricing] = useState(false);

  const loadDashboard = useCallback(async (currentFilters = filters, showLoader = true) => {
    if (showLoader) setLoading(true);

    const params = new URLSearchParams({
      page: String(currentFilters.page),
      limit: '8',
      status: currentFilters.status,
      search: currentFilters.search,
    });

    if (currentFilters.date) {
      params.set('date', currentFilters.date);
    }

    try {
      const [response, pricingResponse] = await Promise.all([
        api.get(`/api/admin/packages?${params.toString()}`, { token: user.token }),
        api.get('/api/admin/pricing', { token: user.token }),
      ]);

      setPayload(response.data || emptyPayload);
      setMeta(response.meta || fallbackMeta);
      setPricing(pricingResponse || {});
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, user.token]);

  useEffect(() => {
    loadDashboard(filters);

    const socket = getSocket();
    const refresh = () => loadDashboard(filters, false);

    socket.on('dashboard:refresh', refresh);
    socket.on('agents:availability', refresh);

    return () => {
      socket.off('dashboard:refresh', refresh);
      socket.off('agents:availability', refresh);
    };
  }, [filters, loadDashboard]);

  const handlePricingChange = (event) => {
    const { name, value } = event.target;
    setPricing((current) => ({
      ...current,
      [name]: Number(value),
    }));
  };

  const handlePricingSubmit = async (event) => {
    event.preventDefault();
    setSavingPricing(true);

    try {
      await api.put('/api/admin/pricing', pricing, { token: user.token });
      showToast('Pricing rules updated successfully.', 'success');
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPricing(false);
    }
  };

  const assignShipment = async () => {
    if (!selectedShipment || !selectedAgentId) return;

    setBusyKey(`assign:${selectedShipment._id}`);

    try {
      await api.put(
        `/api/admin/shipments/${selectedShipment._id}/assign`,
        { agentId: selectedAgentId },
        { token: user.token }
      );
      showToast('Shipment assigned successfully.', 'success');
      setSelectedShipment(null);
      setSelectedAgentId('');
      await loadDashboard(filters, false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const applyFilters = (nextFilters) => {
    const merged = { ...filters, ...nextFilters, search: searchDraft };
    setFilters(merged);
  };

  const availableAgents = useMemo(
    () => payload.agents.filter((agent) => agent.isAvailable),
    [payload.agents]
  );

  const dispatchQueue = useMemo(
    () => payload.shipments.filter((shipment) => ['Pending', 'Assigned', 'Picked Up', 'In Transit', 'Out for Delivery'].includes(shipment.status)),
    [payload.shipments]
  );

  const atRiskShipments = useMemo(
    () => payload.shipments.filter((shipment) => shipment.paymentStatus !== 'Paid' || shipment.status === 'Pending').slice(0, 5),
    [payload.shipments]
  );

  const roleCards = useMemo(
    () => [
      ['Senders', payload.usersByRole.sender || 0, 'Accounts creating shipments.'],
      ['Agents', payload.usersByRole.agent || 0, 'Field couriers available for assignment.'],
      ['Admins', payload.usersByRole.admin || 0, 'Control users managing the network.'],
      ['Online agents', availableAgents.length, 'Couriers currently available for dispatch.'],
    ],
    [availableAgents.length, payload.usersByRole]
  );

  const cards = useMemo(
    () => [
      ['Total Shipments', payload.stats.total, 'info', 'All shipments visible to the control tower.'],
      ['Pending', payload.stats.pending, 'warning', 'New bookings waiting for dispatch attention.'],
      ['Assigned', payload.stats.assigned, 'info', 'Shipments already allocated to a courier.'],
      ['In Transit', payload.stats.inTransit, 'info', 'Deliveries moving through the network now.'],
      ['Delivered', payload.stats.delivered, 'success', 'Successfully completed handoffs.'],
      ['Online Agents', availableAgents.length, availableAgents.length ? 'success' : 'danger', 'Agents currently available for new work.'],
    ],
    [availableAgents.length, payload.stats]
  );

  const maxPerformance = Math.max(...payload.analytics.performance.map((agent) => agent.currentAssignedDeliveries || 0), 1);
  const maxVolume = Math.max(...payload.analytics.dailyVolume.map((entry) => entry.count || 0), 1);

  return (
    <PortalShell
      title="Admin Control Center"
      subtitle="Run dispatch, watch live operations, manage pricing, and keep shipment flow healthy from a single command workspace."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="admin-summary-grid">
        {cards.map(([label, value, tone, copy]) => (
          <article className="glass-card metric-card admin-summary-card" key={label}>
            <small>{label}</small>
            <strong>{loading ? '...' : value}</strong>
            <p>{copy}</p>
            <span className={`admin-summary-icon tone-${tone}`}>{String(label).slice(0, 2).toUpperCase()}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
          <div className="admin-section-head">
            <div>
              <h2>Shipment workspace</h2>
              <p>Search, filter, inspect live shipment state, and open the assignment flow for any visible order.</p>
            </div>
            <div className="admin-chart-metric">
              <span>Visible shipments</span>
              <strong>{meta.total}</strong>
            </div>
          </div>

          <div className="admin-filter-bar">
            <input
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyFilters({ page: 1 });
              }}
              placeholder="Search tracking ID, sender, receiver, address, or package"
              value={searchDraft}
            />
            <button className="button-secondary" onClick={() => applyFilters({ page: 1 })} type="button">Search</button>
            <select onChange={(event) => applyFilters({ status: event.target.value, page: 1 })} value={filters.status}>
              <option value="All">All statuses</option>
              {shipmentStatuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <input onChange={(event) => applyFilters({ date: event.target.value, page: 1 })} type="date" value={filters.date} />
          </div>

          {loading ? (
            <div className="empty-state">Loading admin shipment workspace...</div>
          ) : payload.shipments.length === 0 ? (
            <div className="empty-state">No shipments match the current filters.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="package-table admin-orders-table compact">
                <thead>
                  <tr>
                    <th>Tracking</th>
                    <th>Sender</th>
                    <th>Receiver</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Agent</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.shipments.map((shipment) => (
                    <tr key={shipment._id}>
                      <td>
                        <div className="admin-table-primary">
                          <strong>{shipment.trackingId}</strong>
                          <small>{shipment.packageType}</small>
                        </div>
                      </td>
                      <td>{shipment.sender?.name || 'Unknown sender'}</td>
                      <td>{shipment.receiver?.name || 'Unknown receiver'}</td>
                      <td><StatusBadge status={shipment.status} /></td>
                      <td><StatusBadge status={shipment.paymentStatus} /></td>
                      <td>{shipment.assignedAgent?.name || 'Unassigned'}</td>
                      <td>{formatDateTime(shipment.updatedAt)}</td>
                      <td>
                        <div className="admin-table-actions compact">
                          <button
                            className="button-primary"
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setSelectedAgentId(shipment.assignedAgent?._id || '');
                            }}
                            type="button"
                          >
                            {shipment.assignedAgent?._id ? 'Reassign' : 'Assign'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button className="button-ghost" disabled={filters.page <= 1} onClick={() => applyFilters({ page: filters.page - 1 })} type="button">
              Previous
            </button>
            <span className="portal-chip">Page {meta.page} of {meta.totalPages}</span>
            <button className="button-ghost" disabled={filters.page >= meta.totalPages} onClick={() => applyFilters({ page: filters.page + 1 })} type="button">
              Next
            </button>
          </div>
        </article>

        <article className="glass-card section-card admin-side-card" style={{ gridColumn: 'span 4' }}>
          <div className="admin-section-head">
            <div>
              <h2>Dispatch priorities</h2>
              <p>Shipments that need admin attention first, including unassigned and unpaid work.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading dispatch priorities...</div>
          ) : atRiskShipments.length === 0 ? (
            <div className="empty-state">No urgent dispatch issues on the current page.</div>
          ) : (
            <div className="package-stack">
              {atRiskShipments.map((shipment) => (
                <article className="package-item" key={shipment._id}>
                  <div className="package-topline">
                    <div>
                      <strong>{shipment.trackingId}</strong>
                      <p style={{ margin: '8px 0 0' }}>{shipment.receiver?.name || 'Receiver'}</p>
                    </div>
                    <StatusBadge status={shipment.status} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 12 }}>
                    <span>Payment: {shipment.paymentStatus}</span>
                    <span>Agent: {shipment.assignedAgent?.name || 'Not assigned'}</span>
                    <span>Updated: {formatDateTime(shipment.updatedAt)}</span>
                  </div>
                  <button
                    className="button-secondary"
                    onClick={() => {
                      setSelectedShipment(shipment);
                      setSelectedAgentId(shipment.assignedAgent?._id || '');
                    }}
                    style={{ marginTop: 14 }}
                    type="button"
                  >
                    Open dispatch action
                  </button>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 5' }}>
          <div className="admin-section-head">
            <div>
              <h2>Role overview</h2>
              <p>A quick view of the people currently represented in the platform.</p>
            </div>
          </div>
          <div className="admin-mini-grid">
            {roleCards.map(([label, value, copy]) => (
              <div className="admin-mini-card" key={label}>
                <span>{label}</span>
                <strong>{loading ? '...' : value}</strong>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 7' }}>
          <div className="admin-section-head">
            <div>
              <h2>Live courier roster</h2>
              <p>Online state, delivery load, and assignment readiness across the available field team.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading courier roster...</div>
          ) : payload.agents.length === 0 ? (
            <div className="empty-state">No active agents are available in the roster yet.</div>
          ) : (
            <div className="admin-agent-grid">
              {payload.agents.map((agent) => (
                <div className="admin-agent-card large" key={agent._id}>
                  <div className="admin-user-item">
                    <span>{agent.name}</span>
                    <StatusBadge status={agent.isAvailable ? 'Available' : 'Unavailable'} />
                  </div>
                  <small>{agent.email}</small>
                  <p>Active deliveries: {agent.currentAssignedDeliveries}</p>
                  <p>Phone: {agent.phone || 'Not provided'}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 7' }}>
          <div className="admin-section-head">
            <div>
              <h2>7-day volume</h2>
              <p>Latest booking trend across the delivery network.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading shipment volume...</div>
          ) : (
            <div className="admin-chart-bars">
              {payload.analytics.dailyVolume.map((item) => {
                const percentage = Math.max(10, Math.round(((item.count || 0) / maxVolume) * 100));

                return (
                  <div className="admin-chart-column" key={item.date}>
                    <span className="admin-chart-count">{item.count}</span>
                    <div className="admin-chart-track">
                      <div className="admin-chart-fill" style={{ height: `${percentage}%` }} />
                    </div>
                    <strong>{item.label}</strong>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 5' }}>
          <div className="admin-section-head">
            <div>
              <h2>Agent performance</h2>
              <p>Live workload ranking to help rebalance assignments when the board gets uneven.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading performance board...</div>
          ) : payload.analytics.performance.length === 0 ? (
            <div className="empty-state">Performance data will appear once agent assignments exist.</div>
          ) : (
            <div className="admin-bar-list">
              {payload.analytics.performance.map((agent) => {
                const width = Math.max(12, Math.round(((agent.currentAssignedDeliveries || 0) / maxPerformance) * 100));

                return (
                  <div className="admin-bar-row" key={agent._id}>
                    <div className="admin-bar-copy">
                      <span>{agent.name}</span>
                      <strong>{agent.currentAssignedDeliveries} active</strong>
                    </div>
                    <div className="admin-bar-track">
                      <div className="admin-bar-fill" style={{ width: `${width}%` }} />
                    </div>
                    <small style={{ color: 'var(--ink-500)' }}>
                      {agent.isAvailable ? 'Online and assignable' : 'Offline right now'}
                    </small>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 5' }}>
          <PricingEditor
            pricing={pricing || {}}
            onChange={handlePricingChange}
            onSubmit={handlePricingSubmit}
            loading={savingPricing}
          />
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 7' }}>
          <div className="admin-section-head">
            <div>
              <h2>Active queue snapshot</h2>
              <p>A compact operational list of shipments currently moving or waiting on dispatch.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading active queue...</div>
          ) : dispatchQueue.length === 0 ? (
            <div className="empty-state">There are no open shipments in the current filtered set.</div>
          ) : (
            <div className="admin-history-list">
              {dispatchQueue.map((shipment) => (
                <div className="admin-history-item" key={shipment._id}>
                  <div className="admin-user-item">
                    <div>
                      <strong>{shipment.trackingId}</strong>
                      <p style={{ margin: '6px 0 0' }}>{shipment.sender?.name} to {shipment.receiver?.name}</p>
                    </div>
                    <StatusBadge status={shipment.status} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                    <span style={{ color: 'var(--ink-500)' }}>Agent: {shipment.assignedAgent?.name || 'Unassigned'}</span>
                    <span style={{ color: 'var(--ink-500)' }}>Payment: {shipment.paymentStatus}</span>
                    <span style={{ color: 'var(--ink-500)' }}>Updated: {formatDateTime(shipment.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {selectedShipment ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" aria-modal="true" role="dialog">
            <h3>{selectedShipment.assignedAgent?._id ? 'Reassign shipment' : 'Assign shipment'}</h3>
            <p>Choose an online courier to keep this shipment moving. Only available agents are shown.</p>

            <div className="admin-modal-grid">
              <div><strong>Tracking ID</strong><span>{selectedShipment.trackingId}</span></div>
              <div><strong>Status</strong><span>{selectedShipment.status}</span></div>
              <div><strong>Sender</strong><span>{selectedShipment.sender?.name || 'Unknown sender'}</span></div>
              <div><strong>Receiver</strong><span>{selectedShipment.receiver?.name || 'Unknown receiver'}</span></div>
              <div><strong>Pickup</strong><span>{selectedShipment.pickupAddress}</span></div>
              <div><strong>Delivery</strong><span>{selectedShipment.deliveryAddress}</span></div>
              <div><strong>Payment</strong><span>{selectedShipment.paymentStatus}</span></div>
              <div><strong>Current agent</strong><span>{selectedShipment.assignedAgent?.name || 'Unassigned'}</span></div>
            </div>

            <div className="admin-modal-field">
              <select onChange={(event) => setSelectedAgentId(event.target.value)} value={selectedAgentId}>
                <option value="">Select an online agent</option>
                {availableAgents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name} - {agent.currentAssignedDeliveries} active deliveries
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="button-ghost"
                onClick={() => {
                  setSelectedShipment(null);
                  setSelectedAgentId('');
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button-primary"
                disabled={!selectedAgentId || busyKey === `assign:${selectedShipment._id}`}
                onClick={assignShipment}
                type="button"
              >
                {busyKey === `assign:${selectedShipment._id}` ? 'Assigning...' : 'Confirm assignment'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
};

export default AdminDashboard;
