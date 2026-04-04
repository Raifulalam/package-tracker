import { useMemo, useState } from 'react';
import LocationSelectGroup from '../components/LocationSelectGroup';
import PortalShell from '../components/PortalShell';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { useLocations } from '../hooks/useLocations';
import { api } from '../lib/api';

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const districts = useMemo(() => getDistricts(form.province), [form.province, getDistricts]);
  const cities = useMemo(() => getCities(form.province, form.district), [form.province, form.district, getCities]);

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

  return (
    <PortalShell
      title="Account Settings"
      subtitle="Keep your contact details and operating location accurate so dispatch, pricing, and tracking stay reliable."
    >
      <section className="glass-card section-card">
        {locationsError ? <div className="auth-error" style={{ marginBottom: 18 }}>{locationsError}</div> : null}

        <form className="form-grid" onSubmit={handleSubmit}>
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
                : 'Optional for staff accounts, but useful for operations visibility.'
            }
            legend="Structured location"
            onChange={handleChange}
            provinces={provinces}
            required={user?.role === 'sender'}
            values={form}
          />

          {error ? <div className="auth-error full-span">{error}</div> : null}

          <button className="button-primary full-span" disabled={saving || locationsLoading} type="submit">
            {saving ? 'Saving profile...' : 'Save changes'}
          </button>
        </form>
      </section>
    </PortalShell>
  );
};

export default Profile;
