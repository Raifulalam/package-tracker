import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';

const nextStatusButtons = ['Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed', 'Exception'];

const AgentDashboard = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pending: 0, active: 0, delivered: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let active = true;

    const loadPackages = async () => {
      try {
        const response = await api.get('/api/package/agent', { token: user.token });
        if (active) {
          setPackages(response.data);
          setMeta(response.meta);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.message);
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
    const query = deferredSearch.trim().toLowerCase();

    return packages.filter((pkg) => {
      const matchesStatus = statusFilter === 'All' || pkg.status === statusFilter;
      const matchesSearch =
        !query ||
        pkg.trackingNumber.toLowerCase().includes(query) ||
        pkg.receiverName.toLowerCase().includes(query) ||
        pkg.deliveryAddress.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [packages, deferredSearch, statusFilter]);

  const updateStatus = async (pkgId, status, location) => {
    setBusyId(`${pkgId}:${status}`);

    try {
      await api.put(
        `/api/package/${pkgId}/status`,
        {
          status,
          location,
          note: `Updated by field agent ${user.name}.`,
        },
        { token: user.token }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const statCards = [
    { label: 'Assigned shipments', value: meta.total || 0, note: 'Full manifest currently under this agent' },
    { label: 'Pending handoff', value: meta.pending || 0, note: 'Approved or assigned jobs not yet picked up' },
    { label: 'Active route', value: meta.active || 0, note: 'Shipments moving through pickup, linehaul, and final mile' },
    { label: 'Delivered today', value: meta.delivered || 0, note: 'Completed shipments visible to the sender immediately' },
  ];

  return (
    <PortalShell
      title="Agent Operations Board"
      subtitle="See your assigned workload, move packages through the delivery chain, and publish live status updates to customers and admins."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="dashboard-grid">
        {statCards.map((card) => (
          <article className="glass-card metric-card" key={card.label} style={{ gridColumn: 'span 3' }}>
            <small>{card.label}</small>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
          </article>
        ))}
      </section>

      <section className="glass-card section-card" style={{ marginTop: 18 }}>
        <div className="toolbar">
          <input
            placeholder="Search by tracking number, receiver, or route"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="All">All statuses</option>
            <option value="Assigned">Assigned</option>
            <option value="Picked Up">Picked Up</option>
            <option value="In Transit">In Transit</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Delayed">Delayed</option>
            <option value="Exception">Exception</option>
          </select>
        </div>

        {filteredPackages.length === 0 ? (
          <div className="empty-state">No shipments match the current filters.</div>
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
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                  {nextStatusButtons.map((status) => (
                    <button
                      className={status === 'Delivered' ? 'button-primary' : 'button-secondary'}
                      disabled={busyId === `${pkg._id}:${status}`}
                      key={status}
                      onClick={() => updateStatus(pkg._id, status, pkg.deliveryAddress)}
                      type="button"
                    >
                      {busyId === `${pkg._id}:${status}` ? 'Updating...' : status}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PortalShell>
  );
};

export default AgentDashboard;
