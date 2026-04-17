import { useCallback, useEffect, useMemo, useState } from 'react';
import PortalShell from '../components/PortalShell';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/formatters';

const emptyPayload = { users: [], byRole: {} };

const AdminUsers = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [payload, setPayload] = useState(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({ role: 'sender', hub: '', isActive: true });
  const [busyKey, setBusyKey] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/users', { token: user.token });
      setPayload(response.data || emptyPayload);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payload.users.filter((item) => {
      if (roleFilter !== 'All' && item.role !== roleFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        item.name,
        item.email,
        item.phone,
        item.hub,
        item.city,
        item.country,
      ].some((field) => String(field || '').toLowerCase().includes(query));
    });
  }, [payload.users, roleFilter, search]);

  const activeUsers = payload.users.filter((item) => item.isActive).length;
  const inactiveUsers = payload.users.length - activeUsers;

  const cards = [
    ['Total users', payload.users.length, 'info', 'All registered admin, agent, and sender accounts.'],
    ['Active users', activeUsers, 'success', 'Accounts currently allowed to sign in and work.'],
    ['Inactive users', inactiveUsers, 'danger', 'Accounts paused from using the platform.'],
    ['Agents', payload.byRole.agent || 0, 'warning', 'Delivery staff available in the system.'],
  ];

  const openEditor = (item) => {
    setSelectedUser(item);
    setForm({
      role: item.role,
      hub: item.hub || '',
      isActive: Boolean(item.isActive),
    });
  };

  const saveUser = async () => {
    if (!selectedUser) return;

    setBusyKey(selectedUser._id);
    try {
      await api.patch(`/api/admin/users/${selectedUser._id}`, form, { token: user.token });
      showToast('User updated successfully.', 'success');
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  };

  return (
    <PortalShell
      title="User Management"
      subtitle="Review the account directory, filter by role, and update active status, role, or hub assignment from one admin screen."
    >
      {error ? <div className="auth-error">{error}</div> : null}

      <section className="admin-summary-grid">
        {cards.map(([label, value, tone, copy]) => (
          <article className="glass-card metric-card admin-summary-card" key={label}>
            <small>{label}</small>
            <strong>{loading ? '...' : value}</strong>
            <p>{copy}</p>
            <span className={`admin-summary-icon tone-${tone}`}>{String(label).slice(0, 2).toUpperCase()}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid admin-dashboard-main" style={{ marginTop: 18 }}>
        <article className="glass-card section-card" style={{ gridColumn: 'span 8' }}>
          <div className="admin-section-head">
            <div>
              <h2>User directory</h2>
              <p>Search by name, email, phone, hub, or location and edit any account from the directory.</p>
            </div>
          </div>

          <div className="admin-filter-bar compact">
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Search users by name, email, phone, or hub" value={search} />
            <select onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}>
              <option value="All">All roles</option>
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
              <option value="sender">Sender</option>
            </select>
          </div>

          {loading ? (
            <div className="empty-state">Loading user directory...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state">No users match your current search and role filter.</div>
          ) : (
            <div className="admin-user-directory">
              {filteredUsers.map((item) => (
                <div className="admin-user-directory-item" key={item._id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.email}</span>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                      <StatusBadge status={item.role} />
                      <StatusBadge status={item.isActive ? 'Available' : 'Unavailable'} />
                    </div>
                  </div>

                  <div className="admin-user-directory-meta">
                    <small>{item.phone || 'No phone'}</small>
                    <small>Hub: {item.hub || 'Unassigned'}</small>
                    <small>Seen: {formatDateTime(item.lastSeenAt)}</small>
                    <button className="button-secondary" onClick={() => openEditor(item)} type="button">Edit user</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="glass-card section-card" style={{ gridColumn: 'span 4' }}>
          <div className="admin-section-head">
            <div>
              <h2>Role distribution</h2>
              <p>Quick visibility into how your account base is split across roles.</p>
            </div>
          </div>

          <div className="workspace-action-list">
            {['admin', 'agent', 'sender'].map((role) => (
              <div className="admin-history-item" key={role}>
                <div className="admin-user-item">
                  <span style={{ textTransform: 'capitalize' }}>{role}</span>
                  <strong>{payload.byRole[role] || 0}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {selectedUser ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" aria-modal="true" role="dialog">
            <h3>Edit user</h3>
            <p>Update role, operating hub, and whether the account is active.</p>

            <div className="admin-modal-grid">
              <div><strong>Name</strong><span>{selectedUser.name}</span></div>
              <div><strong>Email</strong><span>{selectedUser.email}</span></div>
            </div>

            <div className="workspace-action-list" style={{ marginTop: 16 }}>
              <div className="field-group">
                <span>Role</span>
                <select onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} value={form.role}>
                  <option value="admin">Admin</option>
                  <option value="agent">Agent</option>
                  <option value="sender">Sender</option>
                </select>
              </div>

              <div className="field-group">
                <span>Hub</span>
                <input onChange={(event) => setForm((current) => ({ ...current, hub: event.target.value }))} value={form.hub} />
              </div>

              <label className="field-group">
                <span>Account status</span>
                <select onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'true' }))} value={String(form.isActive)}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <button className="button-ghost" onClick={() => setSelectedUser(null)} type="button">Cancel</button>
              <button className="button-primary" disabled={busyKey === selectedUser._id} onClick={saveUser} type="button">
                {busyKey === selectedUser._id ? 'Saving...' : 'Save user'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
};

export default AdminUsers;
