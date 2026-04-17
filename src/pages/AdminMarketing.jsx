import { useCallback, useEffect, useMemo, useState } from 'react';
import PortalShell from '../components/PortalShell';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/formatters';

const AdminMarketing = () => {
  const { user } = useAuth();
  const [usersByRole, setUsersByRole] = useState({});
  const [shipmentStats, setShipmentStats] = useState({ total: 0, pending: 0, delivered: 0, inTransit: 0 });
  const [earnings, setEarnings] = useState({ totals: { gross: 0, transactions: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMarketingData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResponse, packagesResponse, earningsResponse] = await Promise.all([
        api.get('/api/admin/users', { token: user.token }),
        api.get('/api/admin/packages?page=1&limit=8&status=All&search=', { token: user.token }),
        api.get('/api/payments/earnings/summary', { token: user.token }),
      ]);

      setUsersByRole(usersResponse.data?.byRole || {});
      setShipmentStats(packagesResponse.data?.stats || { total: 0, pending: 0, delivered: 0, inTransit: 0 });
      setEarnings(earningsResponse.data || { totals: { gross: 0, transactions: 0 } });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    loadMarketingData();
  }, [loadMarketingData]);

  const campaignIdeas = useMemo(() => [
    {
      title: 'Re-activate senders',
      copy: `Reach out to ${usersByRole.sender || 0} sender accounts with referral credits and limited-time delivery discounts.`,
    },
    {
      title: 'Push express service',
      copy: `Promote premium shipping to customers while network volume is at ${shipmentStats.total || 0} total shipments.`,
    },
    {
      title: 'Celebrate delivery proof',
      copy: `Use the ${shipmentStats.delivered || 0} delivered shipments as social proof in customer-facing campaigns.`,
    },
  ], [shipmentStats.delivered, shipmentStats.total, usersByRole.sender]);

  const cards = [
    ['Sender audience', usersByRole.sender || 0, 'info', 'Registered senders available for acquisition and reactivation campaigns.'],
    ['Agent network', usersByRole.agent || 0, 'success', 'Available courier capacity you can highlight in trust messaging.'],
    ['Revenue base', formatCurrency(earnings.totals.gross || 0), 'warning', 'Total paid revenue backing your growth campaigns.'],
    ['Delivered proof', shipmentStats.delivered || 0, 'info', 'Completed shipments that can support marketing credibility.'],
  ];

  return (
    <PortalShell
      title="Marketing"
      subtitle="Turn live platform metrics into campaign direction, growth messaging, and sender re-engagement ideas."
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
        <article className="glass-card section-card" style={{ gridColumn: 'span 6' }}>
          <div className="admin-section-head">
            <div>
              <h2>Campaign ideas</h2>
              <p>Simple action prompts generated from what the platform is doing right now.</p>
            </div>
          </div>

          <div className="workspace-action-list">
            {campaignIdeas.map((idea) => (
              <div className="workspace-action-card" key={idea.title}>
                <strong>{idea.title}</strong>
                <span>{idea.copy}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 6' }}>
          <div className="admin-section-head">
            <div>
              <h2>Growth snapshot</h2>
              <p>Use these numbers in internal planning or external marketing decisions.</p>
            </div>
          </div>

          <div className="workspace-action-list">
            <div className="info-banner">
              Total paid transactions: {loading ? '...' : earnings.totals.transactions || 0}
            </div>
            <div className="info-banner">
              In-transit shipments: {loading ? '...' : shipmentStats.inTransit || 0}
            </div>
            <div className="info-banner">
              Pending shipments: {loading ? '...' : shipmentStats.pending || 0}
            </div>
            <div className="info-banner">
              Admin share available for growth spending: {loading ? '...' : formatCurrency(earnings.totals.adminShare || 0)}
            </div>
          </div>
        </article>
      </section>
    </PortalShell>
  );
};

export default AdminMarketing;
