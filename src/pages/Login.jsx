import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { roleHome } from '../lib/shipment';
import './auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', form);
      login(response);
      showToast(`Welcome back, ${response.user.name}.`, 'success');
      navigate(roleHome(response.user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-showcase">
        <span className="auth-showcase-badge">NexExpree access</span>
        <h1>Run courier operations with live visibility and verified delivery.</h1>
        <p>Sign in as an admin, sender, receiver, or delivery agent to manage the full NexExpree workflow in real time.</p>

        <div className="auth-showcase-grid">
          <article>
            <strong>Role-based control</strong>
            <span>Separate workspaces for control center, senders, receivers, and field agents.</span>
          </article>
          <article>
            <strong>Realtime updates</strong>
            <span>Shipment status, agent availability, assignments, and notifications update without reloads.</span>
          </article>
        </div>

        <section className="auth-card">
          <span className="auth-eyebrow">Secure login</span>
          <h2>Welcome back to NexExpree.</h2>
          <p>Use your role account to continue managing deliveries, payment status, verification, and tracking.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              name="email"
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Work email"
              type="email"
              value={form.email}
              required
            />
            <input
              name="password"
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Password"
              type="password"
              value={form.password}
              required
            />
            {error ? <div className="auth-error">{error}</div> : null}
            <button className="button-primary" disabled={loading} type="submit">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="auth-footer">
            Need an account? <Link to="/register">Create one</Link>
          </p>
        </section>
      </section>
    </div>
  );
};

export default Login;
