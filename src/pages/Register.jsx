import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LocationSelectGroup from '../components/LocationSelectGroup';
import { useToast } from '../components/ToastProvider';
import { useLocations } from '../hooks/useLocations';
import { api } from '../lib/api';
import './auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { provinces, getDistricts, getCities, loading: locationsLoading, error: locationsError } = useLocations();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    hub: '',
    province: '',
    district: '',
    city: '',
    password: '',
    role: 'sender',
    adminInviteCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      if (name === 'role' && value !== 'admin') {
        nextForm.adminInviteCode = '';
      }

      return nextForm;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/api/auth/register', form);
      showToast('Account created successfully. You can sign in now.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const districts = getDistricts(form.province);
  const cities = getCities(form.province, form.district);

  return (
    <div className="auth-shell">
      <section className="auth-showcase">
        <span className="auth-showcase-badge">Create Workspace</span>
        <h1>Launch a faster, smarter delivery workflow with ParcelOps.</h1>
        <p>
          Create your account, save your operating location, and start using a delivery platform built for dependable service, live tracking, and operational clarity across Nepal.
        </p>

        <div className="auth-showcase-grid">
          <article>
            <strong>Sender accounts</strong>
            <span>Create bookings, review rates, and manage outgoing shipments from one streamlined dashboard.</span>
          </article>
          <article>
            <strong>Receiver accounts</strong>
            <span>Stay updated on incoming parcels with quick access to ETA, status changes, and delivery history.</span>
          </article>
          <article>
            <strong>Agent accounts</strong>
            <span>Handle field operations with rapid status updates and clear visibility into assigned deliveries.</span>
          </article>
          <article>
            <strong>Admin accounts</strong>
            <span>Oversee pricing, dispatch, and service quality from a central logistics control layer.</span>
          </article>
        </div>
      </section>

      <section className="auth-card auth-card-wide">
        <span className="auth-eyebrow">Deliver Faster. Track Smarter.</span>
        <h2>Create your ParcelOps account.</h2>
        <p>Set up your role, save your location details, and get started with a delivery experience built for real operations.</p>

        <form className="auth-form form-grid" onSubmit={handleSubmit}>
          <input
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            name="phone"
            placeholder="Phone number"
            value={form.phone}
            onChange={handleChange}
          />
          <input
            name="hub"
            placeholder="Hub or operating city"
            value={form.hub}
            onChange={handleChange}
          />
          <select name="role" value={form.role} onChange={handleChange} required>
            <option value="sender">Sender</option>
            <option value="receiver">Receiver</option>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          {form.role === 'admin' ? (
            <input
              name="adminInviteCode"
              type="password"
              placeholder="Admin invite code"
              value={form.adminInviteCode}
              onChange={handleChange}
            />
          ) : null}
          <LocationSelectGroup
            cities={cities}
            disabled={locationsLoading}
            districts={districts}
            helperText={
              form.role === 'sender'
                ? 'Sender accounts must store a valid Nepal origin location for route-based pricing.'
                : form.role === 'receiver'
                  ? 'Receiver accounts can save a verified city profile to match incoming deliveries more reliably.'
                  : 'You can also save a structured operating location for this account.'
            }
            legend="Account location"
            onChange={handleChange}
            provinces={provinces}
            required={form.role === 'sender'}
            values={form}
          />
          {!locationsLoading && !locationsError && provinces.length === 0 ? (
            <div className="auth-error full-span">
              No location data was returned by the backend. Check the API connection before signing up.
            </div>
          ) : null}
          {locationsError ? <div className="auth-error full-span">{locationsError}</div> : null}
          {error ? <div className="auth-error full-span">{error}</div> : null}
          <button
            className="button-primary full-span"
            disabled={loading || locationsLoading || (form.role === 'sender' && provinces.length === 0)}
            type="submit"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already onboarded? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
};

export default Register;
