import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';
import { getRouteLabel } from '../lib/pricing';
import './auth.css';

const TrackPackage = () => {
  const [searchParams] = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState(searchParams.get('tracking') || '');
  const [shipment, setShipment] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadTracking = useCallback(async (value = trackingNumber) => {
    if (!value.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/api/package/public/${encodeURIComponent(value.trim())}`);
      setShipment(response.data);
    } catch (err) {
      setShipment(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [trackingNumber]);

  useEffect(() => {
    if (searchParams.get('tracking')) {
      loadTracking(searchParams.get('tracking'));
    }
  }, [loadTracking, searchParams]);

  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = (updatedPackage) => {
      if (updatedPackage.trackingNumber === shipment?.trackingNumber) {
        setShipment(updatedPackage);
      }
    };

    socket.on('package:updated', handleUpdate);
    socket.on('package:created', handleUpdate);

    return () => {
      socket.off('package:updated', handleUpdate);
      socket.off('package:created', handleUpdate);
    };
  }, [shipment?.trackingNumber]);

  return (
    <div className="auth-shell" style={{ alignItems: 'start' }}>
      <section className="auth-card" style={{ width: 'min(760px, 100%)' }}>
        <span className="auth-eyebrow">Public parcel tracking</span>
        <h2>Track any live shipment with its tracking number.</h2>
        <p>Use the customer-facing tracking number to view current status, courier progress, and delivery milestones.</p>

        <div className="tracking-search" style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <input
            placeholder="Enter tracking number, for example PTR-20260330-ABC123"
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
          />
          <button className="button-primary" onClick={() => loadTracking()} type="button">
            {loading ? 'Tracking...' : 'Track shipment'}
          </button>
        </div>

        {error ? <div className="auth-error" style={{ marginTop: 18 }}>{error}</div> : null}

        {shipment ? (
          <div className="package-stack" style={{ marginTop: 22 }}>
            <article className="package-item">
              <div className="package-topline">
                <div>
                  <strong>{shipment.trackingNumber}</strong>
                  <p style={{ margin: '8px 0 0' }}>{shipment.receiverName}</p>
                </div>
                <StatusBadge status={shipment.status} />
              </div>

              <div className="package-meta" style={{ marginTop: 14 }}>
                <span>Pickup: {shipment.pickupAddress}</span>
                <span>Destination: {shipment.deliveryAddress}</span>
                <span>Charge: {formatCurrency(shipment.shippingCharge)}</span>
                <span>Route tier: {getRouteLabel(shipment.pricingSnapshot?.routeType)}</span>
                <span>Estimated delivery: {formatDateTime(shipment.estimatedDeliveryAt)}</span>
                <span>Assigned courier: {shipment.assignedAgent?.name || 'Pending assignment'}</span>
              </div>
            </article>

            <article className="package-item">
              <h3 style={{ marginTop: 0 }}>Shipment timeline</h3>
              <div className="timeline">
                {shipment.statusUpdates?.map((update, index) => (
                  <div className="timeline-row" key={`${update.status}-${index}`}>
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <strong>{update.label || update.status}</strong>
                      <small>{formatDateTime(update.timestamp)}</small>
                      <p>{update.note || 'Operational event recorded.'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : null}

        <p className="auth-footer" style={{ marginTop: 22 }}>
          Need role-based access? <Link to="/login">Sign in to ParcelOps</Link>
        </p>
      </section>
    </div>
  );
};

export default TrackPackage;
