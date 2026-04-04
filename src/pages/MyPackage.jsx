import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';

const MyPackages = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadPackages = async () => {
      try {
        const response = await api.get('/api/package/mine', { token: user.token });
        if (active) {
          setPackages(response.data);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPackages();

    const socket = getSocket();
    const refresh = () => loadPackages();
    socket.on('dashboard:refresh', refresh);

    return () => {
      active = false;
      socket.off('dashboard:refresh', refresh);
    };
  }, [user.token]);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesStatus = status === 'All' || pkg.status === status;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        pkg.trackingNumber.toLowerCase().includes(query) ||
        pkg.receiverName.toLowerCase().includes(query) ||
        pkg.deliveryAddress.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [packages, search, status]);

  return (
    <PortalShell
      title="Shipment Register"
      subtitle="Search your outbound parcels by receiver, route, or tracking number and jump into a full delivery timeline in one click."
    >
      <section className="glass-card section-card">
        <div className="toolbar">
          <input
            placeholder="Search by tracking number, receiver, or address"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="All">All statuses</option>
            <option value="Requested">Requested</option>
            <option value="Approved">Approved</option>
            <option value="Assigned">Assigned</option>
            <option value="Picked Up">Picked Up</option>
            <option value="In Transit">In Transit</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Delayed">Delayed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {error ? <div className="auth-error">{error}</div> : null}

        {loading ? (
          <div className="empty-state">Loading your shipment register...</div>
        ) : filteredPackages.length === 0 ? (
          <div className="empty-state">No shipments match your current filters.</div>
        ) : (
          <div className="package-stack">
            {filteredPackages.map((pkg) => (
              <article className="package-item" key={pkg._id}>
                <div className="package-topline">
                  <div>
                    <strong>{pkg.trackingNumber}</strong>
                    <p style={{ margin: '8px 0 0' }}>{pkg.receiverName}</p>
                  </div>
                  <StatusBadge status={pkg.status} />
                </div>

                <div className="package-meta" style={{ marginTop: 14 }}>
                  <span>Pickup: {pkg.pickupAddress}</span>
                  <span>Destination: {pkg.deliveryAddress}</span>
                  <span>ETA: {formatDateTime(pkg.estimatedDeliveryAt)}</span>
                  <span>Assigned courier: {pkg.assignedAgent?.name || 'Awaiting dispatch'}</span>
                  <span>Charge: {formatCurrency(pkg.shippingCharge)}</span>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                  <Link className="button-primary" to={`/sender/track/${pkg._id}`}>
                    View timeline
                  </Link>
                  <Link className="button-secondary" to={`/track?tracking=${pkg.trackingNumber}`}>
                    Open public tracking
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PortalShell>
  );
};

export default MyPackages;
