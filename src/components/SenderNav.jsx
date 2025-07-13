import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SenderNav = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav style={navStyles}>
            <Link to="/">🏠 Dashboard</Link>
            <Link to="/sender/create">➕ New Delivery</Link>
            <Link to="/sender/my-packages">📄 My Packages</Link>
            <button onClick={handleLogout}>🚪 Logout</button>
        </nav>
    );
};

const navStyles = {
    display: 'flex',
    justifyContent: 'space-around',
    background: '#333',
    color: 'white',
    padding: '10px',
    gap: '10px'
};

export default SenderNav;
