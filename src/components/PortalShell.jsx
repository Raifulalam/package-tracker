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
  receiver: [
    { to: '/receiver', label: 'Incoming Parcels' },
    { to: '/settings', label: 'Settings' },
    { to: '/track', label: 'Track by Number' },
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
  if (role === 'receiver') return '/receiver';
  if (role === 'agent') return '/agent';
  if (role === 'admin') return '/admin';
  return '/dashboard';
}

const PortalShell = ({ title, subtitle, children, compactTitle = false, headerUtility = null, hideTopNav = false }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = navigationByRole[user?.role || 'sender'] || navigationByRole.sender;
  const initials = (user?.name || 'NepXpress')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="portal-shell">
      <div className="portal-background" />
      <header className={`portal-header${compactTitle ? ' compact-title' : ''}`}>
        <div className="portal-heading">
          <div className="portal-chip-list">
            <button className="portal-brand" onClick={() => navigate(resolveHome(user?.role))} type="button">
              NepXpress
            </button>
            <span className="portal-chip">Deliver Faster. Track Smarter.</span>
          </div>
          <p className="portal-kicker">Modern parcel delivery operations built for speed, visibility, and trust across Nepal.</p>
          <h1>{title}</h1>
          {subtitle ? <p className="portal-subtitle">{subtitle}</p> : null}
        </div>

        <div className="portal-userbox">
          <div className="portal-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="portal-usercopy">
            <strong>{user?.name || 'NepXpress User'}</strong>
            <span>{user?.role || 'workspace'}</span>
            {user?.city ? <span>{user.city}</span> : null}
            {user?.email ? <span>{user.email}</span> : null}
          </div>
          {headerUtility ? <div className="portal-utility">{headerUtility}</div> : null}
          <button className="portal-logout" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </header>

      {!hideTopNav ? (
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
      ) : null}

      <main className="portal-main">{children}</main>
    </div>
  );
};

export default PortalShell;
