import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import QRCodeCard from '../components/QRCodeCard';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';

const agentNextStatuses = ['Picked Up', 'In Transit', 'Out for Delivery'];

const TrackDelivery = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [verification, setVerification] = useState({ otp: '', qrToken: '', paymentMethod: 'eSewa' });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');

  const loadShipment = async () => {
    try {
      const response = await api.get(`/api/shipments/${id}`, { token: user.token });
      setShipment(response.data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      await loadShipment();
      if (!active) return;
    };

    bootstrap();

    const socket = getSocket();
    const refresh = ({ shipmentId }) => {
      if (!shipmentId || shipmentId === id) {
        loadShipment();
      }
    };
    socket.on('shipments:refresh', refresh);

    return () => {
      active = false;
      socket.off('shipments:refresh', refresh);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [id, user.token]);

  const updateStatus = async (status) => {
    setBusyKey(status);
    try {
      await api.put(`/api/shipments/${id}/status`, { status }, { token: user.token });
      showToast(`Shipment moved to ${status}.`, 'success');
      await loadShipment();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const verifyDelivery = async (mode) => {
    setBusyKey(`verify-${mode}`);
    try {
      await api.post(
        `/api/shipments/${id}/verify-delivery`,
        {
          otp: verification.otp,
          qrToken: verification.qrToken,
        },
        { token: user.token }
      );
      showToast('Delivery verified successfully.', 'success');
      setVerification((current) => ({ ...current, otp: '', qrToken: '' }));
      await loadShipment();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const payShipment = async () => {
    setBusyKey('payment');
    try {
      if (['eSewa', 'Khalti'].includes(verification.paymentMethod)) {
        const response = await api.post(`/api/payments/${id}/initiate`, {
          method: verification.paymentMethod
        }, { token: user.token });
        
        const gatewayData = response.data;
        if (verification.paymentMethod === 'Khalti') {
          window.location.href = gatewayData.url;
        } else if (verification.paymentMethod === 'eSewa') {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = gatewayData.url;
          Object.keys(gatewayData.formData).forEach(key => {
            const hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.name = key;
            hiddenField.value = gatewayData.formData[key];
            form.appendChild(hiddenField);
          });
          document.body.appendChild(form);
          form.submit();
        }
      } else {
        await api.post(
          `/api/payments/${id}/pay`,
          { method: verification.paymentMethod, outcome: 'success', note: 'Paid via Bank/QR' },
          { token: user.token }
        );
        showToast('Payment completed successfully via Bank.', 'success');
        await loadShipment();
        setBusyKey('');
      }
    } catch (err) {
      setError(err.message);
      setBusyKey('');
    }
  };

  const requestOtpDispatch = async () => {
    setBusyKey('send-otp');
    try {
      await api.post(`/api/shipments/${id}/send-otp`, {}, { token: user.token });
      showToast("OTP has been dispatched securely to the receiver's email.", 'success');
    } catch (err) {
      showToast(err.message || 'Failed to dispatch OTP to receiver.', 'error');
    } finally {
      setBusyKey('');
    }
  };

  const stopScanner = () => {
    setScannerOpen(false);
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startScanner = async () => {
    try {
      setScannerError('');

      if (!('BarcodeDetector' in window)) {
        setScannerError('This browser does not support the native QR scanner. Paste the QR token manually instead.');
        return;
      }

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });

      streamRef.current = stream;
      setScannerOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const scanFrame = async () => {
        if (!videoRef.current || !streamRef.current) return;

        try {
          const codes = await detector.detect(videoRef.current);
          if (codes?.length) {
            setVerification((current) => ({ ...current, qrToken: codes[0].rawValue || '' }));
            stopScanner();
            return;
          }
        } catch {
          setScannerError('Unable to read the QR code from the camera feed yet.');
        }

        frameRef.current = requestAnimationFrame(scanFrame);
      };

      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      setScannerError(err.message || 'Unable to open the camera scanner.');
      stopScanner();
    }
  };

  const canPay = ['sender', 'receiver', 'admin', 'agent'].includes(user.role) && shipment?.paymentStatus !== 'Paid';
  const canOperate = ['agent', 'admin'].includes(user.role);
  const canVerify = ['receiver', 'agent', 'admin'].includes(user.role) && shipment?.status === 'Out for Delivery';

  return (
    <PortalShell
      title="Shipment Timeline"
      subtitle="Open a single delivery record for payment status, realtime tracking, assignment details, QR verification, OTP confirmation, and final handoff activity."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      {loading ? (
        <div className="empty-state">Loading shipment record...</div>
      ) : !shipment ? (
        <div className="empty-state">Shipment not found.</div>
      ) : (
        <>
          <section className="dashboard-grid">
            <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
              <div className="package-topline">
                <div>
                  <strong>{shipment.trackingId}</strong>
                  <p style={{ margin: '8px 0 0' }}>{shipment.packageType}</p>
                </div>
                <StatusBadge status={shipment.status} />
              </div>

              <div className="admin-modal-grid" style={{ marginTop: 18 }}>
                <div><strong>Sender</strong><span>{shipment.sender?.name}</span></div>
                <div><strong>Receiver</strong><span>{shipment.receiver?.name}</span></div>
                <div><strong>Pickup</strong><span>{shipment.pickupAddress}</span></div>
                <div><strong>Delivery</strong><span>{shipment.deliveryAddress}</span></div>
                <div><strong>Weight</strong><span>{shipment.weight} kg</span></div>
                <div><strong>Payment</strong><span>{shipment.paymentStatus}</span></div>
                <div><strong>Amount</strong><span>{formatCurrency(shipment.paymentAmount)}</span></div>
                <div><strong>Agent</strong><span>{shipment.assignedAgent?.name || 'Unassigned'}</span></div>
              </div>

              <section className="sheet-panel" style={{ marginTop: 20 }}>
                <h3 style={{ marginTop: 0 }}>Timeline</h3>
                <div className="timeline">
                  {shipment.timeline?.map((item, index) => (
                    <div className="timeline-row" key={`${item.status}-${index}`}>
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <strong>{item.label || item.status}</strong>
                        <small>{formatDateTime(item.timestamp)}</small>
                        <p>{item.note || 'Event logged.'}</p>
                        {item.location ? <small>{item.location}</small> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </article>

            <aside className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
              <div className="workspace-action-list">
                {canPay ? (
                  <>
                    <div className="field-group">
                      <span>Payment method</span>
                      <select
                        name="paymentMethod"
                        onChange={(event) => setVerification((current) => ({ ...current, paymentMethod: event.target.value }))}
                        value={verification.paymentMethod}
                      >
                        <option value="eSewa">eSewa</option>
                        <option value="Khalti">Khalti</option>
                        <option value="Bank Transfer">Bank Deposit / QR</option>
                      </select>
                    </div>
                    <button className="button-primary" disabled={busyKey === 'payment'} onClick={payShipment} type="button">
                      {busyKey === 'payment' ? 'Processing payment...' : `Pay ${formatCurrency(shipment.paymentAmount)}`}
                    </button>
                  </>
                ) : null}

                {canOperate ? (
                  <>
                    <h3 style={{ marginBottom: 0 }}>Agent / admin actions</h3>
                    {agentNextStatuses.map((status) => (
                      <button
                        className="button-secondary"
                        disabled={busyKey === status || shipment.status === status || shipment.status === 'Delivered' || shipment.status === 'Cancelled'}
                        key={status}
                        onClick={() => updateStatus(status)}
                        type="button"
                      >
                        {busyKey === status ? 'Updating...' : status}
                      </button>
                    ))}
                  </>
                ) : null}

                {canVerify ? (
                  <>
                    <h3 style={{ marginBottom: 0 }}>Delivery verification</h3>
                    <div className="field-group">
                      <span>OTP</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          onChange={(event) => setVerification((current) => ({ ...current, otp: event.target.value }))}
                          placeholder="Enter receiver OTP"
                          value={verification.otp}
                          style={{ flex: 1 }}
                        />
                        <button 
                          className="button-secondary" 
                          disabled={busyKey === 'send-otp' || shipment.paymentStatus !== 'Paid'} 
                          onClick={requestOtpDispatch} 
                          type="button"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {busyKey === 'send-otp' ? 'Sending...' : 'Send OTP'}
                        </button>
                      </div>
                    </div>
                    <button className="button-primary" disabled={busyKey === 'verify-otp' || shipment.paymentStatus !== 'Paid'} onClick={() => verifyDelivery('otp')} type="button">
                      {busyKey === 'verify-otp' ? 'Verifying OTP...' : 'Verify with OTP'}
                    </button>
                    <div className="field-group">
                      <span>QR token</span>
                      <input
                        onChange={(event) => setVerification((current) => ({ ...current, qrToken: event.target.value }))}
                        placeholder="Scan or paste QR token"
                        value={verification.qrToken}
                      />
                    </div>
                    <button className="button-secondary" onClick={startScanner} type="button">
                      Scan QR with camera
                    </button>
                    <button className="button-primary" disabled={busyKey === 'verify-qr' || shipment.paymentStatus !== 'Paid'} onClick={() => verifyDelivery('qr')} type="button">
                      {busyKey === 'verify-qr' ? 'Verifying QR...' : 'Verify with QR'}
                    </button>
                    <QRCodeCard label="Current delivery QR" value={shipment.qrToken} />
                    {shipment.paymentStatus !== 'Paid' ? (
                      <div className="info-banner">Payment must be completed before the delivery can be confirmed.</div>
                    ) : null}
                  </>
                ) : null}

                {shipment.status === 'Delivered' ? (
                  <div className="info-banner">
                    Delivered on {formatDateTime(shipment.deliveredAt)} using {shipment.verificationMethod?.toUpperCase() || 'verified handoff'}.
                  </div>
                ) : null}
              </div>
            </aside>
          </section>

          {scannerOpen ? (
            <div className="modal-overlay" role="presentation">
              <div className="modal-card">
                <h3>Scan delivery QR</h3>
                <p>Point the camera at the receiver QR code to fill the verification token automatically.</p>
                <video className="scanner-video" muted playsInline ref={videoRef} />
                {scannerError ? <div className="auth-error">{scannerError}</div> : null}
                <div className="modal-actions">
                  <button className="button-ghost" onClick={stopScanner} type="button">Close scanner</button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </PortalShell>
  );
};

export default TrackDelivery;
