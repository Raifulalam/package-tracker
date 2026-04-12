import { useState } from 'react';
import PortalShell from '../components/PortalShell';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    country: user?.country || 'Nepal',
    hub: user?.hub || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
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
      title="Profile Settings"
      subtitle="Keep your contact, location, and operating details accurate so assignments, receiver matching, notifications, and pricing stay reliable across NexExpree."
    >
      <section className="dashboard-grid">
        <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
          <div className="settings-head">
            <div>
              <h2>Account details</h2>
              <p>Update the profile fields used across shipment creation, receiver matching, and agent routing.</p>
            </div>
            <div className="settings-role-chip">{user?.role}</div>
          </div>

          <form className="form-grid settings-form-grid" onSubmit={handleSubmit}>
            <label className="field-group">
              <span>Full name</span>
              <input name="name" onChange={handleChange} value={form.name} required />
            </label>
            <label className="field-group">
              <span>Phone</span>
              <input name="phone" onChange={handleChange} value={form.phone} />
            </label>
            <label className="field-group full-span">
              <span>Address</span>
              <input name="address" onChange={handleChange} value={form.address} />
            </label>
            <label className="field-group">
              <span>City</span>
              <input name="city" onChange={handleChange} value={form.city} />
            </label>
            <label className="field-group">
              <span>State / region</span>
              <input name="state" onChange={handleChange} value={form.state} />
            </label>
            <label className="field-group">
              <span>Country</span>
              <input name="country" onChange={handleChange} value={form.country} />
            </label>
            <label className="field-group">
              <span>Hub / operating zone</span>
              <input name="hub" onChange={handleChange} value={form.hub} />
            </label>
            {error ? <div className="auth-error full-span">{error}</div> : null}
            <button className="button-primary full-span" disabled={saving} type="submit">
              {saving ? 'Saving profile...' : 'Save profile'}
            </button>
          </form>
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
          <h2>Profile guidance</h2>
          <div className="settings-support-list">
            <div className="settings-support-item">
              <strong>Sender</strong>
              <p>Profile details prefill new shipment forms and outgoing communication.</p>
            </div>
            <div className="settings-support-item">
              <strong>Receiver</strong>
              <p>Phone and email help NexExpree match inbound deliveries and verification notices to the right account.</p>
            </div>
            <div className="settings-support-item">
              <strong>Agent</strong>
              <p>Your hub and city help admins understand local coverage when assigning online couriers.</p>
            </div>
          </div>
        </article>
      </section>
    </PortalShell>
  );
};

export default Profile;
