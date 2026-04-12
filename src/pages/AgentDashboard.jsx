import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';
import { agentProgressionStatuses } from '../lib/shipment';

const emptyDashboard = {
  isAvailable: false,
  stats: { total: 0, assigned: 0, inTransit: 0, delivered: 0 },
  shipments: [],
};

const AgentDashboard = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [verifyModal, setVerifyModal] = useState({ open: false, shipment: null, otp: '' });

  const loadDashboard = async () => {
    try {
      const response = await api.get('/api/agent/dashboard', { token: user.token });
      setDashboard(response.data || emptyDashboard);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const socket = getSocket();
    socket.on('shipments:refresh', loadDashboard);
    socket.on('agents:availability', ({ agentId, isAvailable }) => {
      if (String(agentId) === String(user.id || user._id)) {
        updateUser({ isAvailable });
      }
    });

    return () => {
      socket.off('shipments:refresh', loadDashboard);
      socket.off('agents:availability');
    };
  }, [user.token]);

  const filteredShipments = useMemo(
    () => dashboard.shipments.filter((shipment) => statusFilter === 'All' || shipment.status === statusFilter),
    [dashboard.shipments, statusFilter]
  );

  const toggleAvailability = async () => {
    setBusyKey('availability');
    try {
      const nextAvailability = !dashboard.isAvailable;
      const response = await api.patch('/api/agent/availability', { isAvailable: nextAvailability }, { token: user.token });
      setDashboard((current) => ({ ...current, isAvailable: response.data.isAvailable }));
      updateUser({ isAvailable: response.data.isAvailable });
      showToast(nextAvailability ? 'You are now online and assignable.' : 'You are now offline.', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const updateStatus = async (shipmentId, status) => {
    setBusyKey(`${shipmentId}:${status}`);
    try {
      await api.put(`/api/shipments/${shipmentId}/status`, { status }, { token: user.token });
      showToast(`Shipment moved to ${status}.`, 'success');
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const submitOtpVerification = async (e) => {
    e.preventDefault();
    if (!verifyModal.shipment) return;
    
    setBusyKey(`verify:${verifyModal.shipment._id}`);
    try {
      await api.post(`/api/shipments/${verifyModal.shipment._id}/verify-delivery`, 
        { otp: verifyModal.otp }, 
        { token: user.token }
      );
      showToast('Delivery verified successfully!', 'success');
      setVerifyModal({ open: false, shipment: null, otp: '' });
      await loadDashboard();
    } catch (err) {
      showToast(err.message || 'Invalid OTP', 'error');
    } finally {
      setBusyKey('');
    }
  };

  const cards = [
    ['Assigned', dashboard.stats.assigned || 0, 'info'],
    ['In Transit', dashboard.stats.inTransit || 0, 'info'],
    ['Delivered', dashboard.stats.delivered || 0, 'success'],
    ['Availability', dashboard.isAvailable ? 'Online' : 'Offline', dashboard.isAvailable ? 'success' : 'danger'],
  ];

  return (
    <PortalShell
      title="Delivery Agent Dashboard"
      subtitle="Go online for assignments, update shipment progress live, and use OTP verification before marking a delivery as complete."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="dashboard-grid" style={{ marginBottom: '24px' }}>
        {cards.map(([label, value, tone]) => (
          <article className="card" key={label} style={{ gridColumn: 'span 3', borderLeft: `4px solid var(--${tone})` }}>
            <small style={{ fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</small>
            <strong style={{ display: 'block', fontSize: '2rem', marginTop: '8px' }}>{loading ? '...' : value}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="card" style={{ gridColumn: 'span 3' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Controls</h3>
            <button className={dashboard.isAvailable ? 'button-danger' : 'button-primary'} disabled={busyKey === 'availability'} onClick={toggleAvailability} type="button">
              {busyKey === 'availability' ? 'Updating...' : dashboard.isAvailable ? 'Go Offline' : 'Go Online'}
            </button>
            <select className="form-select" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <option value="All">All statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="Picked Up">Picked Up</option>
              <option value="In Transit">In Transit</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
            </select>
            <Link className="button-secondary" to="/payments" style={{ textAlign: 'center' }}>Payment board</Link>
          </div>
        </article>

        <article className="card" style={{ gridColumn: 'span 9' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Assigned Deliveries</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--ink-500)' }}>Update pickup, transit, and last-mile status in real time.</p>
          </div>

          {loading ? (
            <div className="empty-state">Loading assigned deliveries...</div>
          ) : filteredShipments.length === 0 ? (
            <div className="empty-state">No deliveries match the current filter.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredShipments.map((shipment) => (
                <div key={shipment._id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', backgroundColor: 'var(--surface-0)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>{shipment.trackingId}</strong>
                      <p style={{ margin: '4px 0 0', color: 'var(--ink-500)' }}>Receiver: {shipment.receiver?.name}</p>
                    </div>
                    <StatusBadge status={shipment.status} />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '0.9rem', color: 'var(--ink-700)' }}>
                    <div><strong>Pickup:</strong> {shipment.pickupAddress}</div>
                    <div><strong>Delivery:</strong> {shipment.deliveryAddress}</div>
                    <div><strong>Charge:</strong> {formatCurrency(shipment.paymentAmount)}</div>
                    <div><strong>Payment:</strong> {shipment.paymentStatus}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                    {agentProgressionStatuses.map((status) => {
                      const isDisabled = busyKey === `${shipment._id}:${status}` || shipment.status === status || shipment.status === 'Cancelled' || shipment.status === 'Delivered';
                      if (shipment.status === 'Delivered' || shipment.status === 'Cancelled') return null;
                      
                      return (
                        <button
                          className="button-secondary"
                          disabled={isDisabled}
                          key={status}
                          onClick={() => updateStatus(shipment._id, status)}
                          type="button"
                        >
                          {busyKey === `${shipment._id}:${status}` ? 'Updating...' : `Mark ${status}`}
                        </button>
                      );
                    })}
                    
                    {shipment.status === 'Out for Delivery' && (
                      <button 
                        className="button-primary"
                        onClick={() => setVerifyModal({ open: true, shipment, otp: '' })}
                        type="button"
                      >
                        Verify Delivery (OTP)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {/* OTP Verification Modal */}
      {verifyModal.open && verifyModal.shipment && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: '#fff' }}>
            <h3 style={{ margin: '0 0 8px' }}>Verify Delivery</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--ink-500)', fontSize: '0.9rem' }}>
              Ask the receiver for the OTP to confirm delivery of <strong>{verifyModal.shipment.trackingId}</strong>.
            </p>
            
            <form onSubmit={submitOtpVerification} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                type="text" 
                placeholder="Enter Delivery OTP" 
                value={verifyModal.otp} 
                onChange={e => setVerifyModal(prev => ({ ...prev, otp: e.target.value }))}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px' }}
                required 
                autoFocus
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="button-ghost" onClick={() => setVerifyModal({ open: false, shipment: null, otp: '' })}>
                  Cancel
                </button>
                <button type="submit" className="button-primary" disabled={busyKey.startsWith('verify') || !verifyModal.otp}>
                  {busyKey.startsWith('verify') ? 'Verifying...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalShell>
  );
};

export default AgentDashboard;
