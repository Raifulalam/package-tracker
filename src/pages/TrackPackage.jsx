import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';
import './auth.css';

const TrackPackage = () => {
  const [searchParams] = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get('tracking') || '');
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTracking = useCallback(async (value = trackingId) => {
    if (!value.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/api/shipments/track/${encodeURIComponent(value.trim())}`);
      setShipment(response.data);
    } catch (err) {
      setShipment(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [trackingId]);

  useEffect(() => {
    const seededTracking = searchParams.get('tracking');
    if (seededTracking) {
      loadTracking(seededTracking);
    }
  }, [loadTracking, searchParams]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = ({ trackingId: nextTrackingId }) => {
      if (nextTrackingId && nextTrackingId === shipment?.trackingId) {
        loadTracking(nextTrackingId);
      }
    };

    socket.on('shipments:refresh', refresh);
    return () => socket.off('shipments:refresh', refresh);
  }, [loadTracking, shipment?.trackingId]);

  return (
    <div className="auth-shell tracking-shell">
      <section className="auth-showcase">
        <span className="auth-showcase-badge">Public tracking</span>
        <h1>Track every NexExpree shipment in real time.</h1>
        <p>Look up a tracking ID to see live shipment status, route addresses, assignment state, payment status, and the full timeline of delivery events.</p>

        <section className="auth-card auth-card-wide tracking-card">
          <span className="auth-eyebrow">Tracking lookup</span>
          <h2>Find a shipment.</h2>
          <p>Enter a NexExpree tracking ID to open the public view for that delivery.</p>

          <div className="tracking-search">
            <input
              onChange={(event) => setTrackingId(event.target.value)}
              placeholder="Enter tracking ID, for example NEX-20260410-AB12CD34"
              value={trackingId}
            />
            <button className="button-primary" onClick={() => loadTracking()} type="button">
              {loading ? 'Tracking...' : 'Track shipment'}
            </button>
          </div>

          {error ? <div className="auth-error" style={{ marginTop: 18 }}>{error}</div> : null}

          {shipment ? (
            <div className="package-stack" style={{ marginTop: 24 }}>
              <article className="package-item">
                <div className="package-topline">
                  <div>
                    <strong>{shipment.trackingId}</strong>
                    <p style={{ margin: '8px 0 0' }}>{shipment.receiver?.name}</p>
                  </div>
                  <StatusBadge status={shipment.status} />
                </div>
                <div className="package-meta" style={{ marginTop: 14 }}>
                  <span>Sender: {shipment.sender?.name || 'Sender'}</span>
                  <span>Package: {shipment.packageType}</span>
                  <span>Pickup: {shipment.pickupAddress}</span>
                  <span>Delivery: {shipment.deliveryAddress}</span>
                  <span>Payment: {shipment.paymentStatus}</span>
                  <span>ETA: {formatDateTime(shipment.estimatedDeliveryAt)}</span>
                  <span>Delivered: {formatDateTime(shipment.deliveredAt)}</span>
                </div>
              </article>

              <article className="package-item">
                <h3 style={{ marginTop: 0 }}>Delivery timeline</h3>
                <div className="timeline">
                  {shipment.timeline?.map((item, index) => (
                    <div className="timeline-row" key={`${item.status}-${index}`}>
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <strong>{item.label || item.status}</strong>
                        <small>{formatDateTime(item.timestamp)}</small>
                        <p>{item.note || 'Event logged.'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          ) : null}

          <p className="auth-footer" style={{ marginTop: 22 }}>
            Need the full role-based dashboard? <Link to="/login">Sign in to NexExpree</Link>
          </p>
        </section>
      </section>
    </div>
  );
};

export default TrackPackage;
