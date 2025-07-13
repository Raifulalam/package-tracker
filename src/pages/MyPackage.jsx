import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import SenderNav from '../components/SenderNav';
import { Link } from 'react-router-dom';

const MyPackages = () => {
    const { user } = useAuth();
    const [packages, setPackages] = useState([]);

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/package/mine`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setPackages(res.data?.data || []); // assuming response shape is { data: [...] }
            } catch (error) {
                console.error("Failed to fetch packages:", error.response?.data || error.message);
                alert("Failed to fetch packages: " + (error.response?.data?.message || error.message));
            }
        };

        if (user?.token) {
            fetchPackages(); // ✅ correct function name
        }
    }, [user?.token]);

    return (
        <>
            <SenderNav />
            <div style={{ padding: '20px' }}>
                <h2>My Deliveries</h2>
                {packages.length === 0 ? (
                    <p>No deliveries found.</p>
                ) : (
                    <ul>
                        {packages.map((pkg, index) => (
                            <li key={pkg._id || pkg.id || index}>
                                <strong>{pkg.receiverName}</strong> - {pkg.currentStatus || pkg.status || 'Requested'}
                                <br />
                                <Link to={`/sender/track/${pkg._id || pkg.id}`}>Track</Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
};

export default MyPackages;
