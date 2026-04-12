import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/formatters';

const initialForm = {
  senderName: '',
  senderPhone: '',
  senderEmail: '',
  receiverName: '',
  receiverPhone: '',
  receiverEmail: '',
  packageType: '',
  routeType: 'sameCity',
  weight: '',
  pickupAddress: '',
  deliveryAddress: '',
  notes: '',
  serviceLevel: 'standard',
};

const NewDelivery = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    ...initialForm,
    senderName: user?.name || '',
    senderPhone: user?.phone || '',
    senderEmail: user?.email || '',
    pickupAddress: user?.address || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    api.get('/api/shipments/pricing', { token: user.token })
      .then(setPricing)
      .catch((err) => console.error('Failed to load pricing config:', err));
  }, [user.token]);

  const estimatedPrice = useMemo(() => {
    if (!pricing || !form.weight) return 0;
    
    const parsedWeight = Math.max(Number(form.weight) || 0, 0);
    const basePrice = Number(pricing[form.routeType] || pricing.sameCity || 75);
    const perKgRate = Number(pricing.perKgRate || 2.5);
    const deliveryMultiplier = form.serviceLevel === 'express' ? Number(pricing.expressMultiplier || 1.35) : 1;
    
    return (basePrice + (parsedWeight * perKgRate)) * deliveryMultiplier;
  }, [form.serviceLevel, form.weight, form.routeType, pricing]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/shipments', form, { token: user.token });
      showToast('Shipment created successfully!', 'success');
      setSuccessData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!successData) return;
    const text = `Tracking ID: ${successData.trackingId}\nDelivery OTP: ${successData.deliveryOtp}\nStatus: Created`;
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  };

  if (successData) {
    return (
      <PortalShell title="Shipment Created" subtitle="Your shipment is ready for pickup!">
        <section className="glass-card section-card" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: '32px 16px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', backgroundColor: '#dcfce7', color: '#15803d', marginBottom: '24px' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 32, height: 32 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Shipment Successful</h2>
            <p style={{ color: 'var(--ink-500)', marginBottom: '24px' }}>Please securely share the Delivery OTP with the receiver.</p>

            <div style={{ backgroundColor: 'var(--surface-2)', padding: '24px', borderRadius: '16px', textAlign: 'left', marginBottom: '24px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                 <span style={{ color: 'var(--ink-500)', fontWeight: 600 }}>Tracking ID:</span>
                 <strong style={{ fontSize: '1.1rem' }}>{successData.trackingId}</strong>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                 <span style={{ color: 'var(--ink-500)', fontWeight: 600 }}>Status:</span>
                 <span className="status-badge tone-success">Created</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                 <span style={{ color: 'var(--ink-500)', fontWeight: 600 }}>Delivery OTP:</span>
                 <strong style={{ fontSize: '1.2rem', color: 'var(--accent-700)', letterSpacing: '4px' }}>{successData.deliveryOtp}</strong>
               </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
               <button type="button" className="button-secondary" onClick={handleCopy} style={{ padding: '12px 24px' }}>
                 Copy Details
               </button>
               <button type="button" className="button-primary" onClick={() => navigate(`/shipments/${successData._id}`)} style={{ padding: '12px 24px' }}>
                 View Shipment
               </button>
            </div>
          </div>
        </section>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      title="Create Shipment"
      subtitle="Capture sender and receiver details, generate a tracking ID instantly, and start the NexExpree delivery workflow with payment-aware pricing."
    >
      <section className="glass-card section-card">
        <div className="info-banner" style={{ marginBottom: 18 }}>
          Shipment charges are mocked for now and become payable through the payment workspace before final delivery confirmation.
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="fieldset-card full-span">
            <div className="section-copy">
              <strong>Sender information</strong>
              <p>This defaults to your account profile but can be adjusted for each shipment.</p>
            </div>
          </div>

          <label className="field-group">
            <span>Sender name</span>
            <input name="senderName" onChange={handleChange} value={form.senderName} required />
          </label>
          <label className="field-group">
            <span>Sender phone</span>
            <input name="senderPhone" onChange={handleChange} value={form.senderPhone} required />
          </label>
          <label className="field-group full-span">
            <span>Sender email</span>
            <input name="senderEmail" onChange={handleChange} type="email" value={form.senderEmail} required />
          </label>

          <div className="fieldset-card full-span">
            <div className="section-copy">
              <strong>Receiver information</strong>
              <p>These details are used for the shipping label and notifications. Note: Receivers don't require an account.</p>
            </div>
          </div>

          <label className="field-group">
            <span>Receiver name</span>
            <input name="receiverName" onChange={handleChange} value={form.receiverName} required />
          </label>
          <label className="field-group">
            <span>Receiver phone</span>
            <input name="receiverPhone" onChange={handleChange} value={form.receiverPhone} required />
          </label>
          <label className="field-group full-span">
            <span>Receiver email</span>
            <input name="receiverEmail" onChange={handleChange} type="email" value={form.receiverEmail} />
          </label>

          <label className="field-group">
            <span>Package type</span>
            <input name="packageType" onChange={handleChange} placeholder="Documents, apparel, electronics..." value={form.packageType} required />
          </label>
          <label className="field-group">
            <span>Route</span>
            <select name="routeType" onChange={handleChange} value={form.routeType}>
              <option value="sameCity">Same City</option>
              <option value="sameDistrict">Same District</option>
              <option value="sameProvince">Same Province</option>
              <option value="differentProvince">Cross Province</option>
            </select>
          </label>
          <label className="field-group">
            <span>Weight (kg)</span>
            <input min="0.1" name="weight" onChange={handleChange} step="0.1" type="number" value={form.weight} required />
          </label>
          <label className="field-group">
            <span>Service level</span>
            <select name="serviceLevel" onChange={handleChange} value={form.serviceLevel}>
              <option value="standard">Standard</option>
              <option value="express">Express</option>
              <option value="same-day">Same day</option>
            </select>
          </label>
          <label className="field-group">
            <span>Estimated charge</span>
            <input value={formatCurrency(estimatedPrice)} readOnly />
          </label>
          <label className="field-group full-span">
            <span>Pickup address</span>
            <input name="pickupAddress" onChange={handleChange} value={form.pickupAddress} required />
          </label>
          <label className="field-group full-span">
            <span>Delivery address</span>
            <input name="deliveryAddress" onChange={handleChange} value={form.deliveryAddress} required />
          </label>
          <label className="field-group full-span">
            <span>Notes</span>
            <textarea name="notes" onChange={handleChange} value={form.notes} placeholder="Access instructions, handling notes, preferred contact timing..." />
          </label>

          {error ? <div className="auth-error full-span">{error}</div> : null}
          <button className="button-primary full-span" disabled={loading} type="submit" style={{ padding: '14px', marginTop: '10px' }}>
            {loading ? 'Creating shipment...' : 'Create shipment'}
          </button>
        </form>
      </section>
    </PortalShell>
  );
};

export default NewDelivery;
