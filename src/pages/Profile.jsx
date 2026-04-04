import { useEffect, useMemo, useState } from 'react';
import LocationSelectGroup from '../components/LocationSelectGroup';
import PortalShell from '../components/PortalShell';
import PricingEditor from '../components/PricingEditor';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { useLocations } from '../hooks/useLocations';
import { api } from '../lib/api';

const defaultPricing = {
  sameCity: 0,
  sameDistrict: 0,
  sameProvince: 0,
  differentProvince: 0,
  perKgRate: 0,
  expressMultiplier: 1,
  codCharge: 0,
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const { provinces, getDistricts, getCities, loading: locationsLoading, error: locationsError } = useLocations();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    hub: user?.hub || '',
    province: user?.province || '',
    district: user?.district || '',
    city: user?.city || '',
  });
  const [pricing, setPricing] = useState(defaultPricing);
  const [saving, setSaving] = useState(false);
  const [pricingBusy, setPricingBusy] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(user?.role === 'admin');
  const [error, setError] = useState('');
  const [pricingError, setPricingError] = useState('');

  const districts = useMemo(() => getDistricts(form.province), [form.province, getDistricts]);
  const cities = useMemo(() => getCities(form.province, form.district), [form.province, form.district, getCities]);

  useEffect(() => {
    if (user?.role !== 'admin') return undefined;

    let active = true;

    const loadPricing = async () => {
      try {
        const response = await api.get('/api/pricing', { token: user.token });
        if (active) setPricing(response.data || defaultPricing);
      } catch (err) {
        if (active) setPricingError(err.message);
      } finally {
        if (active) setPricingLoading(false);
      }
    };

    loadPricing();

    return () => {
      active = false;
    };
  }, [user?.role, user?.token]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => {
      const nextForm = { ...prev, [name]: value };

      if (name === 'province') {
        nextForm.district = '';
        nextForm.city = '';
      }

      if (name === 'district') {
        nextForm.city = '';
      }

      return nextForm;
    });
  };

  const updatePricingField = (event) => {
    const { name, value } = event.target;
    setPricing((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await api.put('/api/auth/profile', form, { token: user.token });
      updateUser(response.data);
      showToast('Profile updated successfully.', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const savePricing = async (event) => {
    event.preventDefault();
    setPricingBusy(true);
    setPricingError('');

    try {
      const response = await api.put('/api/pricing', pricing, { token: user.token });
      setPricing(response.data);
      showToast('Pricing settings updated successfully.', 'success');
    } catch (err) {
      setPricingError(err.message);
    } finally {
      setPricingBusy(false);
    }
  };

  const profileMetrics = [
    ['Account role', user?.role || 'workspace'],
    ['Email address', user?.email || 'Not available'],
    ['Primary hub', form.hub || 'Not set'],
    ['Service city', form.city || 'Not set'],
  ];

  return (
    <PortalShell
      title="Settings"
      subtitle="Manage account details, operating location, and admin controls from one professional settings workspace."
    >
      <section className="dashboard-grid">
        <article className="glass-card section-card settings-summary-card" style={{ gridColumn: 'span 8' }}>
          <div className="settings-head">
            <div>
              <h2>Profile Settings</h2>
              <p>Keep your account details accurate so dispatch, pricing, assignment, and tracking remain reliable.</p>
            </div>
            <div className="settings-role-chip">{user?.role || 'workspace'}</div>
          </div>

          <div className="settings-summary-grid">
            {profileMetrics.map(([label, value]) => (
              <div className="settings-summary-item" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card section-card settings-support-card" style={{ gridColumn: 'span 4' }}>
          <h2>Account Guidance</h2>
          <div className="settings-support-list">
            <div className="settings-support-item">
              <strong>Contact accuracy</strong>
              <p>Use the same phone number you share with senders, receivers, and operations staff.</p>
            </div>
            <div className="settings-support-item">
              <strong>Location visibility</strong>
              <p>Set your province, district, and city correctly so pricing and service coverage stay accurate.</p>
            </div>
            <div className="settings-support-item">
              <strong>Admin controls</strong>
              <p>Admin accounts can also manage network pricing settings from this page.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-grid" style={{ marginTop: 18 }}>
        <article className="glass-card section-card settings-profile-card" style={{ gridColumn: user?.role === 'admin' ? 'span 8' : 'span 12' }}>
          {locationsError ? <div className="auth-error" style={{ marginBottom: 18 }}>{locationsError}</div> : null}

          <div className="settings-head compact">
            <div>
              <h2>Personal Details</h2>
              <p>Update your contact information and base location used across ParcelOps.</p>
            </div>
          </div>

          <form className="form-grid settings-form-grid" onSubmit={handleSubmit}>
            <label className="field-group">
              <span>Full name</span>
              <input name="name" onChange={handleChange} required value={form.name} />
            </label>

            <label className="field-group">
              <span>Phone number</span>
              <input name="phone" onChange={handleChange} value={form.phone} />
            </label>

            <label className="field-group full-span">
              <span>Hub or operating city</span>
              <input name="hub" onChange={handleChange} value={form.hub} />
            </label>

            <LocationSelectGroup
              cities={cities}
              disabled={locationsLoading}
              districts={districts}
              helperText={
                user?.role === 'sender'
                  ? 'Sender accounts must keep a valid Nepal location so route pricing can be calculated correctly.'
                  : user?.role === 'receiver'
                    ? 'Receiver accounts can keep a valid city profile here to improve parcel matching and status updates.'
                    : user?.role === 'admin'
                      ? 'Admin accounts should keep an accurate base city for visibility across the operations network.'
                      : 'Optional for field staff, but useful for planning and operational visibility.'
              }
              legend="Structured location"
              onChange={handleChange}
              provinces={provinces}
              required={user?.role === 'sender'}
              values={form}
            />

            {error ? <div className="auth-error full-span">{error}</div> : null}

            <button className="button-primary full-span" disabled={saving || locationsLoading} type="submit">
              {saving ? 'Saving profile...' : 'Save profile changes'}
            </button>
          </form>
        </article>

        {user?.role === 'admin' ? (
          <div className="settings-pricing-column" style={{ gridColumn: 'span 4' }}>
            {pricingError ? <div className="auth-error" style={{ marginBottom: 18 }}>{pricingError}</div> : null}
            <PricingEditor
              disabled={false}
              loading={pricingBusy || pricingLoading}
              onChange={updatePricingField}
              onSubmit={savePricing}
              pricing={pricing}
            />
          </div>
        ) : null}
      </section>
    </PortalShell>
  );
};

export default Profile;
