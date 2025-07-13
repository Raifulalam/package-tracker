import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import './AdminDashboard.css';

const socket = io('http://localhost:5000');

const AdminDashboard = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [packages, setPackages] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [statusFilter, setStatusFilter] = useState('All');

    const [selectedPackage, setSelectedPackage] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const agentUsers = users.filter(u => u.role === 'agent');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userRes = await axios.get('http://localhost:5000/api/admin/users', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const packageRes = await axios.get('http://localhost:5000/api/admin/packages', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });

                setUsers(userRes.data);
                setPackages(packageRes.data);
            } catch (err) {
                console.error('Error fetching admin data', err);
            }
        };
        fetchData();
    }, [user.token]);

    useEffect(() => {
        setFiltered(
            statusFilter === 'All'
                ? packages
                : packages.filter(pkg => pkg.status === statusFilter)
        );
    }, [packages, statusFilter]);

    useEffect(() => {
        socket.on('packageUpdate', (updatedPkg) => {
            setPackages(prev =>
                prev.map(p => (p._id === updatedPkg._id ? updatedPkg : p))
            );
        });
        return () => socket.off('packageUpdate');
    }, []);

    const approvePackage = async (pkgId) => {
        try {
            await axios.put(`http://localhost:5000/api/package/${pkgId}/status`, {
                status: 'Approved'
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
        } catch (err) {
            alert(err.response?.data?.message || 'Approval failed');
        }
    };

    const removePackage = async (pkgId) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/admin/package/${pkgId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setPackages(prev => prev.filter(p => p._id !== pkgId));
        } catch (err) {
            alert('Failed to delete package');
        }
    };

    const openAssignModal = (pkg) => {
        setSelectedPackage(pkg);
        setShowModal(true);
    };

    const assignAgent = async (agentId) => {
        try {
            await axios.put(`http://localhost:5000/api/admin/assign/${selectedPackage._id}`, {
                agentId
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            // Refresh updated packages from server
            const res = await axios.get('http://localhost:5000/api/admin/packages', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setPackages(res.data);

            setShowModal(false);
            setSelectedPackage(null);
        } catch (err) {
            alert('Failed to assign agent');
        }
    };


    return (
        <div className="admin-dashboard">
            <h2>📊 Admin Panel</h2>

            <div className="filter-section">
                <label>Filter by Status:</label>
                <select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
                    <option value="All">All</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Delivered">Delivered</option>
                </select>
            </div>

            <div className="grid">
                <div className="packages-section">
                    <h3>📦 Packages</h3>
                    {filtered.map(pkg => (
                        <div key={pkg._id} className="package-card">
                            <div className="package-header">
                                <strong>{pkg.receiverName}</strong>
                                <span className={`status status-${pkg.status.replace(/\s+/g, '-').toLowerCase()}`}>{pkg.status}</span>
                            </div>

                            {pkg.assignedAgent ? (
                                <div className="assigned-agent">
                                    <p><strong>Agent:</strong> {pkg.assignedAgent.name}</p>
                                    <p><strong>Phone:</strong> {pkg.assignedAgent.phone}</p>
                                    <p><strong>Email:</strong> {pkg.assignedAgent.email}</p>
                                </div>
                            ) : (
                                <p>👤 <em>No agent assigned</em></p>
                            )}

                            <div className="actions">
                                <button onClick={() => approvePackage(pkg._id)} className="btn btn-approve">✅ Approve</button>
                                <button onClick={() => removePackage(pkg._id)} className="btn btn-remove">🗑 Remove</button>
                                {!pkg.assignedAgent && (
                                    <button onClick={() => openAssignModal(pkg)} className="btn btn-assign">📦 Assign Agent</button>
                                )}
                            </div>

                            {pkg.statusUpdates && pkg.statusUpdates.length > 0 && (
                                <ul className="status-history">
                                    {pkg.statusUpdates.map((s, i) => (
                                        <li key={i}>{s.status} - {new Date(s.timestamp).toLocaleString()}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>

                <div className="users-section">
                    <h3>👤 Users</h3>
                    <ul>
                        {users.map(u => (
                            <li key={u._id}>{u.name} — {u.role}</li>
                        ))}
                    </ul>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Select Agent</h3>
                        {agentUsers.map(agent => (
                            <div key={agent._id} className="agent-option">
                                {agent.name} ({agent.email})
                                <button onClick={() => assignAgent(agent._id)} className="btn btn-assign">Assign</button>
                            </div>
                        ))}
                        <button onClick={() => setShowModal(false)} className="btn btn-cancel">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
