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



        <section className="auth-card auth-card-wide">
          <span className="auth-eyebrow">Deliver Faster. Track Smarter.</span>
          <h2>Create your NepXpress account.</h2>

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

      </section>


    </div>
  );
};

export default Register;
