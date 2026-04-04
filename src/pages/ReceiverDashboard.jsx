import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';

const emptyDashboard = {
  stats: { total: 0, pending: 0, active: 0, delivered: 0, cancelled: 0 },
  incomingPackages: [],
  activePackages: [],
};

const receiverViews = [
  ['overview', 'Overview', 'OV', 'Incoming parcel summary and shortcuts'],
  ['parcels', 'Parcels', 'PR', 'Recent incoming and active deliveries'],
  ['profile', 'Profile', 'PF', 'Receiver account and settings links'],
];

const ReceiverDashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('overview');

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const response = await api.get('/api/package/receiver-dashboard', { token: user.token });

        if (active) {
          setDashboard(response.data || emptyDashboard);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();

    const socket = getSocket();
    const refresh = () => loadDashboard();
    socket.on('dashboard:refresh', refresh);

    return () => {
      active = false;
      socket.off('dashboard:refresh', refresh);
    };
  }, [user.token]);

  const statCards = useMemo(() => [
    ['Incoming parcels', dashboard.stats.total, 'info', 'IP', 'All shipments currently matched to your contact details'],
    ['Awaiting movement', dashboard.stats.pending, 'warning', 'AM', 'Parcels booked or assigned but not yet near final delivery'],
    ['On the way', dashboard.stats.active, 'warning', 'OW', 'Shipments currently in transit or out for delivery'],
    ['Delivered', dashboard.stats.delivered, 'success', 'DL', 'Completed deliveries with a confirmed delivery update'],
  ], [dashboard.stats]);

  const activeMeta = receiverViews.find(([key]) => key === activeView) || receiverViews[0];

  const renderOverview = () => (
    <>
      <section className="admin-summary-grid">
        {statCards.map(([label, value, tone, icon, meta]) => (
          <article className="glass-card metric-card admin-summary-card" key={label}>
            <div className="admin-summary-topline">
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
              <span className={`admin-summary-icon tone-${tone}`}>{icon}</span>
            </div>
            <span className="admin-summary-subtext">{meta}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
          <div className="admin-section-head">
            <div>
              <h2>Receiver Shortcuts</h2>
              <p>Quick links for tracking and incoming parcel visibility.</p>
            </div>
          </div>
          <div className="workspace-action-grid">
            <Link className="workspace-action-card" to="/track">
              <strong>Track by Number</strong>
              <span>Open public tracking when you already have the shipment code.</span>
            </Link>
            <button className="workspace-action-card" onClick={() => setActiveView('parcels')} type="button">
              <strong>View Incoming Parcels</strong>
              <span>See every parcel matched to your receiver contact details.</span>
            </button>
            <Link className="workspace-action-card" to="/settings">
              <strong>Open Profile Settings</strong>
              <span>Keep your phone and location details accurate for parcel matching.</span>
            </Link>
          </div>
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
          <div className="admin-section-head compact">
            <div>
              <h2>Active Deliveries</h2>
              <p>Shipments currently moving toward final delivery.</p>
            </div>
          </div>
          {loading ? (
            <div className="empty-state">Loading active delivery feed...</div>
          ) : dashboard.activePackages.length === 0 ? (
            <div className="empty-state">No active incoming deliveries right now.</div>
          ) : (
            <div className="package-stack">
              {dashboard.activePackages.slice(0, 3).map((pkg) => (
                <article className="package-item" key={pkg._id}>
                  <div className="package-topline">
                    <div>
                      <strong>{pkg.trackingNumber}</strong>
                      <p style={{ margin: '8px 0 0' }}>{pkg.deliveryAddress}</p>
                    </div>
                    <StatusBadge status={pkg.status} />
                  </div>
                  <div className="package-meta" style={{ marginTop: 14 }}>
                    <span>From: {pkg.pickupAddress}</span>
                    <span>Courier: {pkg.assignedAgent?.name || 'Assignment pending'}</span>
                    <span>ETA: {formatDateTime(pkg.estimatedDeliveryAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  );

  const renderParcels = () => (
    <section className="dashboard-grid admin-dashboard-main">
      <article className="glass-card section-card" style={{ gridColumn: 'span 7' }}>
        <div className="package-topline" style={{ marginBottom: 18 }}>
          <div>
            <h2>Recent Incoming Parcels</h2>
            <p>Every ParcelOps shipment currently linked to your registered email or phone number.</p>
          </div>
          <Link className="button-secondary" to="/track">
            Track by number
          </Link>
        </div>

        {loading ? (
          <div className="empty-state">Loading incoming shipments...</div>
        ) : dashboard.incomingPackages.length === 0 ? (
          <div className="empty-state">
            No incoming parcels are linked to this account yet. Make sure your receiver email or phone matches the shipment details.
          </div>
        ) : (
          <div className="package-stack">
            {dashboard.incomingPackages.map((pkg) => (
              <article className="package-item" key={pkg._id}>
                <div className="package-topline">
                  <div>
                    <strong>{pkg.trackingNumber}</strong>
                    <p style={{ margin: '8px 0 0' }}>{pkg.senderSnapshot?.name || 'ParcelOps sender'}</p>
                  </div>
                  <StatusBadge status={pkg.status} />
                </div>

                <div className="package-meta" style={{ marginTop: 14 }}>
                  <span>Pickup origin: {pkg.pickupAddress}</span>
                  <span>Delivery address: {pkg.deliveryAddress}</span>
                  <span>Estimated arrival: {formatDateTime(pkg.estimatedDeliveryAt)}</span>
                  <span>Item type: {pkg.itemType}</span>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                  <Link className="button-primary" to={`/receiver/track/${pkg._id}`}>
                    View timeline
                  </Link>
                  <Link className="button-secondary" to={`/track?tracking=${pkg.trackingNumber}`}>
                    Public tracking
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      <aside className="glass-card section-card" style={{ gridColumn: 'span 5' }}>
        <h2>Active Deliveries</h2>
        <p>Incoming shipments still moving through the ParcelOps delivery network.</p>

        {loading ? (
          <div className="empty-state">Loading active delivery feed...</div>
        ) : dashboard.activePackages.length === 0 ? (
          <div className="empty-state">No active incoming deliveries right now.</div>
        ) : (
          <div className="package-stack">
            {dashboard.activePackages.map((pkg) => (
              <article className="package-item" key={pkg._id}>
                <div className="package-topline">
                  <div>
                    <strong>{pkg.trackingNumber}</strong>
                    <p style={{ margin: '8px 0 0' }}>{pkg.deliveryAddress}</p>
                  </div>
                  <StatusBadge status={pkg.status} />
                </div>
                <div className="package-meta" style={{ marginTop: 14 }}>
                  <span>From: {pkg.pickupAddress}</span>
                  <span>Courier: {pkg.assignedAgent?.name || 'Assignment pending'}</span>
                  <span>ETA: {formatDateTime(pkg.estimatedDeliveryAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </aside>
    </section>
  );

  const renderProfile = () => (
    <section className="dashboard-grid admin-dashboard-main">
      <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
        <div className="admin-section-head">
          <div>
            <h2>Receiver Profile</h2>
            <p>Contact details used to match incoming shipments to your account.</p>
          </div>
        </div>
        <div className="settings-summary-grid">
          <div className="settings-summary-item"><span>Name</span><strong>{user?.name || 'ParcelOps Receiver'}</strong></div>
          <div className="settings-summary-item"><span>Email</span><strong>{user?.email || 'Not available'}</strong></div>
          <div className="settings-summary-item"><span>Phone</span><strong>{user?.phone || 'Not set'}</strong></div>
          <div className="settings-summary-item"><span>City</span><strong>{user?.city || 'Not set'}</strong></div>
        </div>
      </article>

      <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
        <div className="admin-section-head">
          <div>
            <h2>Receiver Actions</h2>
            <p>Access settings or tracking from one place.</p>
          </div>
        </div>
        <div className="workspace-action-list">
          <Link className="button-primary" to="/settings">Open settings</Link>
          <button className="button-secondary" onClick={() => setActiveView('parcels')} type="button">Open parcel view</button>
          <Link className="button-secondary" to="/track">Track by number</Link>
        </div>
      </article>
    </section>
  );

  return (
    <PortalShell
      title="Receiver Workspace"
      subtitle="Stay informed on incoming deliveries, follow live ETA updates, and open detailed parcel timelines the moment something is on the way."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="glass-card section-card admin-workspace-header">
        <div className="admin-workspace-copy">
          <div className="admin-workspace-eyebrow">Receiver Workspace</div>
          <h2>{activeMeta[1]}</h2>
          <p>{activeMeta[3]}</p>
        </div>
        <nav className="admin-view-nav">
          {receiverViews.map(([key, label, icon]) => (
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
        {activeView === 'parcels' ? renderParcels() : activeView === 'profile' ? renderProfile() : renderOverview()}
      </div>
    </PortalShell>
  );
};

export default ReceiverDashboard;
