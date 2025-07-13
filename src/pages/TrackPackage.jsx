import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); // Replace with your backend URL if hosted

const TrackPackage = () => {
    const { user } = useAuth();
    const [packageId, setPackageId] = useState('');
    const [trackingData, setTrackingData] = useState(null);
    const [error, setError] = useState('');

    const handleTrack = async () => {
        if (!packageId) return;
        try {
            const res = await axios.get(`http://localhost:5000/api/package/${packageId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setTrackingData(res.data);
            setError('');
        } catch (err) {
            setError('Package not found or access denied');
            setTrackingData(null);
        }
    };

    useEffect(() => {
        socket.on('packageUpdate', (pkg) => {
            if (pkg._id === trackingData?._id) {
                setTrackingData(pkg);
            }
        });

        return () => socket.disconnect();
    }, [trackingData]);

    return (
        <div style={styles.container}>
            <h2>Track Your Package</h2>
            <input
                type="text"
                placeholder="Enter Package ID"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                style={styles.input}
            />
            <button onClick={handleTrack} style={styles.button}>Track</button>
            {error && <p style={styles.error}>{error}</p>}

            {trackingData && (
                <div style={styles.resultBox}>
                    <p><strong>Receiver:</strong> {trackingData.receiverName}</p>
                    <p><strong>Address:</strong> {trackingData.receiverAddress}</p>
                    <p><strong>Current Status:</strong> {trackingData.currentStatus}</p>
                    <h4>Status History:</h4>
                    <ul>
                        {trackingData.statusUpdates.map((update, idx) => (
                            <li key={idx}>
                                <strong>{update.status}</strong> — {new Date(update.timestamp).toLocaleString()}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '600px',
        margin: '30px auto',
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '10px',
        textAlign: 'center'
    },
    input: {
        padding: '10px',
        width: '70%',
        marginRight: '10px'
    },
    button: {
        padding: '10px 20px',
        cursor: 'pointer'
    },
    error: {
        color: 'red',
        marginTop: '10px'
    },
    resultBox: {
        marginTop: '20px',
        textAlign: 'left'
    }
};

export default TrackPackage;
