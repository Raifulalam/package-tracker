import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationSelectGroup from '../components/LocationSelectGroup';
import PortalShell from '../components/PortalShell';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { useLocations } from '../hooks/useLocations';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/formatters';
import { buildLocationLabel, calculateEstimatedPrice, getRouteLabel } from '../lib/pricing';

const initialForm = {
  receiverName: '',
  receiverPhone: '',
  receiverEmail: '',
  itemType: '',
  parcelCategory: 'Parcel',
  weight: '',
  deliveryType: 'normal',
  priority: 'standard',
  declaredValue: '',
  paymentMode: 'prepaid',
  codAmount: '',
  scheduledPickupAt: '',
  instructions: '',
  dimensions: { length: '', width: '', height: '' },
  province: '',
  district: '',
  city: '',
};

const emptyPricing = {
  sameCity: 0,
  sameDistrict: 0,
  sameProvince: 0,
  differentProvince: 0,
  perKgRate: 0,
  expressMultiplier: 1,
  codCharge: 0,
};

const NewDelivery = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { provinces, getDistricts, getCities, loading: locationsLoading, error: locationsError } = useLocations();

  const [form, setForm] = useState(initialForm);
  const [pricing, setPricing] = useState(emptyPricing);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPricing = async () => {
      try {
        const response = await api.get('/api/pricing');

        if (!active) return;

        setPricing(response.data || emptyPricing);
        setPricingError('');
      } catch (err) {
        if (active) {
          setPricingError(err.message);
          setPricing(emptyPricing);
        }
      } finally {
        if (active) {
          setPricingLoading(false);
        }
      }
    };

    loadPricing();

    return () => {
      active = false;
    };
  }, []);

  const senderLocation = useMemo(
    () => ({
      province: user?.province || '',
      district: user?.district || '',
      city: user?.city || '',
    }),
    [user?.city, user?.district, user?.province]
  );

  const receiverLocation = useMemo(
    () => ({
      province: form.province,
      district: form.district,
      city: form.city,
    }),
    [form.city, form.district, form.province]
  );

  const districts = getDistricts(form.province);
  const cities = getCities(form.province, form.district);

  const estimate = useMemo(
    () =>
      calculateEstimatedPrice({
        senderLocation,
        receiverLocation,
        weight: form.weight,
        deliveryType: form.deliveryType,
        paymentMode: form.paymentMode,
        pricing,
      }),
    [form.deliveryType, form.paymentMode, form.weight, pricing, receiverLocation, senderLocation]
  );

  const senderLocationMissing = !senderLocation.province || !senderLocation.district || !senderLocation.city;

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

    setForm((prev) => {
      const updatedForm = { ...prev, [name]: value };

      if (name === 'province') {
        updatedForm.district = '';
        updatedForm.city = '';
      }

      if (name === 'district') {
        updatedForm.city = '';
      }

      if (name === 'paymentMode' && value !== 'cod') {
        updatedForm.codAmount = '';
      }

      return updatedForm;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/package', form, { token: user.token });
      showToast(`Shipment created. Estimated charge: ${formatCurrency(response.data.shippingCharge)}.`, 'success');
      navigate(`/sender/track/${response.data._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isEstimateReady = Boolean(
    pricing &&
      form.weight &&
      receiverLocation.province &&
      receiverLocation.district &&
      receiverLocation.city
  );

  return (
    <PortalShell
      title="Create Shipment"
      subtitle="Create route-aware shipments with Nepal location intelligence and live pricing based on origin, destination, weight, service tier, and payment mode."
    >
      <section className="glass-card section-card">
        <div className="info-banner" style={{ marginBottom: 18 }}>
          Sender origin: <strong>{buildLocationLabel(senderLocation) || 'Location missing from your account'}</strong>
        </div>

        {senderLocationMissing ? (
          <div className="auth-error" style={{ marginBottom: 18 }}>
            Your sender account does not yet have a saved province, district, and city. Register or update the
            account with a valid Nepal location before creating shipments.
          </div>
        ) : null}

        {locationsError ? <div className="auth-error" style={{ marginBottom: 18 }}>{locationsError}</div> : null}
        {pricingError ? <div className="auth-error" style={{ marginBottom: 18 }}>{pricingError}</div> : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Receiver name</span>
            <input name="receiverName" onChange={handleChange} placeholder="Receiver name" required value={form.receiverName} />
          </label>

          <label className="field-group">
            <span>Receiver phone</span>
            <input name="receiverPhone" onChange={handleChange} placeholder="Receiver phone" required value={form.receiverPhone} />
          </label>

          <label className="field-group">
            <span>Receiver email</span>
            <input name="receiverEmail" onChange={handleChange} placeholder="Receiver email" type="email" value={form.receiverEmail} />
          </label>

          <label className="field-group">
            <span>Item type</span>
            <input name="itemType" onChange={handleChange} placeholder="Documents, electronics, apparel..." required value={form.itemType} />
          </label>

          <LocationSelectGroup
            cities={cities}
            disabled={locationsLoading}
            districts={districts}
            helperText="Select the receiver destination to drive same-city, same-district, same-province, or cross-province pricing."
            legend="Receiver destination"
            onChange={handleChange}
            provinces={provinces}
            values={form}
          />

          <label className="field-group">
            <span>Parcel category</span>
            <input name="parcelCategory" onChange={handleChange} placeholder="Parcel" value={form.parcelCategory} />
          </label>

          <label className="field-group">
            <span>Weight (kg)</span>
            <input min="0.1" name="weight" onChange={handleChange} placeholder="Weight in kg" required step="0.1" type="number" value={form.weight} />
          </label>

          <label className="field-group">
            <span>Delivery type</span>
            <select name="deliveryType" onChange={handleChange} value={form.deliveryType}>
              <option value="normal">Normal</option>
              <option value="express">Express</option>
            </select>
          </label>

          <label className="field-group">
            <span>Payment mode</span>
            <select name="paymentMode" onChange={handleChange} value={form.paymentMode}>
              <option value="prepaid">Prepaid</option>
              <option value="cod">COD</option>
            </select>
          </label>

          <label className="field-group">
            <span>COD amount</span>
            <input
              disabled={form.paymentMode !== 'cod'}
              min="0"
              name="codAmount"
              onChange={handleChange}
              placeholder="Cash to collect"
              step="0.01"
              type="number"
              value={form.codAmount}
            />
          </label>

          <label className="field-group">
            <span>Declared value</span>
            <input
              min="0"
              name="declaredValue"
              onChange={handleChange}
              placeholder="Declared parcel value"
              step="0.01"
              type="number"
              value={form.declaredValue}
            />
          </label>

          <label className="field-group">
            <span>Scheduled pickup</span>
            <input name="scheduledPickupAt" onChange={handleChange} type="datetime-local" value={form.scheduledPickupAt} />
          </label>

          <label className="field-group">
            <span>Priority</span>
            <select name="priority" onChange={handleChange} value={form.priority}>
              <option value="standard">Standard</option>
              <option value="priority">Priority</option>
              <option value="critical">Critical</option>
            </select>
          </label>

          <label className="field-group">
            <span>Length (cm)</span>
            <input min="0" name="dimensions.length" onChange={handleChange} step="0.1" type="number" value={form.dimensions.length} />
          </label>

          <label className="field-group">
            <span>Width (cm)</span>
            <input min="0" name="dimensions.width" onChange={handleChange} step="0.1" type="number" value={form.dimensions.width} />
          </label>

          <label className="field-group">
            <span>Height (cm)</span>
            <input min="0" name="dimensions.height" onChange={handleChange} step="0.1" type="number" value={form.dimensions.height} />
          </label>

          <label className="field-group full-span">
            <span>Handling instructions</span>
            <textarea
              name="instructions"
              onChange={handleChange}
              placeholder="Drop-off notes, fragile handling, access instructions..."
              rows="4"
              value={form.instructions}
            />
          </label>

          <div className="pricing-card full-span">
            <span>{getRouteLabel(estimate.routeType)}</span>
            <strong>{formatCurrency(isEstimateReady ? estimate.totalPrice : 0)}</strong>
            <div className="pricing-meta">
              <span>Base: {formatCurrency(estimate.basePrice)}</span>
              <span>Weight charge: {formatCurrency(Number(form.weight || 0) * estimate.perKgRate)}</span>
              <span>Delivery multiplier: {estimate.deliveryMultiplier}x</span>
              <span>COD surcharge: {formatCurrency(estimate.codCharge)}</span>
            </div>
          </div>

          {error ? <div className="auth-error full-span">{error}</div> : null}

          <button
            className="button-primary full-span"
            disabled={loading || locationsLoading || pricingLoading || senderLocationMissing}
            type="submit"
          >
            {loading ? 'Creating shipment...' : 'Create shipment'}
          </button>
        </form>
      </section>
    </PortalShell>
  );
};

export default NewDelivery;
