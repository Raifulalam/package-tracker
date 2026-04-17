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

  const summaryCards = useMemo(
    () => [
      ['Total Shipments', dashboard.stats.total, 'info', 'Everything created from your workspace.'],
      ['Pending', dashboard.stats.pending, 'warning', 'Booked shipments still waiting for next action.'],
      ['In Transit', dashboard.stats.inTransit, 'info', 'Packages currently moving through delivery.'],
      ['Delivered', dashboard.stats.delivered, 'success', 'Completed handoffs confirmed by the receiver.'],
      ['Unpaid', dashboard.stats.unpaid, 'danger', 'Shipments that still need payment attention.'],
    ],
    [dashboard.stats]
  );

  return (
    <PortalShell
      title="Sender Dashboard"
      subtitle="Track shipment progress, review delivery history, and manage payment follow-up from one place."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="admin-summary-grid">
        {summaryCards.map(([label, value, tone, copy]) => (
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
              <h2>Recent shipments</h2>
              <p>The latest bookings, current status, and quick links into each shipment timeline.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link className="button-secondary" to="/sender/my-packages">View all</Link>
              <Link className="button-primary" to="/sender/create">Create shipment</Link>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading recent shipments...</div>
          ) : dashboard.recentShipments.length === 0 ? (
            <div className="empty-state">No shipments created yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={tableHeadStyle}>Tracking</th>
                    <th style={tableHeadStyle}>Receiver</th>
                    <th style={tableHeadStyle}>Status</th>
                    <th style={tableHeadStyle}>Payment</th>
                    <th style={tableHeadStyle}>Updated</th>
                    <th style={tableHeadStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentShipments.map((shipment) => (
                    <tr key={shipment._id} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                      <td style={tableCellStrongStyle}>
                        <div>{shipment.trackingId}</div>
                        <small style={{ color: 'var(--ink-500)' }}>{shipment.packageType}</small>
                      </td>
                      <td style={tableCellStyle}>
                        <div>{shipment.receiver?.name || 'Receiver'}</div>
                        <small style={{ color: 'var(--ink-500)' }}>{shipment.deliveryAddress}</small>
                      </td>
                      <td style={tableCellStyle}><StatusBadge status={shipment.status} /></td>
                      <td style={tableCellStyle}><StatusBadge status={shipment.paymentStatus} /></td>
                      <td style={tableCellStyle}>{formatDateTime(shipment.updatedAt)}</td>
                      <td style={tableCellStyle}>
                        <Link to={`/shipments/${shipment._id}`} style={linkStyle}>Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
          <div className="admin-section-head">
            <div>
              <h2>Pending payments</h2>
              <p>Shipments that still need payment before the handoff can be completed.</p>
            </div>
            <Link className="button-secondary" to="/payments">Payments</Link>
          </div>

          {loading ? (
            <div className="empty-state">Loading pending payments...</div>
          ) : dashboard.outstandingPayments.length === 0 ? (
            <div className="empty-state">All shipment payments are up to date.</div>
          ) : (
            <div className="package-stack">
              {dashboard.outstandingPayments.map((shipment) => (
                <article className="package-item" key={shipment._id}>
                  <div className="package-topline">
                    <strong>{shipment.trackingId}</strong>
                    <StatusBadge status={shipment.paymentStatus} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 12 }}>
                    <span>Receiver: {shipment.receiver?.name || 'Receiver'}</span>
                    <span>Amount: {formatCurrency(shipment.paymentAmount)}</span>
                    <span>Status: {shipment.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                    <Link className="button-primary" to="/payments">Pay now</Link>
                    <Link className="button-secondary" to={`/shipments/${shipment._id}`}>View shipment</Link>
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
              <p>Your most recent completed shipments, useful for quick confirmation and follow-up.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading delivery history...</div>
          ) : dashboard.deliveryHistory.length === 0 ? (
            <div className="empty-state">Delivered shipments will appear here once handoffs are complete.</div>
          ) : (
            <div className="package-stack">
              {dashboard.deliveryHistory.map((shipment) => (
                <article className="package-item" key={shipment._id}>
                  <div className="package-topline">
                    <strong>{shipment.trackingId}</strong>
                    <StatusBadge status={shipment.status} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 12 }}>
                    <span>Receiver: {shipment.receiver?.name || 'Receiver'}</span>
                    <span>Delivered: {formatDateTime(shipment.deliveredAt || shipment.updatedAt)}</span>
                    <span>Amount: {formatCurrency(shipment.paymentAmount)}</span>
                  </div>
                  <Link className="button-secondary" style={{ marginTop: 14 }} to={`/shipments/${shipment._id}`}>Review timeline</Link>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 6' }}>
          <div className="admin-section-head">
            <div>
              <h2>Payment history</h2>
              <p>Recent transactions recorded from your account, including method, amount, and status.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading payment history...</div>
          ) : dashboard.paymentHistory.length === 0 ? (
            <div className="empty-state">Completed payments will appear here after checkout.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                <thead>
                  <tr>
                    <th style={tableHeadStyle}>Tracking</th>
                    <th style={tableHeadStyle}>Amount</th>
                    <th style={tableHeadStyle}>Method</th>
                    <th style={tableHeadStyle}>Status</th>
                    <th style={tableHeadStyle}>Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.paymentHistory.map((payment) => (
                    <tr key={payment._id} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                      <td style={tableCellStrongStyle}>
                        <div>{payment.trackingId}</div>
                        <small style={{ color: 'var(--ink-500)' }}>{payment.transactionId || 'Pending reference'}</small>
                      </td>
                      <td style={tableCellStyle}>{formatCurrency(payment.amount)}</td>
                      <td style={tableCellStyle}>{payment.method}</td>
                      <td style={tableCellStyle}><StatusBadge status={payment.status} /></td>
                      <td style={tableCellStyle}>{formatDateTime(payment.paidAt || payment.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </PortalShell>
  );
};

const tableHeadStyle = {
  padding: '12px 16px',
  color: 'var(--ink-500)',
  fontSize: '0.82rem',
  fontWeight: 600,
  textAlign: 'left',
  borderBottom: '1px solid var(--border-color)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tableCellStyle = {
  padding: '16px',
  color: 'var(--ink-700)',
  verticalAlign: 'top',
};

const tableCellStrongStyle = {
  ...tableCellStyle,
  fontWeight: 600,
};

const linkStyle = {
  color: 'var(--accent-600)',
  fontWeight: 600,
  textDecoration: 'none',
};

export default SenderDashboard;
