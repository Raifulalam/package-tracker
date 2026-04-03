import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';
import { getRouteLabel } from '../lib/pricing';
import './TrackDelivery.css';

const TrackDelivery = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const printRef = useRef(null);
  const [pkg, setPkg] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadPackage = async () => {
      try {
        const response = await api.get(`/api/package/${id}`, { token: user.token });
        if (active) {
          setPkg(response.data);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.message);
      }
    };

    loadPackage();

    const socket = getSocket();
    const handleUpdate = (updatedPackage) => {
      if (updatedPackage._id === id) {
        setPkg(updatedPackage);
      }
    };

    socket.on('package:updated', handleUpdate);

    return () => {
      active = false;
      socket.off('package:updated', handleUpdate);
    };
  }, [id, user.token]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: pkg ? `${pkg.trackingNumber}-shipment-record` : 'shipment-record',
  });

  return (
    <PortalShell
      title="Shipment Timeline"
      subtitle="Review the full operational history for a shipment, including assignment, route progress, and delivery milestones."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      {!pkg ? (
        <div className="empty-state">Loading shipment record...</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="button-primary" onClick={handlePrint} type="button">
              Print shipment summary
            </button>
          </div>

          <div className="shipment-sheet glass-card" ref={printRef}>
            <div className="shipment-headline">
              <div>
                <p className="sheet-label">Tracking number</p>
                <h2>{pkg.trackingNumber}</h2>
              </div>
              <StatusBadge status={pkg.status} />
            </div>

            <div className="shipment-grid">
              <section className="sheet-panel">
                <h3>Receiver profile</h3>
                <p><strong>Name:</strong> {pkg.receiverName}</p>
                <p><strong>Phone:</strong> {pkg.receiverPhone}</p>
                <p><strong>Email:</strong> {pkg.receiverEmail || 'Not provided'}</p>
                <p><strong>Courier:</strong> {pkg.assignedAgent?.name || 'Awaiting assignment'}</p>
              </section>

              <section className="sheet-panel">
                <h3>Route and SLA</h3>
                <p><strong>Pickup:</strong> {pkg.pickupAddress}</p>
                <p><strong>Delivery:</strong> {pkg.deliveryAddress}</p>
                <p><strong>Service level:</strong> {pkg.deliveryType}</p>
                <p><strong>Route tier:</strong> {getRouteLabel(pkg.pricingSnapshot?.routeType)}</p>
                <p><strong>Estimated delivery:</strong> {formatDateTime(pkg.estimatedDeliveryAt)}</p>
                <p><strong>Delivered at:</strong> {formatDateTime(pkg.deliveredAt)}</p>
              </section>

              <section className="sheet-panel">
                <h3>Parcel profile</h3>
                <p><strong>Item:</strong> {pkg.itemType}</p>
                <p><strong>Category:</strong> {pkg.parcelCategory}</p>
                <p><strong>Weight:</strong> {pkg.weight} kg</p>
                <p><strong>Declared value:</strong> {formatCurrency(pkg.declaredValue)}</p>
                <p><strong>COD amount:</strong> {formatCurrency(pkg.codAmount)}</p>
                <p><strong>Shipping charge:</strong> {formatCurrency(pkg.shippingCharge)}</p>
              </section>

              <section className="sheet-panel">
                <h3>Handling notes</h3>
                <p>{pkg.instructions || 'No special handling instructions recorded.'}</p>
              </section>
            </div>

            <section className="sheet-panel" style={{ marginTop: 20 }}>
              <h3>Operational timeline</h3>
              <div className="timeline">
                {pkg.statusUpdates?.map((update, index) => (
                  <div className="timeline-row" key={`${update.status}-${index}`}>
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <strong>{update.label || update.status}</strong>
                      <small>{formatDateTime(update.timestamp)}</small>
                      <p>{update.note || 'No additional note recorded.'}</p>
                      {update.location ? <small>Location: {update.location}</small> : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </PortalShell>
  );
};

export default TrackDelivery;
