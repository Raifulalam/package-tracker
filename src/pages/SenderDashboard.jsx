import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';

const emptyDashboard = {
  stats: { total: 0, pending: 0, active: 0, delivered: 0, cancelled: 0 },
  recentPackages: [],
  upcomingDeliveries: [],
};

const SenderDashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const response = await api.get('/api/package/sender-dashboard', { token: user.token });
        if (active) {
          setDashboard(response.data);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.message);
      }
    };

    loadDashboard();

    const socket = getSocket();
    const refresh = () => loadDashboard();
    socket.on('dashboard:refresh', refresh);

    return () => {
      active = false;
      socket.off('dashboard:refresh', refresh);
    };
  }, [user.token]);

  const statCards = [
    { label: 'Total shipments', value: dashboard.stats.total, note: 'All shipments created in your workspace' },
    { label: 'Pending review', value: dashboard.stats.pending, note: 'Waiting for approval, scheduling, or dispatch' },
    { label: 'Active in network', value: dashboard.stats.active, note: 'Currently assigned, moving, or on final mile' },
    { label: 'Delivered', value: dashboard.stats.delivered, note: 'Completed shipments with proof-of-completion state' },
  ];

  return (
    <PortalShell
      title="Sender Workspace"
      subtitle="Create shipments, monitor SLAs, and stay on top of every delivery milestone from one sender view."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="dashboard-grid">
        {statCards.map((card) => (
          <article className="glass-card metric-card" key={card.label} style={{ gridColumn: 'span 3' }}>
            <small>{card.label}</small>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 7' }}>
          <div className="package-topline" style={{ marginBottom: 18 }}>
            <div>
              <h2>Recent shipments</h2>
              <p>Live visibility into your latest outbound deliveries.</p>
            </div>
            <Link className="button-primary" to="/sender/create">
              New shipment
            </Link>
          </div>

          {dashboard.recentPackages.length === 0 ? (
            <div className="empty-state">No shipments yet. Create your first delivery request to get started.</div>
          ) : (
            <table className="package-table">
              <thead>
                <tr>
                  <th>Tracking</th>
                  <th>Receiver</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>SLA</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentPackages.map((pkg) => (
                  <tr key={pkg._id}>
                    <td>
                      <strong>{pkg.trackingNumber}</strong>
                    </td>
                    <td>
                      <div>{pkg.receiverName}</div>
                      <small>{pkg.receiverPhone}</small>
                    </td>
                    <td>
                      <div>{pkg.pickupAddress}</div>
                      <small>{pkg.deliveryAddress}</small>
                    </td>
                    <td>
                      <StatusBadge status={pkg.status} />
                    </td>
                    <td>{formatDateTime(pkg.estimatedDeliveryAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        <aside className="glass-card section-card" style={{ gridColumn: 'span 5' }}>
          <h2>Priority queue</h2>
          <p>Shipments still moving through the network.</p>

          {dashboard.upcomingDeliveries.length === 0 ? (
            <div className="empty-state">No active shipments right now.</div>
          ) : (
            <div className="package-stack">
              {dashboard.upcomingDeliveries.map((pkg) => (
                <div className="package-item" key={pkg._id}>
                  <div className="package-topline">
                    <div>
                      <strong>{pkg.trackingNumber}</strong>
                      <p style={{ margin: '6px 0 0' }}>{pkg.receiverName}</p>
                    </div>
                    <StatusBadge status={pkg.status} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 12 }}>
                  <span>Destination: {pkg.deliveryAddress}</span>
                  <span>ETA: {formatDateTime(pkg.estimatedDeliveryAt)}</span>
                  <span>Charge: {formatCurrency(pkg.shippingCharge)}</span>
                </div>
                  <Link className="button-secondary" style={{ marginTop: 14, display: 'inline-flex' }} to={`/sender/track/${pkg._id}`}>
                    Open shipment view
                  </Link>
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>
    </PortalShell>
  );
};

export default SenderDashboard;
