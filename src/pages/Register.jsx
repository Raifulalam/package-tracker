import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { api } from '../lib/api';
import './auth.css';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: 'Nepal',
  hub: '',
  password: '',
  role: 'sender',
  adminInviteCode: '',
};

const Register = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'role' && value !== 'admin' ? { adminInviteCode: '' } : {}),
    }));
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

  return (
    <div className="auth-shell">
      <section className="auth-showcase">
        <span className="auth-showcase-badge">Create account</span>
        <h1>Set up a NexExpree workspace in minutes.</h1>
        <p>Create a sender, receiver, delivery agent, or admin account with the profile details needed for tracking, handoff verification, and live notifications.</p>

        <section className="auth-card auth-card-wide">
          <span className="auth-eyebrow">Onboarding</span>
          <h2>Create your NexExpree account.</h2>
          <p>Fill in the contact and location details that will be used for shipment creation, matching, assignments, and delivery confirmation.</p>

          <form className="auth-form form-grid" onSubmit={handleSubmit}>
            <input name="name" onChange={handleChange} placeholder="Full name" value={form.name} required />
            <input name="email" onChange={handleChange} placeholder="Email address" type="email" value={form.email} required />
            <input name="phone" onChange={handleChange} placeholder="Phone number" value={form.phone} />
            <select name="role" onChange={handleChange} value={form.role}>
              <option value="sender">Sender</option>
              <option value="agent">Delivery Agent</option>
              <option value="admin">Admin</option>
            </select>
            <input className="full-span" name="address" onChange={handleChange} placeholder="Street address" value={form.address} />
            <input name="city" onChange={handleChange} placeholder="City" value={form.city} />
            <input name="state" onChange={handleChange} placeholder="State / region" value={form.state} />
            <input name="country" onChange={handleChange} placeholder="Country" value={form.country} />
            <input name="hub" onChange={handleChange} placeholder="Hub / operating zone" value={form.hub} />
            <input name="password" onChange={handleChange} placeholder="Password" type="password" value={form.password} required />
            {form.role === 'admin' ? (
              <input
                className="full-span"
                name="adminInviteCode"
                onChange={handleChange}
                placeholder="Admin invite code"
                type="password"
                value={form.adminInviteCode}
              />
            ) : null}
            {error ? <div className="auth-error full-span">{error}</div> : null}
            <button className="button-primary full-span" disabled={loading} type="submit">
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
