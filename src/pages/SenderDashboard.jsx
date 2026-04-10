import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';

const emptyDashboard = {
  stats: { total: 0, pending: 0, assigned: 0, inTransit: 0, delivered: 0, cancelled: 0, unpaid: 0 },
  recentShipments: [],
  deliveryHistory: [],
  outstandingPayments: [],
  paymentHistory: [],
};

const SenderDashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const response = await api.get('/api/shipments/sender/dashboard', { token: user.token });
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
      ['Total Shipments', dashboard.stats.total, 'info'],
      ['Pending', dashboard.stats.pending, 'warning'],
      ['Assigned', dashboard.stats.assigned, 'info'],
      ['In Transit', dashboard.stats.inTransit, 'info'],
      ['Delivered', dashboard.stats.delivered, 'success'],
      ['Cancelled', dashboard.stats.cancelled, 'danger'],
    ],
    [dashboard.stats]
  );

  return (
    <PortalShell
      title="Sender Workspace"
      subtitle="Create shipments, watch live progress, stay ahead of payment status, and keep every outgoing delivery organized in one premium sender workspace."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="admin-summary-grid">
        {cards.map(([label, value, tone]) => (
          <article className="glass-card metric-card admin-summary-card" key={label}>
            <small>{label}</small>
            <strong>{loading ? '...' : value}</strong>
            <p>{label === 'Pending' ? 'Waiting for assignment or cancellation.' : 'Live value across your sender account.'}</p>
            <span className={`admin-summary-icon tone-${tone}`}>{String(label).slice(0, 2).toUpperCase()}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 7' }}>
          <div className="admin-section-head">
            <div>
              <h2>Recent shipments</h2>
              <p>Latest bookings and live tracking access from your sender workspace.</p>
            </div>
            <Link className="button-primary" to="/sender/create">New shipment</Link>
          </div>
          {loading ? (
            <div className="empty-state">Loading recent shipments...</div>
          ) : dashboard.recentShipments.length === 0 ? (
            <div className="empty-state">No shipments yet. Create your first shipment to start tracking.</div>
          ) : (
            <div className="package-stack">
              {dashboard.recentShipments.map((shipment) => (
                <article className="package-item" key={shipment._id}>
                  <div className="package-topline">
                    <div>
                      <strong>{shipment.trackingId}</strong>
                      <p style={{ margin: '8px 0 0' }}>{shipment.receiver?.name}</p>
                    </div>
                    <StatusBadge status={shipment.status} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 14 }}>
                    <span>Package: {shipment.packageType}</span>
                    <span>Delivery: {shipment.deliveryAddress}</span>
                    <span>Payment: {shipment.paymentStatus}</span>
                    <span>ETA: {formatDateTime(shipment.estimatedDeliveryAt)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                    <Link className="button-primary" to={`/shipments/${shipment._id}`}>Open timeline</Link>
                    <Link className="button-secondary" to={`/track?tracking=${shipment.trackingId}`}>Public tracking</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 5' }}>
          <div className="admin-section-head">
            <div>
              <h2>Outstanding payments</h2>
              <p>Pay before the final verified delivery handoff.</p>
            </div>
            <Link className="button-secondary" to="/payments">Open payments</Link>
          </div>
          {loading ? (
            <div className="empty-state">Loading unpaid shipments...</div>
          ) : dashboard.outstandingPayments.length === 0 ? (
            <div className="empty-state">No outstanding shipment payments.</div>
          ) : (
            <div className="package-stack">
              {dashboard.outstandingPayments.slice(0, 4).map((shipment) => (
                <article className="package-item" key={shipment._id}>
                  <div className="package-topline">
                    <strong>{shipment.trackingId}</strong>
                    <StatusBadge status={shipment.paymentStatus} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 12 }}>
                    <span>Receiver: {shipment.receiver?.name}</span>
                    <span>Amount: {formatCurrency(shipment.paymentAmount)}</span>
                    <span>Status: {shipment.status}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 6' }}>
          <div className="admin-section-head">
            <div>
              <h2>Delivery history</h2>
              <p>Recently completed deliveries for quick review.</p>
            </div>
          </div>
          {loading ? (
            <div className="empty-state">Loading delivery history...</div>
          ) : dashboard.deliveryHistory.length === 0 ? (
            <div className="empty-state">Delivered shipments will appear here.</div>
          ) : (
            <div className="package-stack">
              {dashboard.deliveryHistory.slice(0, 4).map((shipment) => (
                <article className="package-item" key={shipment._id}>
                  <div className="package-topline">
                    <strong>{shipment.trackingId}</strong>
                    <StatusBadge status={shipment.status} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 12 }}>
                    <span>Delivered: {formatDateTime(shipment.deliveredAt)}</span>
                    <span>Verification: {shipment.verificationMethod || 'Verified'}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 6' }}>
          <div className="admin-section-head">
            <div>
              <h2>Payment history</h2>
              <p>Recent transactions linked to your account.</p>
            </div>
          </div>
          {loading ? (
            <div className="empty-state">Loading payment activity...</div>
          ) : dashboard.paymentHistory.length === 0 ? (
            <div className="empty-state">No payment activity yet.</div>
          ) : (
            <div className="admin-history-list compact">
              {dashboard.paymentHistory.map((payment) => (
                <div className="admin-history-item" key={payment._id}>
                  <div className="admin-user-item">
                    <span>{payment.trackingId}</span>
                    <StatusBadge status={payment.status} />
                  </div>
                  <strong>{formatCurrency(payment.amount)}</strong>
                  <p>{payment.method}</p>
                  <small>{formatDateTime(payment.createdAt)}</small>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </PortalShell>
  );
};

export default SenderDashboard;
