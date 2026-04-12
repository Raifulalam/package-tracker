import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../components/ToastProvider';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('Verifying...');
  const called = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('Invalid verification link.');
      return;
    }

    if (called.current) return;
    called.current = true;

    api
      .post('/api/auth/verify-email', { token })
      .then((res) => {
        showToast(res.message || 'Email verified successfully! You can now log in.', 'success');
        navigate('/login');
      })
      .catch((err) => {
        setStatus(err.message || 'Verification failed. This link may have expired.');
      });
  }, [token, navigate, showToast]);

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>Email Verification</h2>
        <p>{status}</p>
        <button className="button-ghost" onClick={() => navigate('/login')} style={{ marginTop: '20px' }} type="button">
          Return to login
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
