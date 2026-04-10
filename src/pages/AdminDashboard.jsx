import { useEffect, useMemo, useState } from 'react';
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

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [payload, setPayload] = useState(emptyPayload);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', status: 'All', date: '', page: 1 });
  const [searchDraft, setSearchDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const loadDashboard = async (currentFilters = filters, showLoader = true) => {
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
      const response = await api.get(`/api/admin/packages?${params.toString()}`, { token: user.token });
      setPayload(response.data || emptyPayload);
      setMeta(response.meta || { page: 1, totalPages: 1, total: 0 });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
  }, [user.token, filters]);

  const availableAgents = useMemo(
    () => payload.agents.filter((agent) => agent.isAvailable),
    [payload.agents]
  );

  const cards = [
    ['Total Shipments', payload.stats.total, 'info'],
    ['Pending', payload.stats.pending, 'warning'],
    ['Assigned', payload.stats.assigned, 'info'],
    ['In Transit', payload.stats.inTransit, 'info'],
    ['Delivered', payload.stats.delivered, 'success'],
    ['Cancelled', payload.stats.cancelled, 'danger'],
  ];

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

  return (
    <PortalShell
      compactTitle
      title="Admin Control Center"
      subtitle="Monitor live network health, assign only online agents, review shipment analytics, and keep NexExpree delivery operations moving from a single command workspace."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="admin-summary-grid">
        {cards.map(([label, value, tone]) => (
          <article className="glass-card metric-card admin-summary-card" key={label}>
            <small>{label}</small>
            <strong>{loading ? '...' : value}</strong>
            <p>Realtime network totals across the admin view.</p>
            <span className={`admin-summary-icon tone-${tone}`}>{String(label).slice(0, 2).toUpperCase()}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
          <div className="admin-section-head">
            <div>
              <h2>Shipment workspace</h2>
              <p>Search, filter by date and status, and assign only available agents.</p>
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
              {shipmentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
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
                    <th>Tracking ID</th>
                    <th>Sender</th>
                    <th>Receiver</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.shipments.map((shipment) => (
                    <tr key={shipment._id}>
                      <td><strong>{shipment.trackingId}</strong></td>
                      <td>{shipment.sender?.name}</td>
                      <td>{shipment.receiver?.name}</td>
                      <td><StatusBadge status={shipment.status} /></td>
                      <td><StatusBadge status={shipment.paymentStatus} /></td>
                      <td>{formatDateTime(shipment.updatedAt)}</td>
                      <td>
                        <button className="button-primary" onClick={() => {
                          setSelectedShipment(shipment);
                          setSelectedAgentId(shipment.assignedAgent?._id || '');
                        }} type="button">
                          Assign agent
                        </button>
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

        <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
          <div className="admin-section-head">
            <div>
              <h2>Agent availability</h2>
              <p>Only online agents appear in the assignment modal.</p>
            </div>
          </div>
          <div className="admin-agent-grid" style={{ gridTemplateColumns: '1fr' }}>
            {payload.agents.map((agent) => (
              <div className="admin-agent-card large" key={agent._id}>
                <div className="admin-user-item">
                  <span>{agent.name}</span>
                  <StatusBadge status={agent.isAvailable ? 'Available' : 'Unavailable'} />
                </div>
                <small>{agent.email}</small>
                <p>Current assigned deliveries: {agent.currentAssignedDeliveries}</p>
              </div>
            ))}
          </div>
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
          <div className="admin-chart-bars">
            {payload.analytics.dailyVolume.map((item) => {
              const max = Math.max(...payload.analytics.dailyVolume.map((entry) => entry.count), 1);
              const percentage = Math.max(10, Math.round((item.count / max) * 100));

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
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 5' }}>
          <div className="admin-section-head">
            <div>
              <h2>Agent performance</h2>
              <p>Current online state and live assignment load.</p>
            </div>
          </div>
          <div className="admin-history-list compact">
            {payload.analytics.performance.map((agent) => (
              <div className="admin-history-item" key={agent._id}>
                <div className="admin-user-item">
                  <span>{agent.name}</span>
                  <StatusBadge status={agent.isAvailable ? 'Available' : 'Unavailable'} />
                </div>
                <strong>{agent.currentAssignedDeliveries} active</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      {selectedShipment ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card compact" aria-modal="true" role="dialog">
            <h3>Assign available agent</h3>
            <p>Only agents who are online appear below, which prevents dispatching work to offline couriers.</p>
            <div className="admin-modal-grid">
              <div><strong>Tracking ID</strong><span>{selectedShipment.trackingId}</span></div>
              <div><strong>Current status</strong><span>{selectedShipment.status}</span></div>
            </div>
            <div className="admin-modal-field">
              <select onChange={(event) => setSelectedAgentId(event.target.value)} value={selectedAgentId}>
                <option value="">Select an online agent</option>
                {availableAgents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name} · {agent.currentAssignedDeliveries} active
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="button-ghost" onClick={() => {
                setSelectedShipment(null);
                setSelectedAgentId('');
              }} type="button">
                Cancel
              </button>
              <button className="button-primary" disabled={!selectedAgentId || busyKey === `assign:${selectedShipment._id}`} onClick={assignShipment} type="button">
                {busyKey === `assign:${selectedShipment._id}` ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
};

export default AdminDashboard;
