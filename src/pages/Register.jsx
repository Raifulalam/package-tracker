import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import './auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    hub: '',
    password: '',
    role: 'sender',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/api/auth/register', form);
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <span className="auth-eyebrow">Create Workspace Access</span>
        <h2>Build a modern parcel operation from one control room.</h2>
        <p>Register a sender, field agent, or admin account and start managing live delivery workflows.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
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
          {error ? <div className="auth-error">{error}</div> : null}
          <button className="button-primary" disabled={loading} type="submit">
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
