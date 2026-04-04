import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import PricingEditor from '../components/PricingEditor';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { getSocket } from '../lib/socket';

const adminStatuses = ['Approved', 'Scheduled', 'Assigned', 'Delayed', 'Exception', 'Cancelled', 'Delivered'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [overview, setOverview] = useState({ total: 0 });
  const [roleSummary, setRoleSummary] = useState({});
  const [pricing, setPricing] = useState({
    sameCity: 0,
    sameDistrict: 0,
    sameProvince: 0,
    differentProvince: 0,
    perKgRate: 0,
    expressMultiplier: 1,
    codCharge: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [assignmentDrafts, setAssignmentDrafts] = useState({});
  const [statusDrafts, setStatusDrafts] = useState({});
  const [busyKey, setBusyKey] = useState('');
  const [pricingBusy, setPricingBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const [usersResponse, packageResponse, pricingResponse] = await Promise.all([
          api.get('/api/admin/users', { token: user.token }),
          api.get('/api/admin/packages', { token: user.token }),
          api.get('/api/pricing', { token: user.token }),
        ]);

        if (!active) return;

        setUsers(usersResponse.data.users);
        setRoleSummary(usersResponse.data.byRole);
        setPackages(packageResponse.data.packages);
        setOverview(packageResponse.data.overview);
        setPricing(pricingResponse.data);
        setError('');
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

  const agentUsers = useMemo(() => users.filter((account) => account.role === 'agent'), [users]);

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

  const assignAgent = async (packageId) => {
    const agentId = assignmentDrafts[packageId];
    if (!agentId) return;

    setBusyKey(`assign:${packageId}`);
    try {
      await api.put(`/api/admin/assign/${packageId}`, { agentId }, { token: user.token });
      showToast('Agent assigned successfully.', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const updateStatus = async (packageId) => {
    const status = statusDrafts[packageId];
    if (!status) return;

    setBusyKey(`status:${packageId}`);
    try {
      await api.put(
        `/api/package/${packageId}/status`,
        { status, note: `Status updated by admin ${user.name}.` },
        { token: user.token }
      );
      showToast(`Shipment moved to ${status}.`, 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const deletePackage = async (packageId) => {
    setBusyKey(`delete:${packageId}`);

    try {
      await api.delete(`/api/admin/package/${packageId}`, { token: user.token });
      setPackages((prev) => prev.filter((pkg) => pkg._id !== packageId));
      showToast('Shipment removed from the network.', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const updatePricingField = (event) => {
    const { name, value } = event.target;
    setPricing((prev) => ({ ...prev, [name]: value }));
  };

  const savePricing = async (event) => {
    event.preventDefault();
    setPricingBusy(true);

    try {
      const response = await api.put('/api/pricing', pricing, { token: user.token });
      setPricing(response.data);
      showToast('Pricing configuration updated.', 'success');
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setPricingBusy(false);
    }
  };

  const statCards = [
    { label: 'Network shipments', value: overview.total || 0, note: 'Every shipment in the operational pipeline' },
    { label: 'Agents', value: roleSummary.agent || 0, note: 'Available field operators for dispatch' },
    { label: 'Senders', value: roleSummary.sender || 0, note: 'Customer accounts actively creating shipments' },
    { label: 'Delivered', value: overview.Delivered || 0, note: 'Closed shipments visible across the organization' },
  ];

  return (
    <PortalShell
      title="Admin Control Tower"
      subtitle="Monitor the entire delivery network, assign field agents, and manage shipment exceptions from a centralized operations desk."
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

      <section className="dashboard-grid" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
          <div className="toolbar">
            <input
              placeholder="Search by tracking number, receiver, or destination"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All statuses</option>
              <option value="Requested">Requested</option>
              <option value="Approved">Approved</option>
              <option value="Assigned">Assigned</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Delayed">Delayed</option>
              <option value="Exception">Exception</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {loading ? (
            <div className="empty-state">Loading network operations data...</div>
          ) : filteredPackages.length === 0 ? (
            <div className="empty-state">No shipments available for this filter set.</div>
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
                    <span>Agent: {pkg.assignedAgent?.name || 'Unassigned'}</span>
                    <span>Shipping charge: {formatCurrency(pkg.shippingCharge)}</span>
                  </div>

                  <div className="toolbar" style={{ marginTop: 16 }}>
                    <select
                      value={assignmentDrafts[pkg._id] || ''}
                      onChange={(event) =>
                        setAssignmentDrafts((prev) => ({ ...prev, [pkg._id]: event.target.value }))
                      }
                    >
                      <option value="">Assign agent</option>
                      {agentUsers.map((agent) => (
                        <option key={agent._id} value={agent._id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="button-secondary"
                      disabled={busyKey === `assign:${pkg._id}`}
                      onClick={() => assignAgent(pkg._id)}
                      type="button"
                    >
                      {busyKey === `assign:${pkg._id}` ? 'Assigning...' : 'Assign'}
                    </button>

                    <select
                      value={statusDrafts[pkg._id] || ''}
                      onChange={(event) =>
                        setStatusDrafts((prev) => ({ ...prev, [pkg._id]: event.target.value }))
                      }
                    >
                      <option value="">Set status</option>
                      {adminStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      className="button-primary"
                      disabled={busyKey === `status:${pkg._id}`}
                      onClick={() => updateStatus(pkg._id)}
                      type="button"
                    >
                      {busyKey === `status:${pkg._id}` ? 'Updating...' : 'Apply'}
                    </button>

                    <button
                      className="button-danger"
                      disabled={busyKey === `delete:${pkg._id}`}
                      onClick={() => deletePackage(pkg._id)}
                      type="button"
                    >
                      {busyKey === `delete:${pkg._id}` ? 'Removing...' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
        <PricingEditor
          disabled={false}
          loading={pricingBusy}
          onChange={updatePricingField}
          onSubmit={savePricing}
          pricing={pricing}
        />
      </section>

      <section className="dashboard-grid" style={{ marginTop: 18 }}>
        <aside className="glass-card section-card" style={{ gridColumn: 'span 12' }}>
          <h2>User distribution</h2>
          <div className="package-stack">
            {Object.entries(roleSummary).map(([role, count]) => (
              <div className="package-item" key={role}>
                <strong style={{ textTransform: 'capitalize' }}>{role}</strong>
                <p style={{ margin: '6px 0 0' }}>{count} account(s)</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </PortalShell>
  );
};

export default AdminDashboard;
