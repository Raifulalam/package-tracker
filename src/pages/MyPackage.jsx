import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';
import { shipmentStatuses } from '../lib/shipment';

const MyPackages = () => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadShipments = async () => {
      try {
        const response = await api.get('/api/shipments/mine', { token: user.token });
        if (!active) return;
        setShipments(response.data || []);
        setError('');
      } catch (err) {
        if (!active) return;
        setError(err.message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadShipments();
    const socket = getSocket();
    socket.on('shipments:refresh', loadShipments);

    return () => {
      active = false;
      socket.off('shipments:refresh', loadShipments);
    };
  }, [user.token]);

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return shipments.filter((shipment) => {
      const matchesStatus = status === 'All' || shipment.status === status;
      const matchesQuery =
        !query ||
        shipment.trackingId?.toLowerCase().includes(query) ||
        shipment.receiver?.name?.toLowerCase().includes(query) ||
        shipment.packageType?.toLowerCase().includes(query) ||
        shipment.deliveryAddress?.toLowerCase().includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [search, shipments, status]);

  return (
    <PortalShell
      title="Shipment Register"
      subtitle="Search your outgoing shipments by tracking ID, receiver, package type, or route and jump directly into delivery, verification, and payment history."
    >
      <section className="glass-card section-card">
        <div className="toolbar">
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by tracking ID, receiver, package type, or address"
            value={search}
          />
          <select onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="All">All statuses</option>
            {shipmentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <Link className="button-primary" to="/sender/create">New shipment</Link>
        </div>

        {error ? <div className="auth-error">{error}</div> : null}

        {loading ? (
          <div className="empty-state">Loading shipment register...</div>
        ) : filteredShipments.length === 0 ? (
          <div className="empty-state">No shipments match the current search and filter combination.</div>
        ) : (
          <div className="package-stack">
            {filteredShipments.map((shipment) => (
              <article className="package-item" key={shipment._id}>
                <div className="package-topline">
                  <div>
                    <strong>{shipment.trackingId}</strong>
                    <p style={{ margin: '8px 0 0' }}>{shipment.receiver?.name}</p>
                  </div>
                  <StatusBadge status={shipment.status} />
                </div>
                <div className="package-meta" style={{ marginTop: 14 }}>
                  <span>Package: {shipment.packageType}</span>
                  <span>Weight: {shipment.weight} kg</span>
                  <span>Destination: {shipment.deliveryAddress}</span>
                  <span>Payment: {shipment.paymentStatus}</span>
                  <span>Amount: {formatCurrency(shipment.paymentAmount)}</span>
                  <span>Updated: {formatDateTime(shipment.updatedAt)}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                  <Link className="button-primary" to={`/shipments/${shipment._id}`}>View shipment</Link>
                  <Link className="button-secondary" to={`/track?tracking=${shipment.trackingId}`}>Public tracking</Link>
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
