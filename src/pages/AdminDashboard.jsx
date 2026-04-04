import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';

const adminStatuses = ['Approved', 'Scheduled', 'Assigned', 'Delayed', 'Exception', 'Cancelled', 'Delivered'];
const filterStatuses = ['All', 'Requested', 'Approved', 'Scheduled', 'Assigned', 'In Transit', 'Delivered', 'Delayed', 'Exception', 'Cancelled'];
const adminViews = [
  ['overview', 'Overview', 'OV', 'Live network summary'],
  ['orders', 'Orders', 'OR', 'Search, assign, update'],
  ['analytics', 'Analytics', 'AN', 'Daily volume and success'],
  ['users', 'Users', 'US', 'Account distribution'],
  ['agents', 'Agents', 'AG', 'Courier workload'],
  ['profile', 'Profile', 'PF', 'Admin details and settings'],
];
const emptyPricing = { sameCity: 0, differentProvince: 0, perKgRate: 0, codCharge: 0, expressMultiplier: 1 };

function summaryCards(overview) {
  const fresh = (overview.Requested || 0) + (overview.Approved || 0) + (overview.Scheduled || 0);
  const pending =
    (overview.Assigned || 0) +
    (overview['Picked Up'] || 0) +
    (overview['In Transit'] || 0) +
    (overview['Out for Delivery'] || 0) +
    (overview.Delayed || 0) +
    (overview.Exception || 0);

  return [
    ['New Orders', fresh, 'info', 'NO', 'Awaiting dispatch planning'],
    ['Pending Deliveries', pending, 'warning', 'PD', 'Active across the network'],
    ['Delivered Parcels', overview.Delivered || 0, 'success', 'DP', 'Completed this cycle'],
    ['Cancelled Orders', overview.Cancelled || 0, 'danger', 'CO', 'Closed before fulfilment'],
  ];
}

function ordersTrend(packages) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts = {};

  packages.forEach((pkg) => {
    const date = new Date(pkg.createdAt || pkg.updatedAt || Date.now());
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString().slice(0, 10);
    counts[key] = (counts[key] || 0) + 1;
  });

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);

    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      full: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: counts[key] || 0,
    };
  });
}

function healthStats(overview) {
  const delivered = overview.Delivered || 0;
  const cancelled = (overview.Cancelled || 0) + (overview.Exception || 0);
  const active = Math.max((overview.total || 0) - delivered - cancelled, 0);
  const total = overview.total || 0;
  const success = delivered + cancelled ? Math.round((delivered / (delivered + cancelled)) * 100) : 0;

  return [
    ['Delivered', delivered, total ? Math.round((delivered / total) * 100) : 0, 'success'],
    ['Active', active, total ? Math.round((active / total) * 100) : 0, 'warning'],
    ['Cancelled / Exception', cancelled, total ? Math.round((cancelled / total) * 100) : 0, 'danger'],
    ['Success Rate', `${success}%`, success, 'info'],
  ];
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const mounted = useRef(false);
  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [overview, setOverview] = useState({ total: 0 });
  const [roleSummary, setRoleSummary] = useState({});
  const [pricing, setPricing] = useState(emptyPricing);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [activeView, setActiveView] = useState('overview');
  const [modal, setModal] = useState(null);
  const [modalValue, setModalValue] = useState('');

  const loadDashboard = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader && mounted.current) setLoading(true);

    try {
      const [usersRes, packagesRes, pricingRes] = await Promise.all([
        api.get('/api/admin/users', { token: user.token }),
        api.get('/api/admin/packages', { token: user.token }),
        api.get('/api/pricing', { token: user.token }),
      ]);

      if (!mounted.current) return;

      setUsers(usersRes.data?.users || []);
      setRoleSummary(usersRes.data?.byRole || {});
      setPackages(packagesRes.data?.packages || []);
      setRecentActivity(packagesRes.data?.recentActivity || []);
      setOverview(packagesRes.data?.overview || { total: 0 });
      setPricing(pricingRes.data || emptyPricing);
      setError('');
    } catch (err) {
      if (mounted.current) setError(err.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    mounted.current = true;
    loadDashboard();

    const socket = getSocket();
    const refresh = () => loadDashboard({ showLoader: false });
    socket.on('dashboard:refresh', refresh);

    return () => {
      mounted.current = false;
      socket.off('dashboard:refresh', refresh);
    };
  }, [loadDashboard]);

  const agents = useMemo(() => users.filter((account) => account.role === 'agent'), [users]);
  const cards = useMemo(() => summaryCards(overview), [overview]);
  const trend = useMemo(() => ordersTrend(packages), [packages]);
  const trendMax = useMemo(() => Math.max(...trend.map((item) => item.count), 1), [trend]);
  const health = useMemo(() => healthStats(overview), [overview]);
  const activeMeta = useMemo(() => adminViews.find(([key]) => key === activeView) || adminViews[0], [activeView]);

  const agentLoads = useMemo(() => {
    const loadMap = {};

    packages
      .filter((pkg) => !['Delivered', 'Cancelled'].includes(pkg.status))
      .forEach((pkg) => {
        if (pkg.assignedAgent?._id) {
          loadMap[pkg.assignedAgent._id] = (loadMap[pkg.assignedAgent._id] || 0) + 1;
        }
      });

    return agents
      .map((agent) => ({ ...agent, load: loadMap[agent._id] || 0 }))
      .sort((left, right) => right.load - left.load)
      .slice(0, 6);
  }, [agents, packages]);

  const filteredPackages = useMemo(() => {
    const query = search.trim().toLowerCase();

    return packages.filter((pkg) => {
      const sourceDate = (pkg.createdAt || pkg.updatedAt || '').slice(0, 10);

      return (
        (statusFilter === 'All' || pkg.status === statusFilter) &&
        (!dateFilter || sourceDate === dateFilter) &&
        (!query ||
          pkg.trackingNumber?.toLowerCase().includes(query) ||
          pkg.receiverName?.toLowerCase().includes(query) ||
          pkg.senderSnapshot?.name?.toLowerCase().includes(query) ||
          pkg.deliveryAddress?.toLowerCase().includes(query))
      );
    });
  }, [dateFilter, packages, search, statusFilter]);

  const openModal = (type, pkg) => {
    setModal({ type, pkg });
    setModalValue(type === 'assign' ? pkg.assignedAgent?._id || '' : type === 'status' ? pkg.status : '');
  };

  const closeModal = () => {
    setModal(null);
    setModalValue('');
  };

  const assignAgent = async () => {
    if (!modalValue || !modal) return;

    setBusyKey(`assign:${modal.pkg._id}`);
    try {
      await api.put(`/api/admin/assign/${modal.pkg._id}`, { agentId: modalValue }, { token: user.token });
      showToast('Agent assigned successfully.', 'success');
      closeModal();
      await loadDashboard({ showLoader: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const updateStatus = async () => {
    if (!modalValue || !modal) return;

    setBusyKey(`status:${modal.pkg._id}`);
    try {
      await api.put(
        `/api/package/${modal.pkg._id}/status`,
        { status: modalValue, note: `Status updated by admin ${user.name}.` },
        { token: user.token }
      );
      showToast(`Shipment moved to ${modalValue}.`, 'success');
      closeModal();
      await loadDashboard({ showLoader: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const renderOverview = () => (
    <>
      <section className="admin-summary-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
            <article className="glass-card metric-card admin-summary-card" key={index}>
              <div className="skeleton-line short" />
              <div className="skeleton-line tall" />
              <div className="skeleton-line medium" />
            </article>
          ))
          : cards.map(([label, value, tone, icon, meta]) => (
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
        <article className="glass-card section-card admin-analytics-panel" style={{ gridColumn: 'span 8' }}>
          <div className="admin-section-head">
            <div>
              <h2>Orders Per Day</h2>
              <p>Latest booking volume across the network.</p>
            </div>
          </div>
          {loading ? (
            <div className="admin-chart-skeleton">
              {Array.from({ length: 7 }).map((_, index) => <div className="skeleton-line tall" key={index} />)}
            </div>
          ) : (
            <div className="admin-chart-bars">
              {trend.map((day) => (
                <div className="admin-chart-column" key={day.key}>
                  <span className="admin-chart-count">{day.count}</span>
                  <div className="admin-chart-track">
                    <div className="admin-chart-fill" style={{ height: `${Math.max(10, Math.round((day.count / trendMax) * 100))}%` }} />
                  </div>
                  <strong>{day.label}</strong>
                  <small>{day.full}</small>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="glass-card section-card admin-side-card" style={{ gridColumn: 'span 4' }}>
          <div className="admin-section-head">
            <div>
              <h2>Delivery Health</h2>
              <p>Quick health check for visible shipments.</p>
            </div>
          </div>
          <div className="admin-health-grid">
            {health.map(([label, value, percentage, tone]) => (
              <div className="admin-health-card" key={label}>
                <div className="admin-health-copy">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <div className="admin-health-track">
                  <div className={`admin-health-fill tone-${tone}`} style={{ width: `${percentage}%` }} />
                </div>
                <small>{percentage}% of visible volume</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card admin-history-panel" style={{ gridColumn: 'span 12' }}>
          <div className="admin-section-head">
            <div>
              <h2>Recent Network History</h2>
              <p>Latest shipment updates from the ParcelOps operations stream.</p>
            </div>
          </div>
          {loading ? (
            <div className="admin-table-skeleton">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="admin-skeleton-row" key={index}>
                  <div className="skeleton-line medium" />
                  <div className="skeleton-line short" />
                  <div className="skeleton-line medium" />
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="empty-state">No recent shipment events are available yet.</div>
          ) : (
            <div className="admin-history-list">
              {recentActivity.map((pkg) => (
                <div className="admin-history-item" key={pkg._id}>
                  <div className="admin-user-item">
                    <span>{pkg.trackingNumber}</span>
                    <StatusBadge status={pkg.status} />
                  </div>
                  <strong>{pkg.receiverName}</strong>
                  <p>{pkg.deliveryAddress}</p>
                  <small>Updated {formatDateTime(pkg.updatedAt || pkg.createdAt)}</small>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  );

  const renderOrders = () => (
    <section className="dashboard-grid admin-dashboard-main">
      <article className="glass-card section-card admin-orders-panel" style={{ gridColumn: 'span 12' }}>
        <div className="admin-section-head">
          <div>
            <h2>Orders Workspace</h2>
            <p>Search, filter, review, assign, and update orders from one control table.</p>
          </div>
          <div className="admin-chart-metric">
            <span>Visible orders</span>
            <strong>{filteredPackages.length}</strong>
          </div>
        </div>
        <div className="admin-filter-bar">
          <input onChange={(event) => setSearch(event.target.value)} placeholder="Search by Order ID, sender, receiver, or location" value={search} />
          <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            {filterStatuses.map((option) => <option key={option} value={option}>{option === 'All' ? 'All statuses' : option}</option>)}
          </select>
          <input onChange={(event) => setDateFilter(event.target.value)} type="date" value={dateFilter} />
        </div>
        {loading ? (
          <div className="admin-table-wrap">
            <div className="admin-table-skeleton">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="admin-skeleton-row" key={index}>
                  <div className="skeleton-line short" />
                  <div className="skeleton-line medium" />
                  <div className="skeleton-line medium" />
                  <div className="skeleton-line medium" />
                  <div className="skeleton-line short" />
                  <div className="skeleton-line medium" />
                  <div className="skeleton-line short" />
                </div>
              ))}
            </div>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="empty-state">No orders match the current search, status, or date filters.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="package-table admin-orders-table compact">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Sender</th>
                  <th>Receiver</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPackages.map((pkg) => (
                  <tr key={pkg._id}>
                    <td><div className="admin-table-primary"><strong>{pkg.trackingNumber}</strong><small>{pkg.itemType || 'Parcel shipment'}</small></div></td>
                    <td><div className="admin-table-primary"><strong>{pkg.senderSnapshot?.name || 'ParcelOps sender'}</strong><small>{pkg.senderSnapshot?.phone || 'Sender profile on file'}</small></div></td>
                    <td><div className="admin-table-primary"><strong>{pkg.receiverName}</strong><small>{pkg.receiverPhone || 'Receiver contact on file'}</small></div></td>
                    <td><div className="admin-table-primary"><strong>{pkg.deliveryAddress}</strong><small>{pkg.pickupAddress}</small></div></td>
                    <td><StatusBadge status={pkg.status} /></td>
                    <td>{formatDateTime(pkg.createdAt || pkg.updatedAt)}</td>
                    <td>
                      <div className="admin-table-actions compact">
                        <button className="button-ghost" onClick={() => openModal('view', pkg)} type="button">View</button>
                        <button className="button-secondary" onClick={() => openModal('assign', pkg)} type="button">Assign Agent</button>
                        <button className="button-primary" onClick={() => openModal('status', pkg)} type="button">Update Status</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );

  const renderAnalytics = () => (
    <section className="dashboard-grid admin-dashboard-main">
      <article className="glass-card section-card admin-analytics-panel" style={{ gridColumn: 'span 8' }}>
        <div className="admin-section-head">
          <div>
            <h2>Orders Per Day</h2>
            <p>Daily booking trend for the last 7 days.</p>
          </div>
        </div>
        {loading ? (
          <div className="admin-chart-skeleton">
            {Array.from({ length: 7 }).map((_, index) => <div className="skeleton-line tall" key={index} />)}
          </div>
        ) : (
          <div className="admin-chart-bars">
            {trend.map((day) => (
              <div className="admin-chart-column" key={day.key}>
                <span className="admin-chart-count">{day.count}</span>
                <div className="admin-chart-track">
                  <div className="admin-chart-fill" style={{ height: `${Math.max(10, Math.round((day.count / trendMax) * 100))}%` }} />
                </div>
                <strong>{day.label}</strong>
                <small>{day.full}</small>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="glass-card section-card admin-side-card" style={{ gridColumn: 'span 4' }}>
        <div className="admin-section-head">
          <div>
            <h2>Delivery Success Rate</h2>
            <p>Completion health for the visible network.</p>
          </div>
        </div>
        <div className="admin-health-grid">
          {health.map(([label, value, percentage, tone]) => (
            <div className="admin-health-card" key={label}>
              <div className="admin-health-copy">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
              <div className="admin-health-track">
                <div className={`admin-health-fill tone-${tone}`} style={{ width: `${percentage}%` }} />
              </div>
              <small>{percentage}% of visible volume</small>
            </div>
          ))}
        </div>
      </article>
    </section>
  );

  const renderUsers = () => (
    <section className="dashboard-grid admin-dashboard-main">
      <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
        <div className="admin-section-head">
          <div>
            <h2>User Mix</h2>
            <p>Current account distribution across ParcelOps.</p>
          </div>
        </div>
        <div className="admin-user-list">
          {Object.entries(roleSummary).map(([role, count]) => (
            <div className="admin-user-item" key={role}>
              <span>{role}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
        <div className="admin-section-head">
          <div>
            <h2>Recent Accounts</h2>
            <p>Recently created or active user records in the network.</p>
          </div>
        </div>
        <div className="admin-user-directory">
          {users.slice(0, 10).map((account) => (
            <div className="admin-user-directory-item" key={account._id}>
              <div>
                <strong>{account.name}</strong>
                <span>{account.email}</span>
              </div>
              <div className="admin-user-directory-meta">
                <small>{account.role}</small>
                <small>{account.city || 'Nepal network'}</small>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );

  const renderAgents = () => (
    <section className="dashboard-grid admin-dashboard-main">
      <article className="glass-card section-card" style={{ gridColumn: 'span 12' }}>
        <div className="admin-section-head">
          <div>
            <h2>Agent Workload</h2>
            <p>Current courier assignment load and operating coverage.</p>
          </div>
        </div>
        <div className="admin-agent-grid">
          {agentLoads.length === 0 ? (
            <div className="empty-state">No active courier assignments are available right now.</div>
          ) : (
            agentLoads.map((agent) => (
              <div className="admin-agent-card large" key={agent._id}>
                <div className="admin-user-item">
                  <span>{agent.name}</span>
                  <strong>{agent.load}</strong>
                </div>
                <small>{agent.city || 'Nepal network'}</small>
                <p>{agent.load === 0 ? 'Available for new delivery assignments.' : 'Currently handling active network deliveries.'}</p>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );

  const renderProfile = () => (
    <section className="dashboard-grid admin-dashboard-main">
      <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
        <div className="admin-section-head">
          <div>
            <h2>Admin Profile</h2>
            <p>Primary account information for the active ParcelOps administrator.</p>
          </div>
        </div>
        <div className="settings-summary-grid">
          <div className="settings-summary-item"><span>Name</span><strong>{user?.name || 'ParcelOps Admin'}</strong></div>
          <div className="settings-summary-item"><span>Email</span><strong>{user?.email || 'Not available'}</strong></div>
          <div className="settings-summary-item"><span>Role</span><strong>{user?.role || 'admin'}</strong></div>
          <div className="settings-summary-item"><span>Base City</span><strong>{user?.city || 'Not set'}</strong></div>
        </div>
      </article>

      <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
        <div className="admin-section-head">
          <div>
            <h2>Admin Settings</h2>
            <p>Quick access to profile and pricing controls.</p>
          </div>
        </div>
        <div className="admin-settings-list">
          <div className="admin-user-item"><span>Same-city base fare</span><strong>{formatCurrency(pricing.sameCity)}</strong></div>
          <div className="admin-user-item"><span>Cross-province fare</span><strong>{formatCurrency(pricing.differentProvince)}</strong></div>
          <div className="admin-user-item"><span>Per kg uplift</span><strong>{formatCurrency(pricing.perKgRate)}</strong></div>
          <div className="admin-user-item"><span>COD service fee</span><strong>{formatCurrency(pricing.codCharge)}</strong></div>
          <div className="admin-user-item"><span>Express multiplier</span><strong>{pricing.expressMultiplier}x</strong></div>
        </div>
        <button className="button-primary" onClick={() => navigate('/settings')} type="button">
          Open Full Settings
        </button>
      </article>
    </section>
  );

  const renderActiveView = () => {
    if (activeView === 'orders') return renderOrders();
    if (activeView === 'analytics') return renderAnalytics();
    if (activeView === 'users') return renderUsers();
    if (activeView === 'agents') return renderAgents();
    if (activeView === 'profile') return renderProfile();
    return renderOverview();
  };

  return (
    <PortalShell
      compactTitle
      hideTopNav
      headerUtility={
        <button className="button-ghost admin-notification-trigger" type="button">
          <span className="admin-notification-icon">NT</span>
          <span>Notifications</span>
          <strong>{recentActivity.length}</strong>
        </button>
      }
      title="Admin Operations"
      subtitle="A structured control panel for orders, analytics, teams, and admin settings across ParcelOps."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="glass-card section-card admin-workspace-header">
        <div className="admin-workspace-copy">
          <div className="admin-workspace-eyebrow">Admin Workspace</div>
          <h2>{activeMeta[1]}</h2>
          <p>{activeMeta[3]}</p>
        </div>
        <nav className="admin-view-nav">
          {adminViews.map(([key, label, icon]) => (
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
        {renderActiveView()}
      </div>

      {modal ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card compact" aria-labelledby="admin-modal-title" aria-modal="true" role="dialog">
            {modal.type === 'view' ? (
              <>
                <h3 id="admin-modal-title">Order Details</h3>
                <div className="admin-modal-grid">
                  <div><strong>Order ID</strong><span>{modal.pkg.trackingNumber}</span></div>
                  <div><strong>Status</strong><span>{modal.pkg.status}</span></div>
                  <div><strong>Sender</strong><span>{modal.pkg.senderSnapshot?.name || 'ParcelOps sender'}</span></div>
                  <div><strong>Receiver</strong><span>{modal.pkg.receiverName}</span></div>
                  <div><strong>Pickup</strong><span>{modal.pkg.pickupAddress}</span></div>
                  <div><strong>Destination</strong><span>{modal.pkg.deliveryAddress}</span></div>
                  <div><strong>Assigned Agent</strong><span>{modal.pkg.assignedAgent?.name || 'Unassigned'}</span></div>
                  <div><strong>Shipping Charge</strong><span>{formatCurrency(modal.pkg.shippingCharge)}</span></div>
                </div>
                <div className="modal-actions">
                  <button className="button-ghost" onClick={closeModal} type="button">Close</button>
                </div>
              </>
            ) : modal.type === 'assign' ? (
              <>
                <h3 id="admin-modal-title">Assign Agent</h3>
                <p>Select the courier who should handle `{modal.pkg.trackingNumber}`.</p>
                <div className="admin-modal-field">
                  <select onChange={(event) => setModalValue(event.target.value)} value={modalValue}>
                    <option value="">Select agent</option>
                    {agents.map((agent) => <option key={agent._id} value={agent._id}>{agent.name}</option>)}
                  </select>
                </div>
                <div className="modal-actions">
                  <button className="button-ghost" onClick={closeModal} type="button">Cancel</button>
                  <button className="button-secondary" disabled={busyKey === `assign:${modal.pkg._id}` || !modalValue} onClick={assignAgent} type="button">
                    {busyKey === `assign:${modal.pkg._id}` ? 'Assigning...' : 'Assign Agent'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 id="admin-modal-title">Update Status</h3>
                <p>
                  {modalValue === 'Cancelled'
                    ? `Confirm cancellation for ${modal.pkg.trackingNumber}. This should only be used for orders that will not move forward.`
                    : `Confirm the next operational status for ${modal.pkg.trackingNumber}.`}
                </p>
                <div className="admin-modal-field">
                  <select onChange={(event) => setModalValue(event.target.value)} value={modalValue}>
                    <option value="">Select status</option>
                    {adminStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="modal-actions">
                  <button className="button-ghost" onClick={closeModal} type="button">Back</button>
                  <button className={modalValue === 'Cancelled' ? 'button-danger' : 'button-primary'} disabled={busyKey === `status:${modal.pkg._id}` || !modalValue} onClick={updateStatus} type="button">
                    {busyKey === `status:${modal.pkg._id}` ? 'Updating...' : 'Confirm Update'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
};

export default AdminDashboard;
