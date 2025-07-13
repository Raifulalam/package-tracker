import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AgentDashboard.css';

const AgentDashboard = () => {
    const { user } = useAuth();
    const [packages, setPackages] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [statusFilter, setStatusFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPackages = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/agent/assigned', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setPackages(res.data); // backend sends array directly
        } catch (err) {
            console.error('Error fetching packages:', err.response?.data || err.message);
            alert("Failed to fetch packages");
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await axios.put(`http://localhost:5000/api/package/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchPackages(); // Refresh packages
        } catch (err) {
            alert("Status update failed");
        }
    };

    useEffect(() => {
        fetchPackages();
    }, []);

    useEffect(() => {
        let data = [...packages];
        if (statusFilter !== 'All') {
            data = data.filter(p => p.currentStatus === statusFilter);
        }
        if (searchTerm.trim()) {
            data = data.filter(p =>
                p.receiverName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFiltered(data);
    }, [packages, statusFilter, searchTerm]);

    return (
        <div className="agent-dashboard">
            <h2>🚚 Agent Dashboard</h2>

            <div className="filters">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="All">All</option>
                    <option value="Pending">Pending</option>
                    <option value="Picked Up">Picked Up</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                </select>

                <input
                    type="text"
                    placeholder="Search by receiver"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filtered.length === 0 ? (
                <p>No packages found.</p>
            ) : (
                <div className="package-list">
                    {filtered.map(pkg => (
                        <div key={pkg._id} className="package-card">
                            <h3>{pkg.receiverName}</h3>
                            <p><strong>Delivery Address:</strong> {pkg.deliveryAddress}</p>
                            <p><strong>Status:</strong> <span className={`status ${pkg.currentStatus.toLowerCase().replace(/\s/g, '-')}`}>{pkg.currentStatus}</span></p>

                            <div className="actions">
                                <button onClick={() => updateStatus(pkg._id, 'Picked Up')}>Picked Up</button>
                                <button onClick={() => updateStatus(pkg._id, 'In Transit')}>In Transit</button>
                                <button onClick={() => updateStatus(pkg._id, 'Delivered')}>Delivered</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AgentDashboard;
