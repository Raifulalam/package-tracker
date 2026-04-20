import { useEffect, useMemo, useState } from 'react';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';

const PaymentPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const loadPayments = async () => {
    try {
      const [paymentsRes, shipmentsRes] = await Promise.all([
        api.get('/api/payments', { token: user.token }),
        user.role === 'sender'
          ? api.get('/api/shipments/mine', { token: user.token })
          : user.role === 'receiver'
            ? api.get('/api/shipments/receiver', { token: user.token })
            : user.role === 'admin'
              ? api.get('/api/admin/packages?status=All&page=1&limit=20', { token: user.token })
              : Promise.resolve({ data: [] }),
      ]);

      setPayments(paymentsRes.data || []);
      setShipments(shipmentsRes.data?.shipments || shipmentsRes.data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    const socket = getSocket();
    socket.on('shipments:refresh', loadPayments);
    return () => socket.off('shipments:refresh', loadPayments);
  }, [user.token]);

  const outstandingShipments = useMemo(
    () => shipments.filter((shipment) => shipment.paymentStatus !== 'Paid'),
    [shipments]
  );

  const handlePayClick = async (shipment, method) => {
    setBusyId(`${shipment._id}:${method}`);
    try {
      const response = await api.post(`/api/payments/${shipment._id}/initiate`, { method }, { token: user.token });
      const { url, formData } = response.data;

      if (method === 'Khalti') {
        window.location.href = url; // Natively redirects user to Khalti Gateway
      } else if (method === 'eSewa' && formData) {
        // eSewa requires a POST form submission
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = url;
        form.style.display = 'none';
        
        Object.keys(formData).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = formData[key];
            form.appendChild(input);
        });
        
        document.body.appendChild(form);
        form.submit();
      }
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setBusyId('');
    }
  };

  return (
    <PortalShell
      title="Payment Workspace"
      subtitle="Review payment history, clear outstanding shipment charges, and make sure delivery verification is never blocked by unpaid balances."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="dashboard-grid admin-dashboard-main">
        <article className="glass-card section-card" style={{ gridColumn: 'span 6' }}>
          <div className="admin-section-head">
            <div>
              <h2>Outstanding shipment payments</h2>
              <p>Charges that still need to be paid before final delivery confirmation.</p>
            </div>
          </div>
          {loading ? (
            <div className="empty-state">Loading outstanding payments...</div>
          ) : outstandingShipments.length === 0 ? (
            <div className="empty-state">No outstanding shipment charges.</div>
          ) : (
            <div className="package-stack">
              {outstandingShipments.map((shipment) => (
                <article className="package-item" key={shipment._id}>
                  <div className="package-topline">
                    <strong>{shipment.trackingId}</strong>
                    <StatusBadge status={shipment.paymentStatus} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 12 }}>
                    <span>Package: {shipment.packageType}</span>
                    <span>Receiver: {shipment.receiver?.name}</span>
                    <span>Amount: {formatCurrency(shipment.paymentAmount)}</span>
                  </div>
                  {['sender', 'receiver', 'admin'].includes(user.role) ? (
                    <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                      <button
                        className="button-primary"
                        disabled={busyId === `${shipment._id}:Khalti`}
                        onClick={() => handlePayClick(shipment, 'Khalti')}
                        type="button"
                        style={{ background: 'linear-gradient(135deg, #5C2D91, #3f1e63)' }}
                      >
                        {busyId === `${shipment._id}:Khalti` ? 'Redirecting...' : 'Pay with Khalti'}
                      </button>
                      <button
                        className="button-primary"
                        disabled={busyId === `${shipment._id}:eSewa`}
                        onClick={() => handlePayClick(shipment, 'eSewa')}
                        type="button"
                        style={{ background: 'linear-gradient(135deg, #60BB46, #41822f)' }}
                      >
                        {busyId === `${shipment._id}:eSewa` ? 'Redirecting...' : 'Pay with eSewa'}
                      </button>
                    </div>
                  ) : (
                    <div className="info-banner" style={{ marginTop: 14 }}>
                      Agents can review payment status here but only senders, receivers, and admins can record payment.
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 6' }}>
          <div className="admin-section-head">
            <div>
              <h2>Payment history</h2>
              <p>Recent payment transactions across the shipments visible to your role.</p>
            </div>
          </div>
          {loading ? (
            <div className="empty-state">Loading payment history...</div>
          ) : payments.length === 0 ? (
            <div className="empty-state">No payment history yet.</div>
          ) : (
            <div className="admin-history-list">
              {payments.map((payment) => (
                <div className="admin-history-item" key={payment._id}>
                  <div className="admin-user-item">
                    <span>{payment.trackingId}</span>
                    <StatusBadge status={payment.status} />
                  </div>
                  <strong>{formatCurrency(payment.amount)}</strong>
                  <p>{payment.method}</p>
                  <small>{formatDateTime(payment.createdAt)}</small>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </PortalShell>
  );
};

export default PaymentPage;
