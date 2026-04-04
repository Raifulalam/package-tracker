import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';

const nextStatusButtons = ['Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed', 'Exception'];
const agentViews = [
  ['overview', 'Overview', 'OV', 'Assigned workload and route summary'],
  ['orders', 'Orders', 'OR', 'Assigned jobs and status updates'],
  ['profile', 'Profile', 'PF', 'Field profile and operations shortcuts'],
];

const AgentDashboard = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pending: 0, active: 0, delivered: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('overview');
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let active = true;

    const loadPackages = async () => {
      try {
        const response = await api.get('/api/agent/assigned', { token: user.token });
        if (active) {
          setPackages(response.data || []);
          setMeta(response.meta || { total: 0, pending: 0, active: 0, delivered: 0 });
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
    ['Assigned shipments', meta.total || 0, 'info', 'AS', 'Every ParcelOps shipment currently assigned to you'],
    ['Pending pickup', meta.pending || 0, 'warning', 'PP', 'Jobs approved or assigned but not yet picked up'],
    ['Active route', meta.active || 0, 'warning', 'AR', 'Shipments moving through pickup, transit, and final mile'],
    ['Delivered', meta.delivered || 0, 'success', 'DL', 'Completed deliveries already reflected in customer tracking'],
  ];

  const activeMeta = agentViews.find(([key]) => key === activeView) || agentViews[0];

  const renderOverview = () => (
    <>
      <section className="admin-summary-grid">
        {statCards.map(([label, value, tone, icon, metaText]) => (
          <article className="glass-card metric-card admin-summary-card" key={label}>
            <div className="admin-summary-topline">
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
              <span className={`admin-summary-icon tone-${tone}`}>{icon}</span>
            </div>
            <span className="admin-summary-subtext">{metaText}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
          <div className="admin-section-head">
            <div>
              <h2>Current Route Board</h2>
              <p>Your next active shipments ready for field updates.</p>
            </div>
          </div>
          {loading ? (
            <div className="empty-state">Loading assigned shipments...</div>
          ) : filteredPackages.length === 0 ? (
            <div className="empty-state">No shipments match the current filters.</div>
          ) : (
            <div className="package-stack">
              {filteredPackages.slice(0, 3).map((pkg) => (
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
                    <span>Charge: {formatCurrency(pkg.shippingCharge)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
          <div className="admin-section-head compact">
            <div>
              <h2>Field Shortcuts</h2>
              <p>Fast links for daily delivery tasks.</p>
            </div>
          </div>
          <div className="workspace-action-list">
            <button className="button-primary" onClick={() => setActiveView('orders')} type="button">Open assigned orders</button>
            <Link className="button-secondary" to="/settings">Open profile settings</Link>
            <Link className="button-secondary" to="/track">Public tracking search</Link>
          </div>
        </article>
      </section>
    </>
  );

  const renderOrders = () => (
    <section className="glass-card section-card">
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

      {loading ? (
        <div className="empty-state">Loading assigned shipments...</div>
      ) : filteredPackages.length === 0 ? (
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
                <span>Charge: {formatCurrency(pkg.shippingCharge)}</span>
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
  );

  const renderProfile = () => (
    <section className="dashboard-grid admin-dashboard-main">
      <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
        <div className="admin-section-head">
          <div>
            <h2>Agent Profile</h2>
            <p>Field account information and current operating location.</p>
          </div>
        </div>
        <div className="settings-summary-grid">
          <div className="settings-summary-item"><span>Name</span><strong>{user?.name || 'ParcelOps Agent'}</strong></div>
          <div className="settings-summary-item"><span>Email</span><strong>{user?.email || 'Not available'}</strong></div>
          <div className="settings-summary-item"><span>Hub</span><strong>{user?.hub || 'Not set'}</strong></div>
          <div className="settings-summary-item"><span>City</span><strong>{user?.city || 'Not set'}</strong></div>
        </div>
      </article>

      <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
        <div className="admin-section-head">
          <div>
            <h2>Field Actions</h2>
            <p>Quick links for route visibility and account settings.</p>
          </div>
        </div>
        <div className="workspace-action-list">
          <Link className="button-primary" to="/settings">Open settings</Link>
          <button className="button-secondary" onClick={() => setActiveView('orders')} type="button">Open assigned orders</button>
          <Link className="button-secondary" to="/track">Track by number</Link>
        </div>
      </article>
    </section>
  );

  return (
    <PortalShell
      title="Agent Operations Board"
      subtitle="Manage assigned deliveries, update shipment progress in real time, and keep customers and operations teams informed at every step."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="glass-card section-card admin-workspace-header">
        <div className="admin-workspace-copy">
          <div className="admin-workspace-eyebrow">Agent Workspace</div>
          <h2>{activeMeta[1]}</h2>
          <p>{activeMeta[3]}</p>
        </div>
        <nav className="admin-view-nav">
          {agentViews.map(([key, label, icon]) => (
            <button
              className={`admin-view-tab${activeView === key ? ' active' : ''}`}
              key={key}
              onClick={() => setActiveView(key)}
              type="button"
            >
              <span className="admin-view-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>

      <div className="admin-tab-panel" style={{ marginTop: 18 }}>
        {activeView === 'orders' ? renderOrders() : activeView === 'profile' ? renderProfile() : renderOverview()}
      </div>
    </PortalShell>
  );
};

export default AgentDashboard;
