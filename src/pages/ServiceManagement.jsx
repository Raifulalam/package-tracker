import { useCallback, useEffect, useMemo, useState } from 'react';
import PricingEditor from '../components/PricingEditor';
import PortalShell from '../components/PortalShell';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/formatters';

const ServiceManagement = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadPricing = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/pricing', { token: user.token });
      setPricing(response || {});
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setPricing((current) => ({
      ...current,
      [name]: Number(value),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/admin/pricing', pricing, { token: user.token });
      showToast('Service pricing updated successfully.', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const cards = useMemo(() => pricing ? [
    ['Same city', formatCurrency(pricing.sameCity || 0), 'info', 'Base route pricing inside the same city.'],
    ['Express multiplier', `${pricing.expressMultiplier || 0}x`, 'warning', 'Boost applied to priority service requests.'],
    ['Per kg rate', formatCurrency(pricing.perKgRate || 0), 'success', 'Additional charge per kilogram.'],
    ['COD fee', formatCurrency(pricing.codCharge || 0), 'danger', 'Cash collection handling fee per shipment.'],
  ] : [], [pricing]);

  return (
    <PortalShell
      title="Manage Services"
      subtitle="Control pricing rules, route costs, and service multipliers used throughout shipment creation and checkout."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      {pricing ? (
        <>
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
            <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
              <PricingEditor pricing={pricing} onChange={handleChange} onSubmit={handleSubmit} loading={saving} />
            </article>

            <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
              <div className="admin-section-head">
                <div>
                  <h2>Service notes</h2>
                  <p>Helpful reminders while adjusting route and surcharge rules.</p>
                </div>
              </div>

              <div className="workspace-action-list">
                <div className="info-banner">
                  Same-city, district, province, and cross-province pricing directly affects shipment creation estimates.
                </div>
                <div className="info-banner">
                  The express multiplier increases the final route charge after the base and weight calculation.
                </div>
                <div className="info-banner">
                  Keep COD and weight rules realistic so payment summaries and earnings stay trustworthy.
                </div>
              </div>
            </article>
          </section>
        </>
      ) : (
        <div className="empty-state">Loading service pricing...</div>
      )}
    </PortalShell>
  );
};

export default ServiceManagement;
