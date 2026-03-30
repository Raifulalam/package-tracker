import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SenderNav = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav style={styles.nav}>
            <div style={styles.navLeft}>
                <NavLink to="/dashboard" style={styles.navLink} activeStyle={styles.activeLink}>🏠 Dashboard</NavLink>
                <NavLink to="/sender/create" style={styles.navLink} activeStyle={styles.activeLink}>➕ New Delivery</NavLink>
                <NavLink to="/sender/my-packages" style={styles.navLink} activeStyle={styles.activeLink}>📄 My Packages</NavLink>
            </div>
            <div style={styles.navRight}>
                <button style={styles.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
            </div>
        </nav>
    );
};

const styles = {
    nav: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(90deg, #2c3e50, #34495e)',
        padding: '12px 20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        flexWrap: 'wrap',
    },
    navLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        flexWrap: 'wrap',
    },
    navRight: {
        display: 'flex',
        alignItems: 'center',
    },
    navLink: {
        color: '#ecf0f1',
        textDecoration: 'none',
        fontWeight: '500',
        padding: '8px 12px',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
    },
    activeLink: {
        backgroundColor: '#16a085',
        color: 'white',
    },
    logoutBtn: {
        backgroundColor: '#e74c3c',
        border: 'none',
        padding: '8px 16px',
        color: 'white',
        fontWeight: 600,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    }
};

export default SenderNav;
