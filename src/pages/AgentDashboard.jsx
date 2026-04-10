import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import QRCodeCard from '../components/QRCodeCard';
import StatusBadge from '../components/StatusBadge';
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

const AgentDashboard = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      const response = await api.get('/api/agent/dashboard', { token: user.token });
      setDashboard(response.data || emptyDashboard);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const socket = getSocket();
    socket.on('shipments:refresh', loadDashboard);
    socket.on('agents:availability', ({ agentId, isAvailable }) => {
      if (String(agentId) === String(user.id || user._id)) {
        updateUser({ isAvailable });
      }
    });

    return () => {
      socket.off('shipments:refresh', loadDashboard);
      socket.off('agents:availability');
    };
  }, [user.token]);

  const filteredShipments = useMemo(
    () => dashboard.shipments.filter((shipment) => statusFilter === 'All' || shipment.status === statusFilter),
    [dashboard.shipments, statusFilter]
  );

  const toggleAvailability = async () => {
    setBusyKey('availability');
    try {
      const nextAvailability = !dashboard.isAvailable;
      const response = await api.patch('/api/agent/availability', { isAvailable: nextAvailability }, { token: user.token });
      setDashboard((current) => ({ ...current, isAvailable: response.data.isAvailable }));
      updateUser({ isAvailable: response.data.isAvailable });
      showToast(nextAvailability ? 'You are now online and assignable.' : 'You are now offline.', 'success');
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

  const cards = [
    ['Assigned', dashboard.stats.assigned || 0, 'info'],
    ['In Transit', dashboard.stats.inTransit || 0, 'info'],
    ['Delivered', dashboard.stats.delivered || 0, 'success'],
    ['Availability', dashboard.isAvailable ? 'Online' : 'Offline', dashboard.isAvailable ? 'success' : 'danger'],
  ];

  return (
    <PortalShell
      title="Delivery Agent Dashboard"
      subtitle="Go online for assignments, update shipment progress live, and use OTP or QR verification before marking a delivery as complete."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="admin-summary-grid">
        {cards.map(([label, value, tone]) => (
          <article className="glass-card metric-card admin-summary-card" key={label}>
            <small>{label}</small>
            <strong>{loading ? '...' : value}</strong>
            <p>{label === 'Availability' ? 'Only online agents can receive new assignments.' : 'Realtime view of your field workload.'}</p>
            <span className={`admin-summary-icon tone-${tone}`}>{String(label).slice(0, 2).toUpperCase()}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 3' }}>
          <div className="workspace-action-list">
            <button className={dashboard.isAvailable ? 'button-danger' : 'button-primary'} disabled={busyKey === 'availability'} onClick={toggleAvailability} type="button">
              {busyKey === 'availability' ? 'Updating...' : dashboard.isAvailable ? 'Go Offline' : 'Go Online'}
            </button>
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="All">All statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="Picked Up">Picked Up</option>
              <option value="In Transit">In Transit</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
            </select>
            <Link className="button-secondary" to="/payments">Payment board</Link>
          </div>
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 9' }}>
          <div className="admin-section-head">
            <div>
              <h2>Assigned deliveries</h2>
              <p>Update pickup, transit, and last-mile status in real time.</p>
            </div>
          </div>
          {loading ? (
            <div className="empty-state">Loading assigned deliveries...</div>
          ) : filteredShipments.length === 0 ? (
            <div className="empty-state">No deliveries match the current filter.</div>
          ) : (
            <div className="package-stack">
              {filteredShipments.map((shipment) => (
                <article className="package-item" key={shipment._id}>
                  <div className="package-topline">
                    <div>
                      <strong>{shipment.trackingId}</strong>
                      <p style={{ margin: '8px 0 0' }}>{shipment.receiver?.name}</p>
                    </div>
                    <StatusBadge status={shipment.status} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 14 }}>
                    <span>Pickup: {shipment.pickupAddress}</span>
                    <span>Delivery: {shipment.deliveryAddress}</span>
                    <span>Charge: {formatCurrency(shipment.paymentAmount)}</span>
                    <span>Payment: {shipment.paymentStatus}</span>
                    <span>ETA: {formatDateTime(shipment.estimatedDeliveryAt)}</span>
                  </div>
                  {shipment.status === 'Out for Delivery' ? <QRCodeCard label="Delivery QR" value={shipment.qrToken} /> : null}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                    {agentProgressionStatuses.map((status) => (
                      <button
                        className="button-secondary"
                        disabled={busyKey === `${shipment._id}:${status}` || shipment.status === status || shipment.status === 'Cancelled' || shipment.status === 'Delivered'}
                        key={status}
                        onClick={() => updateStatus(shipment._id, status)}
                        type="button"
                      >
                        {busyKey === `${shipment._id}:${status}` ? 'Updating...' : status}
                      </button>
                    ))}
                    <Link className="button-primary" to={`/shipments/${shipment._id}`}>Open verification</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </PortalShell>
  );
};

export default AgentDashboard;
