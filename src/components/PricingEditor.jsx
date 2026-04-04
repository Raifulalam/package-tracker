import { formatCurrency } from '../lib/formatters';

const pricingFields = [
  { name: 'sameCity', label: 'Same-city base fare', note: 'Local runs inside one city' },
  { name: 'sameDistrict', label: 'Same-district base fare', note: 'Short-haul district routes' },
  { name: 'sameProvince', label: 'Same-province base fare', note: 'Intercity within one province' },
  { name: 'differentProvince', label: 'Cross-province base fare', note: 'Long-distance network movement' },
  { name: 'perKgRate', label: 'Per kg uplift', note: 'Applied on weight-based pricing' },
  { name: 'expressMultiplier', label: 'Express multiplier', step: '0.01', note: 'Boost for priority service' },
  { name: 'codCharge', label: 'COD service fee', note: 'Cash collection handling fee' },
];

const PricingEditor = ({
  pricing,
  onChange,
  onSubmit,
  loading,
  disabled = false,
}) => (
  <article className="glass-card section-card pricing-editor-card">
    <div className="pricing-editor-head">
      <div>
        <h2>Pricing Settings</h2>
        <p>Control route pricing, express uplift, and COD service fees for the ParcelOps delivery network.</p>
      </div>
      <div className="pricing-editor-chip">Admin only</div>
    </div>

    <form className="pricing-editor-grid" onSubmit={onSubmit}>
      {pricingFields.map((field) => (
        <label className="field-group pricing-editor-field" key={field.name}>
          <span>{field.label}</span>
          <small>{field.note}</small>
          <input
            disabled={disabled}
            min="0"
            name={field.name}
            onChange={onChange}
            step={field.step || '1'}
            type="number"
            value={pricing[field.name]}
          />
        </label>
      ))}

      <div className="full-span pricing-rules pricing-rules-grid">
        <strong>Active rate summary</strong>
        <div className="pricing-rule-item">
          <span>Same city</span>
          <b>{formatCurrency(pricing.sameCity)}</b>
        </div>
        <div className="pricing-rule-item">
          <span>Same district</span>
          <b>{formatCurrency(pricing.sameDistrict)}</b>
        </div>
        <div className="pricing-rule-item">
          <span>Same province</span>
          <b>{formatCurrency(pricing.sameProvince)}</b>
        </div>
        <div className="pricing-rule-item">
          <span>Cross province</span>
          <b>{formatCurrency(pricing.differentProvince)}</b>
        </div>
        <div className="pricing-rule-item">
          <span>Per kg uplift</span>
          <b>{formatCurrency(pricing.perKgRate)}</b>
        </div>
        <div className="pricing-rule-item">
          <span>COD service fee</span>
          <b>{formatCurrency(pricing.codCharge)}</b>
        </div>
        <div className="pricing-rule-item">
          <span>Express multiplier</span>
          <b>{pricing.expressMultiplier}x</b>
        </div>
      </div>

      <button className="button-primary full-span" disabled={disabled || loading} type="submit">
        {loading ? 'Saving pricing settings...' : 'Save pricing settings'}
      </button>
    </form>
  </article>
);

export default PricingEditor;
