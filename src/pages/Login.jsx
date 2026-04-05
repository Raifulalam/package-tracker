import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import './auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
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
      const response = await api.post('/api/auth/login', form);
      login(response);
      showToast(`Welcome back, ${response.user.name}.`, 'success');

      if (response.user.role === 'admin') navigate('/admin');
      else if (response.user.role === 'receiver') navigate('/receiver');
      else if (response.user.role === 'agent') navigate('/agent');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-showcase">


        <div className="auth-showcase-grid">
          <section className="auth-card">
            <span className="auth-eyebrow">Deliver Faster. Track Smarter.</span>
            <h2>Welcome back to NepXpress.</h2>
            <p>Sign in to manage shipments, coordinate deliveries, and monitor live parcel activity with confidence.</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <input
                name="email"
                type="email"
                placeholder="Work email"
                value={form.email}
                onChange={handleChange}
                required
              />
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
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="auth-footer">
              New to the platform? <Link to="/register">Create an account</Link>
            </p>
          </section>
        </div>
      </section>


    </div>
  );
};

export default Login;
