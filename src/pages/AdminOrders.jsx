import { useCallback, useEffect, useMemo, useState } from 'react';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/formatters';
import { shipmentStatuses } from '../lib/shipment';

const emptyPayload = {
  shipments: [],
  stats: { total: 0, pending: 0, assigned: 0, inTransit: 0, delivered: 0, cancelled: 0 },
  analytics: { dailyVolume: [], performance: [] },
  agents: [],
  usersByRole: {},
};

const AdminOrders = () => {
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

  const loadOrders = useCallback(async (currentFilters = filters, showLoader = true) => {
    if (showLoader) setLoading(true);

    const params = new URLSearchParams({
      page: String(currentFilters.page),
      limit: '10',
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
  }, [filters, user.token]);

  useEffect(() => {
    loadOrders(filters);
  }, [filters, loadOrders]);

  const applyFilters = (nextFilters) => {
    setFilters((current) => ({ ...current, ...nextFilters, search: searchDraft }));
  };

  const availableAgents = useMemo(
    () => payload.agents.filter((agent) => agent.isAvailable),
    [payload.agents]
  );

  const assignShipment = async () => {
    if (!selectedShipment || !selectedAgentId) return;

    setBusyKey(`assign:${selectedShipment._id}`);
    try {
      await api.put(
        `/api/admin/shipments/${selectedShipment._id}/assign`,
        { agentId: selectedAgentId },
        { token: user.token }
      );
      showToast('Order assigned successfully.', 'success');
      setSelectedShipment(null);
      setSelectedAgentId('');
      await loadOrders(filters, false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const spotlightOrders = useMemo(
    () => payload.shipments.filter((shipment) => shipment.status === 'Pending' || !shipment.assignedAgent?._id).slice(0, 5),
    [payload.shipments]
  );

  return (
    <PortalShell
      title="Orders Management"
      subtitle="Manage the full order register, filter shipments fast, and assign or reassign live deliveries from one admin board."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="dashboard-grid admin-dashboard-main">
        <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
          <div className="admin-section-head">
            <div>
              <h2>Order register</h2>
              <p>Search by tracking ID, sender, receiver, address, or package type and take dispatch action instantly.</p>
            </div>
            <div className="admin-chart-metric">
              <span>Total matching orders</span>
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
              {shipmentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <input onChange={(event) => applyFilters({ date: event.target.value, page: 1 })} type="date" value={filters.date} />
          </div>

          {loading ? (
            <div className="empty-state">Loading orders...</div>
          ) : payload.shipments.length === 0 ? (
            <div className="empty-state">No orders match the current filters.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="package-table admin-orders-table">
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
                      <td>{shipment.sender?.name}</td>
                      <td>{shipment.receiver?.name}</td>
                      <td><StatusBadge status={shipment.status} /></td>
                      <td><StatusBadge status={shipment.paymentStatus} /></td>
                      <td>{shipment.assignedAgent?.name || 'Unassigned'}</td>
                      <td>{formatDateTime(shipment.updatedAt)}</td>
                      <td>
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
              <h2>Dispatch spotlight</h2>
              <p>Orders that most likely need admin attention right now.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading dispatch spotlight...</div>
          ) : spotlightOrders.length === 0 ? (
            <div className="empty-state">No urgent orders in the current filter set.</div>
          ) : (
            <div className="package-stack">
              {spotlightOrders.map((shipment) => (
                <article className="package-item" key={shipment._id}>
                  <div className="package-topline">
                    <strong>{shipment.trackingId}</strong>
                    <StatusBadge status={shipment.status} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 12 }}>
                    <span>Sender: {shipment.sender?.name}</span>
                    <span>Receiver: {shipment.receiver?.name}</span>
                    <span>Agent: {shipment.assignedAgent?.name || 'Not assigned'}</span>
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
                    Open dispatch modal
                  </button>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      {selectedShipment ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" aria-modal="true" role="dialog">
            <h3>Assign order</h3>
            <p>Select an online courier for this shipment.</p>

            <div className="admin-modal-grid">
              <div><strong>Tracking ID</strong><span>{selectedShipment.trackingId}</span></div>
              <div><strong>Status</strong><span>{selectedShipment.status}</span></div>
              <div><strong>Sender</strong><span>{selectedShipment.sender?.name}</span></div>
              <div><strong>Receiver</strong><span>{selectedShipment.receiver?.name}</span></div>
            </div>

            <div className="admin-modal-field">
              <select onChange={(event) => setSelectedAgentId(event.target.value)} value={selectedAgentId}>
                <option value="">Select an online agent</option>
                {availableAgents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name} - {agent.currentAssignedDeliveries} active
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
                {busyKey === `assign:${selectedShipment._id}` ? 'Assigning...' : 'Assign order'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
};

export default AdminOrders;
