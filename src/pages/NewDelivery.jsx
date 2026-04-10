import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/formatters';

function calculateEstimate(weight, serviceLevel) {
  const parsedWeight = Math.max(Number(weight) || 0, 0);
  const base = serviceLevel === 'same-day' ? 24 : serviceLevel === 'express' ? 18 : 12;
  return Number((base + Math.max(parsedWeight, 1) * 2.75).toFixed(2));
}

const initialForm = {
  senderName: '',
  senderPhone: '',
  senderEmail: '',
  receiverName: '',
  receiverPhone: '',
  receiverEmail: '',
  packageType: '',
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

  const estimatedPrice = useMemo(
    () => calculateEstimate(form.weight, form.serviceLevel),
    [form.serviceLevel, form.weight]
  );

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
      showToast(`Shipment created. Tracking ID: ${response.data.trackingId}`, 'success');
      navigate(`/shipments/${response.data._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
              <p>These details are used to match incoming shipments to receiver accounts and delivery notifications.</p>
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
          <button className="button-primary full-span" disabled={loading} type="submit">
            {loading ? 'Creating shipment...' : 'Create shipment'}
          </button>
        </form>
      </section>
    </PortalShell>
  );
};

export default NewDelivery;
