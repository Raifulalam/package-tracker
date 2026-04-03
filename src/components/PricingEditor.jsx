import { formatCurrency } from '../lib/formatters';

const pricingFields = [
  { name: 'sameCity', label: 'Same city base' },
  { name: 'sameDistrict', label: 'Same district base' },
  { name: 'sameProvince', label: 'Same province base' },
  { name: 'differentProvince', label: 'Different province base' },
  { name: 'perKgRate', label: 'Per kg rate' },
  { name: 'expressMultiplier', label: 'Express multiplier', step: '0.01' },
  { name: 'codCharge', label: 'COD charge' },
];

const PricingEditor = ({
  pricing,
  onChange,
  onSubmit,
  loading,
  disabled = false,
}) => (
  <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
    <div className="package-topline" style={{ marginBottom: 18 }}>
      <div>
        <h2>Pricing engine</h2>
        <p>Control live base rates, express uplift, and COD surcharges for the whole network.</p>
      </div>
    </div>

    <form className="form-grid" onSubmit={onSubmit}>
      {pricingFields.map((field) => (
        <label className="field-group" key={field.name}>
          <span>{field.label}</span>
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

      <div className="full-span pricing-rules">
        <strong>Rate ladder</strong>
        <span>Same city: {formatCurrency(pricing.sameCity)}</span>
        <span>Same district: {formatCurrency(pricing.sameDistrict)}</span>
        <span>Same province: {formatCurrency(pricing.sameProvince)}</span>
        <span>Different province: {formatCurrency(pricing.differentProvince)}</span>
        <span>Per kg: {formatCurrency(pricing.perKgRate)}</span>
        <span>COD: {formatCurrency(pricing.codCharge)}</span>
      </div>

      <button className="button-primary full-span" disabled={disabled || loading} type="submit">
        {loading ? 'Saving pricing...' : 'Save pricing'}
      </button>
    </form>
  </article>
);

export default PricingEditor;
