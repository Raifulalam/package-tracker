import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const initialForm = {
  receiverName: '',
  receiverPhone: '',
  receiverEmail: '',
  pickupAddress: '',
  deliveryAddress: '',
  itemType: '',
  parcelCategory: 'Parcel',
  weight: '',
  deliveryType: 'express',
  priority: 'standard',
  declaredValue: '',
  paymentMode: 'prepaid',
  codAmount: '',
  scheduledPickupAt: '',
  instructions: '',
  dimensions: { length: '', width: '', height: '' },
};

const NewDelivery = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name.startsWith('dimensions.')) {
      const field = name.split('.')[1];
      setForm((prev) => ({
        ...prev,
        dimensions: {
          ...prev.dimensions,
          [field]: value,
        },
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/package', form, { token: user.token });
      navigate(`/sender/track/${response.data._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalShell
      title="Create Shipment"
      subtitle="Capture the shipment profile once, then let ParcelOps track scheduling, dispatch, and delivery progress automatically."
    >
      <section className="glass-card section-card">
        <div className="package-topline" style={{ marginBottom: 20 }}>
          <div>
            <h2>Shipment intake form</h2>
            <p>Add receiver details, service level, and package metadata for better operational planning.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <input name="receiverName" placeholder="Receiver name" value={form.receiverName} onChange={handleChange} required />
          <input name="receiverPhone" placeholder="Receiver phone" value={form.receiverPhone} onChange={handleChange} required />
          <input name="receiverEmail" placeholder="Receiver email" value={form.receiverEmail} onChange={handleChange} />
          <input name="itemType" placeholder="Item type" value={form.itemType} onChange={handleChange} required />
          <input className="full-span" name="pickupAddress" placeholder="Pickup address" value={form.pickupAddress} onChange={handleChange} required />
          <input className="full-span" name="deliveryAddress" placeholder="Delivery address" value={form.deliveryAddress} onChange={handleChange} required />
          <select name="parcelCategory" value={form.parcelCategory} onChange={handleChange}>
            <option value="Parcel">Parcel</option>
            <option value="Documents">Documents</option>
            <option value="Fragile">Fragile</option>
            <option value="Electronics">Electronics</option>
          </select>
          <input name="weight" type="number" min="0" step="0.1" placeholder="Weight (kg)" value={form.weight} onChange={handleChange} required />
          <select name="deliveryType" value={form.deliveryType} onChange={handleChange}>
            <option value="normal">Normal</option>
            <option value="express">Express</option>
            <option value="sameDay">Same day</option>
          </select>
          <select name="priority" value={form.priority} onChange={handleChange}>
            <option value="standard">Standard priority</option>
            <option value="priority">Priority</option>
            <option value="critical">Critical</option>
          </select>
          <input name="declaredValue" type="number" min="0" step="1" placeholder="Declared value" value={form.declaredValue} onChange={handleChange} />
          <input name="scheduledPickupAt" type="datetime-local" value={form.scheduledPickupAt} onChange={handleChange} />
          <select name="paymentMode" value={form.paymentMode} onChange={handleChange}>
            <option value="prepaid">Prepaid</option>
            <option value="cod">Cash on delivery</option>
          </select>
          <input name="codAmount" type="number" min="0" step="1" placeholder="COD amount" value={form.codAmount} onChange={handleChange} />
          <input name="dimensions.length" type="number" min="0" step="0.1" placeholder="Length (cm)" value={form.dimensions.length} onChange={handleChange} />
          <input name="dimensions.width" type="number" min="0" step="0.1" placeholder="Width (cm)" value={form.dimensions.width} onChange={handleChange} />
          <input name="dimensions.height" type="number" min="0" step="0.1" placeholder="Height (cm)" value={form.dimensions.height} onChange={handleChange} />
          <textarea
            className="full-span"
            name="instructions"
            rows="5"
            placeholder="Access notes, packaging details, handling instructions, or route remarks"
            value={form.instructions}
            onChange={handleChange}
          />
          {error ? <div className="auth-error full-span">{error}</div> : null}
          <div className="full-span" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="button-primary" disabled={loading} type="submit">
              {loading ? 'Creating shipment...' : 'Create shipment'}
            </button>
            <button className="button-ghost" onClick={() => navigate('/sender/my-packages')} type="button">
              View existing shipments
            </button>
          </div>
        </form>
      </section>
    </PortalShell>
  );
};

export default NewDelivery;
