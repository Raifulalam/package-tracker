import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import { useToast } from '../components/ToastProvider';

const PaymentVerification = () => {
  const { method } = useParams(); // 'esewa' or 'khalti'
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [status, setStatus] = useState('Verifying your payment...');
  const verifyRef = useRef(false);

  useEffect(() => {
    if (verifyRef.current) return;
    verifyRef.current = true;

    const verifyQuery = async () => {
      // Provide an early local hook escape if manually declined by provider parameter
      if (searchParams.get('status') === 'failed' || searchParams.get('status') === 'Canceled') {
        showToast(`Payment via ${method} failed or was cancelled.`, 'error');
        navigate('/payments', { replace: true });
        return;
      }

      try {
        const queryStr = searchParams.toString();
        const response = await fetch(`http://localhost:5000/api/payments/verify/${method}?${queryStr}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('Payment Successful!');
          showToast(`Successfully verified your ${method} payment.`, 'success');
          setTimeout(() => navigate(data.data?.shipmentId ? `/shipments/${data.data.shipmentId}` : '/payments', { replace: true }), 2000);
        } else {
          setStatus('Verification failed');
          showToast(data.message || 'Payment Verification failed on backend side', 'error');
          setTimeout(() => navigate('/payments', { replace: true }), 3000);
        }
      } catch (err) {
        setStatus('Server unreachable. Could not verify payment.');
        showToast(err.message, 'error');
      }
    };

    verifyQuery();
  }, [method, searchParams, navigate, showToast]);

  return (
    <PortalShell title="Verifying Payment" subtitle="Please wait while we confirm your transaction securely.">
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '64px' }}>
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
          
          <div style={{ 
            display: 'inline-flex', width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-3)', 
            alignItems: 'center', justifyContent: 'center', marginBottom: '24px'
          }}>
            {status.includes('Verified') || status.includes('Successful') ? (
              <svg style={{ width: 32, height: 32, color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : status.includes('failed') || status.includes('unreachable') ? (
              <svg style={{ width: 32, height: 32, color: 'var(--danger)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
                <div style={{ 
                  width: 28, height: 28, border: '4px solid var(--ink-300)', borderTopColor: 'var(--accent-600)', 
                  borderRadius: '50%', animation: 'spin 1s linear infinite' 
                }} />
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>

          <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
            {status}
          </h2>
          <p style={{ color: 'var(--ink-500)', fontSize: '0.9rem' }}>
            {method ? method.charAt(0).toUpperCase() + method.slice(1) : ''} processing
          </p>

        </div>
      </div>
    </PortalShell>
  );
};

export default PaymentVerification;
