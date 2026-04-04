import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PortalShell.css';

const navigationByRole = {
  sender: [
    { to: '/dashboard', label: 'Overview' },
    { to: '/sender/create', label: 'Create Shipment' },
    { to: '/sender/my-packages', label: 'My Shipments' },
    { to: '/settings', label: 'Settings' },
    { to: '/track', label: 'Public Tracking' },
  ],
  agent: [
    { to: '/agent', label: 'Operations Board' },
    { to: '/settings', label: 'Settings' },
    { to: '/track', label: 'Tracking Search' },
  ],
  admin: [
    { to: '/admin', label: 'Control Tower' },
    { to: '/settings', label: 'Settings' },
    { to: '/track', label: 'Tracking Search' },
  ],
};

function resolveHome(role) {
  if (role === 'agent') return '/agent';
  if (role === 'admin') return '/admin';
  return '/dashboard';
}

const PortalShell = ({ title, subtitle, children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = navigationByRole[user?.role || 'sender'] || navigationByRole.sender;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="portal-shell">
      <div className="portal-background" />
      <header className="portal-header">
        <div>
          <button className="portal-brand" onClick={() => navigate(resolveHome(user?.role))}>
            ParcelOps
          </button>
          <p className="portal-kicker">Production-ready parcel tracking and delivery management</p>
          <h1>{title}</h1>
          {subtitle ? <p className="portal-subtitle">{subtitle}</p> : null}
        </div>
        <div className="portal-userbox">
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
            {user?.city ? <span>{user.city}</span> : null}
          </div>
          <button className="portal-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="portal-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) => `portal-navlink${isActive ? ' active' : ''}`}
            to={item.to}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="portal-main">{children}</main>
    </div>
  );
};

export default PortalShell;
