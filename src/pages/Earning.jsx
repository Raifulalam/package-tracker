import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';

const emptyPayload = {
  shareRates: { agent: 0.7, admin: 0.3 },
  totals: { gross: 0, agentShare: 0, adminShare: 0, transactions: 0 },
  monthlyBreakdown: [],
  recentTransactions: [],
  agentBreakdown: [],
  agents: [],
};

const EarningsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [filters, setFilters] = useState({ agentId: '', fromDate: '', toDate: '' });
  const [payload, setPayload] = useState(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEarnings = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (isAdmin && filters.agentId) params.set('agentId', filters.agentId);
    if (filters.fromDate) params.set('fromDate', filters.fromDate);
    if (filters.toDate) params.set('toDate', filters.toDate);

    try {
      const response = await api.get(`/api/payments/earnings/summary?${params.toString()}`, { token: user.token });
      setPayload(response.data || emptyPayload);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters.agentId, filters.fromDate, filters.toDate, isAdmin, user.token]);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  const cards = useMemo(() => {
    if (isAdmin) {
      return [
        ['Gross revenue', payload.totals.gross, 'currency', 'info', 'All paid shipment revenue in the selected range.'],
        ['Agent share', payload.totals.agentShare, 'currency', 'success', '70% of total user payments reserved for agents.'],
        ['Admin share', payload.totals.adminShare, 'currency', 'warning', '30% of total user payments retained by admin.'],
        ['Paid transactions', payload.totals.transactions, 'count', 'info', 'Completed payments included in this earnings view.'],
      ];
    }

    return [
      ['My gross route revenue', payload.totals.gross, 'currency', 'info', 'Paid shipment value from your assigned deliveries.'],
      ['My earnings', payload.totals.agentShare, 'currency', 'success', 'Your 70% share from completed customer payments.'],
      ['Admin share', payload.totals.adminShare, 'currency', 'warning', 'The 30% retained by admin from your completed deliveries.'],
      ['Paid deliveries', payload.totals.transactions, 'count', 'info', 'Paid shipments included in your payout history.'],
    ];
  }, [isAdmin, payload.totals]);

  const title = isAdmin ? 'Admin Earnings' : 'Agent Earnings';
  const subtitle = isAdmin
    ? 'Track real payment revenue, review the 70/30 split, and compare how each courier contributes to collected revenue.'
    : 'Review your paid deliveries, your 70% share, and the payment history behind your completed work.';

  return (
    <PortalShell title={title} subtitle={subtitle}>
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="admin-summary-grid">
        {cards.map(([label, value, valueType, tone, copy]) => (
          <article className="glass-card metric-card admin-summary-card" key={label}>
            <small>{label}</small>
            <strong>{loading ? '...' : valueType === 'count' ? value : formatCurrency(value)}</strong>
            <p>{copy}</p>
            <span className={`admin-summary-icon tone-${tone}`}>{String(label).slice(0, 2).toUpperCase()}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
          <div className="admin-section-head">
            <div>
              <h2>Revenue trend</h2>
              <p>Monthly view of gross revenue and the split between agent payouts and admin share.</p>
            </div>
          </div>

          <div className="admin-filter-bar compact">
            {isAdmin ? (
              <select onChange={(event) => setFilters((current) => ({ ...current, agentId: event.target.value }))} value={filters.agentId}>
                <option value="">All agents</option>
                {payload.agents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name} {agent.isAvailable ? '(Online)' : '(Offline)'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="info-banner">Your earnings are already filtered to your assigned deliveries.</div>
            )}
            <input onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} type="date" value={filters.fromDate} />
            <input onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} type="date" value={filters.toDate} />
          </div>

          {loading ? (
            <div className="empty-state">Loading earnings trend...</div>
          ) : payload.monthlyBreakdown.length === 0 ? (
            <div className="empty-state">No paid revenue found for the selected filters.</div>
          ) : (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={payload.monthlyBreakdown}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="gross" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="agentShare" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="adminShare" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
          <div className="admin-section-head">
            <div>
              <h2>Split rules</h2>
              <p>The revenue distribution applied to every successful user payment.</p>
            </div>
          </div>

          <div className="package-stack">
            <article className="package-item">
              <div className="package-topline">
                <strong>Agent share</strong>
                <StatusBadge status="Available" />
              </div>
              <p style={{ margin: '12px 0 0', color: 'var(--ink-700)' }}>
                {(payload.shareRates.agent * 100).toFixed(0)}% of each successful user payment goes to the assigned agent.
              </p>
            </article>
            <article className="package-item">
              <div className="package-topline">
                <strong>Admin share</strong>
                <StatusBadge status="Pending" />
              </div>
              <p style={{ margin: '12px 0 0', color: 'var(--ink-700)' }}>
                {(payload.shareRates.admin * 100).toFixed(0)}% of each successful user payment stays with admin.
              </p>
            </article>
          </div>
        </article>
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        {isAdmin ? (
          <article className="glass-card section-card" style={{ gridColumn: 'span 5' }}>
            <div className="admin-section-head">
              <div>
                <h2>Agent earnings board</h2>
                <p>Compare how much each courier earned from their assigned paid deliveries.</p>
              </div>
            </div>

            {loading ? (
              <div className="empty-state">Loading agent earnings board...</div>
            ) : payload.agentBreakdown.length === 0 ? (
              <div className="empty-state">No agent earnings recorded yet.</div>
            ) : (
              <div className="admin-history-list">
                {payload.agentBreakdown.map((item) => (
                  <div className="admin-history-item" key={item.agentId || item.agentName}>
                    <div className="admin-user-item">
                      <span>{item.agentName}</span>
                      <strong>{formatCurrency(item.agentShare)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                      <small style={{ color: 'var(--ink-500)' }}>{item.transactions} paid deliveries</small>
                      <small style={{ color: 'var(--ink-500)' }}>Gross: {formatCurrency(item.gross)}</small>
                      <small style={{ color: 'var(--ink-500)' }}>Admin: {formatCurrency(item.adminShare)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        ) : null}

        <article className="glass-card section-card" style={{ gridColumn: isAdmin ? 'span 7' : 'span 12' }}>
          <div className="admin-section-head">
            <div>
              <h2>Recent payment transactions</h2>
              <p>Each row shows the original payment and how it split between the agent and admin.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading payment transactions...</div>
          ) : payload.recentTransactions.length === 0 ? (
            <div className="empty-state">No successful payment transactions found.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="package-table admin-orders-table compact">
                <thead>
                  <tr>
                    <th>Tracking</th>
                    <th>Customer</th>
                    {isAdmin ? <th>Agent</th> : null}
                    <th>Gross</th>
                    <th>Agent 70%</th>
                    <th>Admin 30%</th>
                    <th>Method</th>
                    <th>Paid at</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.recentTransactions.map((tx) => (
                    <tr key={tx._id}>
                      <td>
                        <div className="admin-table-primary">
                          <strong>{tx.trackingId}</strong>
                          <small>{tx.packageType}</small>
                        </div>
                      </td>
                      <td>{tx.senderName} to {tx.receiverName}</td>
                      {isAdmin ? <td>{tx.agentName}</td> : null}
                      <td>{formatCurrency(tx.amount)}</td>
                      <td>{formatCurrency(tx.agentShare)}</td>
                      <td>{formatCurrency(tx.adminShare)}</td>
                      <td>{tx.method}</td>
                      <td>{formatDateTime(tx.paidAt || tx.createdAt)}</td>
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

export const AdminEarning = EarningsPage;
export const AgentEarning = EarningsPage;
export default EarningsPage;
