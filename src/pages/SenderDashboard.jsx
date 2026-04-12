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

  const statsCards = useMemo(
    () => [
      ['Total Shipments', dashboard.stats.total, 'info'],
      ['In Transit', dashboard.stats.inTransit, 'warning'],
      ['Delivered', dashboard.stats.delivered, 'success'],
    ],
    [dashboard.stats]
  );

  return (
    <PortalShell
      title="Sender Dashboard"
      subtitle="Overview of your shipments, tracking progress, and quick actions."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      {/* Top Metrics Cards */}
      <section className="dashboard-grid" style={{ marginBottom: '24px' }}>
        {statsCards.map(([label, value, tone]) => (
          <article className="card" key={label} style={{ gridColumn: 'span 4', borderTop: `4px solid var(--${tone})` }}>
            <small style={{ fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</small>
            <strong style={{ display: 'block', fontSize: '2.4rem', marginTop: '8px' }}>{loading ? '...' : value}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid" style={{ marginBottom: '24px' }}>
        {/* Recent Shipments Table Area */}
        <article className="card" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Recent Shipments</h2>
            <Link className="button-primary" to="/sender/create">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 18, height: 18, marginRight: 6 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Shipment
            </Link>
          </div>
          
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', color: 'var(--ink-500)', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)' }}>TRACKING ID</th>
                  <th style={{ padding: '12px 16px', color: 'var(--ink-500)', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)' }}>RECEIVER</th>
                  <th style={{ padding: '12px 16px', color: 'var(--ink-500)', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', color: 'var(--ink-500)', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan="4" style={{ padding: '16px' }}>
                        <div style={{ height: '24px', backgroundColor: 'var(--surface-3)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
                      </td>
                    </tr>
                  ))
                ) : dashboard.recentShipments.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--ink-500)' }}>
                      No shipments created yet.
                    </td>
                  </tr>
                ) : (
                  dashboard.recentShipments.slice(0, 5).map((shipment) => (
                    <tr key={shipment._id} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                      <td style={{ padding: '16px', fontWeight: 500 }}>{shipment.trackingId}</td>
                      <td style={{ padding: '16px', color: 'var(--ink-700)' }}>{shipment.receiver?.name}</td>
                      <td style={{ padding: '16px' }}><StatusBadge status={shipment.status} /></td>
                      <td style={{ padding: '16px' }}>
                        <Link to={`/shipments/${shipment._id}`} style={{ color: 'var(--accent-600)', fontWeight: 500, marginRight: '16px' }}>View</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Outstanding Payments Sidebar */}
        <article className="card" style={{ gridColumn: 'span 4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Pending Payments</h2>
            <Link className="button-secondary" to="/payments" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>View All</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
               <div style={{ height: '60px', backgroundColor: 'var(--surface-3)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }}></div>
            ) : dashboard.outstandingPayments.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-500)', backgroundColor: 'var(--surface-1)', borderRadius: '8px' }}>
                All caught up! No pending payments.
              </div>
            ) : (
              dashboard.outstandingPayments.slice(0, 4).map((shipment) => (
                <div key={shipment._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', transition: 'background-color 0.2s' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.95rem' }}>{shipment.trackingId}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--ink-500)' }}>{formatCurrency(shipment.paymentAmount)}</span>
                  </div>
                  <Link className="button-ghost" to={`/payments`}>Pay Now</Link>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </PortalShell>
  );
};

export default SenderDashboard;
