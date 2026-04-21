import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';
import { agentProgressionStatuses } from '../lib/shipment';

const emptyDashboard = {
  isAvailable: false,
  stats: { total: 0, assigned: 0, inTransit: 0, delivered: 0 },
  shipments: [],
};

function getLatestTimelineEntry(shipment) {
  return shipment?.timeline?.[shipment.timeline.length - 1] || null;
}

const AgentDashboard = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [verifyModal, setVerifyModal] = useState({ open: false, shipment: null, otp: '' });

  const loadDashboard = useCallback(async () => {
    try {
      const response = await api.get('/api/agent/dashboard', { token: user.token });
      setDashboard(response.data || emptyDashboard);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    loadDashboard();

    const socket = getSocket();
    const refresh = () => loadDashboard();
    const handleAvailability = ({ agentId, isAvailable }) => {
      if (String(agentId) === String(user.id || user._id)) {
        updateUser({ isAvailable });
      }
    };

    socket.on('shipments:refresh', refresh);
    socket.on('agents:availability', handleAvailability);

    return () => {
      socket.off('shipments:refresh', refresh);
      socket.off('agents:availability', handleAvailability);
    };
  }, [loadDashboard, updateUser, user.id, user._id]);

  const filteredShipments = useMemo(
    () => dashboard.shipments.filter((shipment) => statusFilter === 'All' || shipment.status === statusFilter),
    [dashboard.shipments, statusFilter]
  );

  const activeShipments = useMemo(
    () => dashboard.shipments.filter((shipment) => !['Delivered', 'Cancelled'].includes(shipment.status)),
    [dashboard.shipments]
  );

  const handoffQueue = useMemo(
    () => dashboard.shipments.filter((shipment) => shipment.status === 'Out for Delivery'),
    [dashboard.shipments]
  );

  const completedShipments = useMemo(
    () => dashboard.shipments.filter((shipment) => shipment.status === 'Delivered').slice(0, 6),
    [dashboard.shipments]
  );

  const unpaidShipments = useMemo(
    () => dashboard.shipments.filter((shipment) => shipment.paymentStatus !== 'Paid' && !['Delivered', 'Cancelled'].includes(shipment.status)),
    [dashboard.shipments]
  );

  const toggleAvailability = async () => {
    setBusyKey('availability');
    try {
      const nextAvailability = !dashboard.isAvailable;
      const response = await api.patch('/api/agent/availability', { isAvailable: nextAvailability }, { token: user.token });
      setDashboard((current) => ({ ...current, isAvailable: response.data.isAvailable }));
      updateUser({ isAvailable: response.data.isAvailable });
      showToast(nextAvailability ? 'You are now online and ready for assignments.' : 'You are now offline.', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const updateStatus = async (shipmentId, status) => {
    setBusyKey(`${shipmentId}:${status}`);
    try {
      await api.put(`/api/shipments/${shipmentId}/status`, { status }, { token: user.token });
      showToast(`Shipment moved to ${status}.`, 'success');
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const submitOtpVerification = async (event) => {
    event.preventDefault();
    if (!verifyModal.shipment) return;

    setBusyKey(`verify:${verifyModal.shipment._id}`);
    try {
      await api.post(
        `/api/shipments/${verifyModal.shipment._id}/verify-delivery`,
        { otp: verifyModal.otp },
        { token: user.token }
      );
      showToast('Delivery verified successfully.', 'success');
      setVerifyModal({ open: false, shipment: null, otp: '' });
      await loadDashboard();
    } catch (err) {
      showToast(err.message || 'Invalid OTP.', 'error');
    } finally {
      setBusyKey('');
    }
  };

  const requestOtpDispatch = async (shipment) => {
    setBusyKey(`send-otp:${shipment._id}`);
    try {
      await api.post(`/api/shipments/${shipment._id}/send-otp`, {}, { token: user.token });
      showToast("OTP has been dispatched to the receiver's email.", 'success');
      setVerifyModal({ open: true, shipment, otp: '' });
    } catch (err) {
      showToast(err.message || 'Failed to dispatch OTP to receiver.', 'error');
    } finally {
      setBusyKey('');
    }
  };

  const cards = useMemo(
    () => [
      ['Active', activeShipments.length, 'info', 'Deliveries you still need to move or complete.'],
      ['Out for Delivery', handoffQueue.length, 'warning', 'Last-mile handoffs waiting on final confirmation.'],
      ['Delivered', dashboard.stats.delivered || 0, 'success', 'Completed deliveries already verified.'],
      ['Payment Pending', unpaidShipments.length, 'danger', 'Shipments that may be blocked before final handoff.'],
      ['Availability', dashboard.isAvailable ? 'Online' : 'Offline', dashboard.isAvailable ? 'success' : 'danger', 'Your live dispatch status for new assignments.'],
    ],
    [activeShipments.length, dashboard.isAvailable, dashboard.stats.delivered, handoffQueue.length, unpaidShipments.length]
  );

  return (
    <PortalShell
      title="Delivery Agent Dashboard"
      subtitle="Manage your live route, confirm handoffs with OTP, and keep every assigned shipment moving without losing context."
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
        <article className="glass-card section-card" style={{ gridColumn: 'span 3' }}>
          <div className="admin-section-head">
            <div>
              <h2>Control panel</h2>
              <p>Switch availability, filter your queue, and jump into payment visibility when needed.</p>
            </div>
          </div>

          <div className="workspace-action-list">
            <button
              className={dashboard.isAvailable ? 'button-danger' : 'button-primary'}
              disabled={busyKey === 'availability'}
              onClick={toggleAvailability}
              type="button"
            >
              {busyKey === 'availability' ? 'Updating...' : dashboard.isAvailable ? 'Go Offline' : 'Go Online'}
            </button>

            <div className="field-group">
              <span>Status filter</span>
              <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                <option value="All">All statuses</option>
                <option value="Assigned">Assigned</option>
                <option value="Picked Up">Picked Up</option>
                <option value="In Transit">In Transit</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>

            <Link className="button-secondary" to="/payments">Open payment board</Link>

            <div className="admin-health-grid">
              <div className="admin-health-card">
                <div className="admin-health-copy">
                  <span>Assigned</span>
                  <strong>{dashboard.stats.assigned || 0}</strong>
                </div>
                <small>Fresh dispatches waiting for pickup progress.</small>
              </div>
              <div className="admin-health-card">
                <div className="admin-health-copy">
                  <span>In transit</span>
                  <strong>{dashboard.stats.inTransit || 0}</strong>
                </div>
                <small>Shipments currently moving between pickup and delivery.</small>
              </div>
            </div>
          </div>
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 6' }}>
          <div className="admin-section-head">
            <div>
              <h2>Active route queue</h2>
              <p>Your main working list for pickup, transit, and last-mile updates.</p>
            </div>
            <div className="admin-chart-metric">
              <span>Visible route items</span>
              <strong>{filteredShipments.length}</strong>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading assigned deliveries...</div>
          ) : filteredShipments.length === 0 ? (
            <div className="empty-state">No deliveries match the current filter.</div>
          ) : (
            <div className="package-stack">
              {filteredShipments.map((shipment) => {
                const latestEvent = getLatestTimelineEntry(shipment);

                return (
                  <article className="package-item" key={shipment._id}>
                    <div className="package-topline">
                      <div>
                        <strong>{shipment.trackingId}</strong>
                        <p style={{ margin: '8px 0 0' }}>Receiver: {shipment.receiver?.name || 'Receiver'}</p>
                      </div>
                      <StatusBadge status={shipment.status} />
                    </div>

                    <div className="package-meta" style={{ marginTop: 12 }}>
                      <span>Pickup: {shipment.pickupAddress}</span>
                      <span>Delivery: {shipment.deliveryAddress}</span>
                      <span>Charge: {formatCurrency(shipment.paymentAmount)}</span>
                      <span>Payment: {shipment.paymentStatus}</span>
                      <span>Last update: {latestEvent ? formatDateTime(latestEvent.timestamp) : formatDateTime(shipment.updatedAt)}</span>
                    </div>

                    {latestEvent ? (
                      <div className="info-banner" style={{ marginTop: 14 }}>
                        {latestEvent.note || latestEvent.label || 'Latest shipment event recorded.'}
                      </div>
                    ) : null}

                    <div className="admin-table-actions" style={{ marginTop: 14 }}>
                      {agentProgressionStatuses.map((status) => {
                        if (shipment.status === 'Delivered' || shipment.status === 'Cancelled') return null;

                        const isDisabled =
                          busyKey === `${shipment._id}:${status}` ||
                          shipment.status === status ||
                          shipment.status === 'Delivered' ||
                          shipment.status === 'Cancelled';

                        return (
                          <button
                            className="button-secondary"
                            disabled={isDisabled}
                            key={status}
                            onClick={() => updateStatus(shipment._id, status)}
                            type="button"
                          >
                            {busyKey === `${shipment._id}:${status}` ? 'Updating...' : `Mark ${status}`}
                          </button>
                        );
                      })}

                      {shipment.status === 'Out for Delivery' ? (
                        <button
                          className="button-primary"
                          disabled={busyKey === `send-otp:${shipment._id}`}
                          onClick={() => requestOtpDispatch(shipment)}
                          type="button"
                        >
                          {busyKey === `send-otp:${shipment._id}` ? 'Sending...' : 'Verify delivery'}
                        </button>
                      ) : null}

                      <Link className="button-ghost" to={`/shipments/${shipment._id}`}>Open timeline</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 3' }}>
          <div className="admin-section-head">
            <div>
              <h2>Handoff queue</h2>
              <p>Shipments currently waiting for final OTP confirmation.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading handoff queue...</div>
          ) : handoffQueue.length === 0 ? (
            <div className="empty-state">Nothing is out for delivery right now.</div>
          ) : (
            <div className="package-stack">
              {handoffQueue.map((shipment) => (
                <article className="package-item" key={shipment._id}>
                  <div className="package-topline">
                    <strong>{shipment.trackingId}</strong>
                    <StatusBadge status={shipment.paymentStatus} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 12 }}>
                    <span>Receiver: {shipment.receiver?.name || 'Receiver'}</span>
                    <span>Phone: {shipment.receiver?.phone || 'Not provided'}</span>
                    <span>Payment: {shipment.paymentStatus}</span>
                  </div>
                  <button
                    className="button-primary"
                    disabled={busyKey === `send-otp:${shipment._id}`}
                    onClick={() => requestOtpDispatch(shipment)}
                    style={{ marginTop: 14 }}
                    type="button"
                  >
                    {busyKey === `send-otp:${shipment._id}` ? 'Sending...' : 'Open OTP handoff'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 7' }}>
          <div className="admin-section-head">
            <div>
              <h2>Completed deliveries</h2>
              <p>Your recent successful handoffs, useful for quick review and proof of progress.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading completed deliveries...</div>
          ) : completedShipments.length === 0 ? (
            <div className="empty-state">Delivered shipments will appear here after successful OTP confirmation.</div>
          ) : (
            <div className="admin-history-list">
              {completedShipments.map((shipment) => (
                <div className="admin-history-item" key={shipment._id}>
                  <div className="admin-user-item">
                    <div>
                      <strong>{shipment.trackingId}</strong>
                      <p style={{ margin: '6px 0 0' }}>{shipment.receiver?.name || 'Receiver'}</p>
                    </div>
                    <StatusBadge status={shipment.status} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                    <span style={{ color: 'var(--ink-500)' }}>Delivered: {formatDateTime(shipment.deliveredAt || shipment.updatedAt)}</span>
                    <span style={{ color: 'var(--ink-500)' }}>Amount: {formatCurrency(shipment.paymentAmount)}</span>
                    <span style={{ color: 'var(--ink-500)' }}>Payment: {shipment.paymentStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 5' }}>
          <div className="admin-section-head">
            <div>
              <h2>Field reminders</h2>
              <p>Operational guidance to help you avoid stalled deliveries and failed handoffs.</p>
            </div>
          </div>

          <div className="workspace-action-list">
            <div className="info-banner">
              Go online only when you are ready to receive new assignments from dispatch.
            </div>
            <div className="info-banner">
              Move the shipment through each status in order so the sender and receiver get correct realtime updates.
            </div>
            <div className="info-banner">
              Confirm payment status before final handoff. Unpaid shipments can block OTP delivery completion.
            </div>
            <div className="info-banner">
              Ask the receiver for the OTP only after you reach the destination and are ready to hand over the parcel.
            </div>
          </div>
        </article>
      </section>

      <Modal
        isOpen={verifyModal.open && !!verifyModal.shipment}
        onClose={() => setVerifyModal({ open: false, shipment: null, otp: '' })}
        title="Verify delivery"
      >
        <p>
          Ask the receiver for the OTP to confirm delivery of <strong>{verifyModal.shipment?.trackingId}</strong>.
        </p>

        {verifyModal.shipment && (
          <div className="admin-modal-grid">
            <div><strong>Receiver</strong><span>{verifyModal.shipment.receiver?.name || 'Receiver'}</span></div>
            <div><strong>Payment</strong><span>{verifyModal.shipment.paymentStatus}</span></div>
            <div><strong>Address</strong><span>{verifyModal.shipment.deliveryAddress}</span></div>
            <div><strong>Status</strong><span>{verifyModal.shipment.status}</span></div>
          </div>
        )}

        <form onSubmit={submitOtpVerification} style={{ display: 'grid', gap: 14, marginTop: 16 }}>
          <input
            autoFocus
            onChange={(event) => setVerifyModal((current) => ({ ...current, otp: event.target.value }))}
            placeholder="Enter delivery OTP"
            required
            style={{
              padding: '12px',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              fontSize: '1.1rem',
              textAlign: 'center',
              letterSpacing: '2px',
            }}
            type="text"
            value={verifyModal.otp}
          />

          <div className="modal-actions" style={{ marginTop: 0 }}>
            <button
              className="button-ghost"
              onClick={() => setVerifyModal({ open: false, shipment: null, otp: '' })}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button-primary"
              disabled={busyKey.startsWith('verify') || !verifyModal.otp}
              type="submit"
            >
              {busyKey.startsWith('verify') ? 'Verifying...' : 'Confirm delivery'}
            </button>
          </div>
        </form>
      </Modal>
    </PortalShell>
  );
};

export default AgentDashboard;
