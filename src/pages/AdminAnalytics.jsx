import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PortalShell from '../components/PortalShell';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/formatters';

const SHIPMENT_COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6'];

const AdminAnalytics = () => {
  const { user } = useAuth();
  const [payload, setPayload] = useState({ stats: {}, analytics: { dailyVolume: [], performance: [] }, usersByRole: {} });
  const [earnings, setEarnings] = useState({ totals: { gross: 0, agentShare: 0, adminShare: 0 }, agentBreakdown: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [packagesResponse, earningsResponse] = await Promise.all([
        api.get('/api/admin/packages?page=1&limit=8&status=All&search=', { token: user.token }),
        api.get('/api/payments/earnings/summary', { token: user.token }),
      ]);

      setPayload(packagesResponse.data || { stats: {}, analytics: { dailyVolume: [], performance: [] }, usersByRole: {} });
      setEarnings(earningsResponse.data || { totals: { gross: 0, agentShare: 0, adminShare: 0 }, agentBreakdown: [] });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const shipmentMix = useMemo(() => ([
    { name: 'Pending', value: payload.stats.pending || 0 },
    { name: 'Assigned', value: payload.stats.assigned || 0 },
    { name: 'In Transit', value: payload.stats.inTransit || 0 },
    { name: 'Delivered', value: payload.stats.delivered || 0 },
    { name: 'Cancelled', value: payload.stats.cancelled || 0 },
  ]).filter((item) => item.value > 0), [payload.stats]);

  const cards = [
    ['Gross revenue', formatCurrency(earnings.totals.gross || 0), 'info', 'All successful customer payments collected so far.'],
    ['Agent payout', formatCurrency(earnings.totals.agentShare || 0), 'success', '70% payout reserved for agents from paid deliveries.'],
    ['Admin revenue', formatCurrency(earnings.totals.adminShare || 0), 'warning', '30% of paid revenue retained by admin.'],
    ['Total shipments', payload.stats.total || 0, 'info', 'All shipments represented in the analytics view.'],
  ];

  return (
    <PortalShell
      title="Analytics"
      subtitle="Track shipment flow, payment performance, and courier contribution from one reporting workspace."
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
        <article className="glass-card section-card" style={{ gridColumn: 'span 7' }}>
          <div className="admin-section-head">
            <div>
              <h2>Daily shipment volume</h2>
              <p>Latest booking flow across the last seven days.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading daily shipment volume...</div>
          ) : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={payload.analytics.dailyVolume || []}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 5' }}>
          <div className="admin-section-head">
            <div>
              <h2>Shipment mix</h2>
              <p>How the current shipment pool is distributed by status.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading shipment mix...</div>
          ) : shipmentMix.length === 0 ? (
            <div className="empty-state">No shipment mix data available yet.</div>
          ) : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={shipmentMix} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100}>
                    {shipmentMix.map((entry, index) => (
                      <Cell fill={SHIPMENT_COLORS[index % SHIPMENT_COLORS.length]} key={entry.name} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 6' }}>
          <div className="admin-section-head">
            <div>
              <h2>Courier workload</h2>
              <p>Current assignment pressure across the delivery team.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading courier workload...</div>
          ) : (
            <div className="admin-history-list">
              {(payload.analytics.performance || []).map((agent) => (
                <div className="admin-history-item" key={agent._id}>
                  <div className="admin-user-item">
                    <span>{agent.name}</span>
                    <strong>{agent.currentAssignedDeliveries} active</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 6' }}>
          <div className="admin-section-head">
            <div>
              <h2>Top earning agents</h2>
              <p>Revenue contribution ranked by the 70% payout assigned to each courier.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading top earning agents...</div>
          ) : (
            <div className="admin-history-list">
              {(earnings.agentBreakdown || []).slice(0, 8).map((agent) => (
                <div className="admin-history-item" key={agent.agentId || agent.agentName}>
                  <div className="admin-user-item">
                    <span>{agent.agentName}</span>
                    <strong>{formatCurrency(agent.agentShare)}</strong>
                  </div>
                  <small style={{ color: 'var(--ink-500)' }}>
                    Gross {formatCurrency(agent.gross)} from {agent.transactions} paid deliveries
                  </small>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </PortalShell>
  );
};

export default AdminAnalytics;
