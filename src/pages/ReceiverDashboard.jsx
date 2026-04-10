import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import QRCodeCard from '../components/QRCodeCard';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';

const emptyDashboard = {
  stats: { total: 0, pending: 0, assigned: 0, inTransit: 0, delivered: 0, cancelled: 0, unpaid: 0 },
  incomingShipments: [],
  pendingVerification: [],
};

const ReceiverDashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const response = await api.get('/api/shipments/receiver/dashboard', { token: user.token });
        if (!active) return;
        setDashboard(response.data || emptyDashboard);
        setError('');
      } catch (err) {
        if (!active) return;
        setError(err.message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();
    const socket = getSocket();
    socket.on('shipments:refresh', loadDashboard);
    socket.on('notification:new', loadDashboard);

    return () => {
      active = false;
      socket.off('shipments:refresh', loadDashboard);
      socket.off('notification:new', loadDashboard);
    };
  }, [user.token]);

  const cards = useMemo(
    () => [
      ['Incoming', dashboard.stats.total, 'info'],
      ['Pending', dashboard.stats.pending, 'warning'],
      ['In Transit', dashboard.stats.inTransit, 'info'],
      ['Delivered', dashboard.stats.delivered, 'success'],
    ],
    [dashboard.stats]
  );

  return (
    <PortalShell
      title="Receiver Workspace"
      subtitle="Track incoming deliveries, review handoff timelines, and confirm delivery using OTP or QR when the agent reaches the destination."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="admin-summary-grid">
        {cards.map(([label, value, tone]) => (
          <article className="glass-card metric-card admin-summary-card" key={label}>
            <small>{label}</small>
            <strong>{loading ? '...' : value}</strong>
            <p>Realtime counts for deliveries linked to your account details.</p>
            <span className={`admin-summary-icon tone-${tone}`}>{String(label).slice(0, 2).toUpperCase()}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
          <div className="admin-section-head">
            <div>
              <h2>Incoming shipments</h2>
              <p>Your matched incoming parcels with live timeline access.</p>
            </div>
          </div>
          {loading ? (
            <div className="empty-state">Loading incoming shipments...</div>
          ) : dashboard.incomingShipments.length === 0 ? (
            <div className="empty-state">No incoming shipments are linked to this account yet.</div>
          ) : (
            <div className="package-stack">
              {dashboard.incomingShipments.map((shipment) => (
                <article className="package-item" key={shipment._id}>
                  <div className="package-topline">
                    <div>
                      <strong>{shipment.trackingId}</strong>
                      <p style={{ margin: '8px 0 0' }}>{shipment.sender?.name || 'Sender'}</p>
                    </div>
                    <StatusBadge status={shipment.status} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 14 }}>
                    <span>Package: {shipment.packageType}</span>
                    <span>Pickup: {shipment.pickupAddress}</span>
                    <span>Delivery: {shipment.deliveryAddress}</span>
                    <span>ETA: {formatDateTime(shipment.estimatedDeliveryAt)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                    <Link className="button-primary" to={`/shipments/${shipment._id}`}>View timeline</Link>
                    <Link className="button-secondary" to={`/track?tracking=${shipment.trackingId}`}>Public tracking</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
          <div className="admin-section-head">
            <div>
              <h2>Pending verification</h2>
              <p>Deliveries waiting for final OTP or QR confirmation.</p>
            </div>
            <Link className="button-secondary" to="/payments">Payments</Link>
          </div>
          {loading ? (
            <div className="empty-state">Loading verification queue...</div>
          ) : dashboard.pendingVerification.length === 0 ? (
            <div className="empty-state">No deliveries are waiting for receiver confirmation.</div>
          ) : (
            <div className="package-stack">
              {dashboard.pendingVerification.map((shipment) => (
                <article className="package-item" key={shipment._id}>
                  <div className="package-topline">
                    <strong>{shipment.trackingId}</strong>
                    <StatusBadge status={shipment.paymentStatus === 'Paid' ? 'Available' : shipment.paymentStatus} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 12 }}>
                    <span>Agent: {shipment.assignedAgent?.name || 'Awaiting agent'}</span>
                    <span>Payment: {shipment.paymentStatus}</span>
                  </div>
                  <QRCodeCard label="Receiver QR token" value={shipment.qrToken} />
                  <Link className="button-primary" style={{ marginTop: 12 }} to={`/shipments/${shipment._id}`}>Open verification</Link>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </PortalShell>
  );
};

export default ReceiverDashboard;
