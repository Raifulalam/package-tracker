import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import SenderNav from '../components/SenderNav';
import './TrackDelivery.css'; // Create this CSS file for styling

const socket = io('http://localhost:5000');

const TrackDelivery = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [pkg, setPkg] = useState(null);
    const [error, setError] = useState(null);

    const fetchPackage = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/package/${id}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setPkg(res.data);
        } catch (err) {
            console.error('Error fetching package:', err.response?.data || err.message);
            setError('Failed to fetch package. Please try again.');
        }
    };

    useEffect(() => {
        if (!user?.token || !id) return;

        fetchPackage();

        socket.on('packageUpdate', (updatedPkg) => {
            if ((updatedPkg._id || updatedPkg.id) === id) {
                setPkg(updatedPkg);
            }
        });

        return () => socket.off('packageUpdate');
    }, [id, user]);

    if (!user?.token) return <p>Authenticating...</p>;
    if (error) return <p className="error-text">{error}</p>;
    if (!pkg) return <p>Loading package...</p>;

    return (
        <>
            <SenderNav />
            <div className="track-container">
                <h2>📦 Package Tracking</h2>

                <div className="card">
                    <h3>📌 Delivery Details</h3>
                    <p><strong>Pickup Address:</strong> {pkg.pickupAddress}</p>
                    <p><strong>Delivery Address:</strong> {pkg.deliveryAddress}</p>
                    <p><strong>Item Type:</strong> {pkg.itemType}</p>
                    <p><strong>Weight:</strong> {pkg.weight}</p>
                    <p><strong>Delivery Type:</strong> {pkg.deliveryType}</p>
                    <p><strong>Instructions:</strong> {pkg.instructions || 'None'}</p>
                    <p><strong>Current Status:</strong> <span className={`status-tag ${pkg.status.toLowerCase().replace(/\s+/g, '-')}`}>{pkg.status}</span></p>
                </div>

                <div className="card">
                    <h3>👤 Receiver Details</h3>
                    <p><strong>Name:</strong> {pkg.receiverName}</p>
                    <p><strong>Phone:</strong> {pkg.receiverPhone}</p>
                </div>

                {pkg.assignedAgent ? (
                    <div className="card">
                        <h3>🚚 Assigned Agent</h3>
                        <p><strong>Name:</strong> {pkg.assignedAgent.name}</p>
                        <p><strong>Email:</strong> {pkg.assignedAgent.email}</p>
                        <p><strong>Phone:</strong> {pkg.assignedAgent.phone}</p>
                    </div>
                ) : (
                    <div className="card">
                        <h3>🚚 Assigned Agent</h3>
                        <p>No agent assigned yet.</p>
                    </div>
                )}

                <div className="card">
                    <h3>📈 Status Updates</h3>
                    {pkg.statusUpdates?.length > 0 ? (
                        <ul className="status-list">
                            {pkg.statusUpdates.map((s, i) => (
                                <li key={i}>
                                    <span className="status-label">{s.status}</span>
                                    <span className="timestamp">{new Date(s.timestamp).toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No status updates yet.</p>
                    )}
                </div>
            </div>
        </>
    );
};

export default TrackDelivery;
