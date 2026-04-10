import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';
import './PortalShell.css';

const navigationByRole = {
  sender: [
    { to: '/dashboard', label: 'Overview' },
    { to: '/sender/create', label: 'Create Shipment' },
    { to: '/sender/my-packages', label: 'My Shipments' },
    { to: '/payments', label: 'Payments' },
    { to: '/settings', label: 'Settings' },
    { to: '/track', label: 'Public Tracking' },
  ],
  receiver: [
    { to: '/receiver', label: 'Incoming Parcels' },
    { to: '/payments', label: 'Payments' },
    { to: '/settings', label: 'Settings' },
    { to: '/track', label: 'Track by Number' },
  ],
  agent: [
    { to: '/agent', label: 'Operations Board' },
    { to: '/payments', label: 'Payments' },
    { to: '/settings', label: 'Settings' },
    { to: '/track', label: 'Tracking Search' },
  ],
  admin: [
    { to: '/admin', label: 'Control Tower' },
    { to: '/payments', label: 'Payments' },
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
  const initials = (user?.name || 'NexExpree')
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
      <div className="portal-container">
        <header className="portal-topbar">
          <button className="portal-brand brand-lockup" onClick={() => navigate(resolveHome(user?.role))} type="button">
            <img src="/nexexpree-logo.svg" alt="NexExpree logo" />
            <span>
              <strong>NexExpree</strong>
              <small>Courier control platform</small>
            </span>
          </button>

          <div className="portal-topbar-actions">
            <span className="portal-role-pill">{user?.role || 'workspace'}</span>
            {headerUtility}
            <NotificationCenter />
            <button className="portal-logout" onClick={handleLogout} type="button">
              Logout
            </button>
          </div>
        </header>

        <section className={`portal-hero glass-card${compactTitle ? ' compact-title' : ''}`}>
          <div className="portal-heading">
            <div className="portal-chip-list">
              <span className="portal-chip">Realtime logistics</span>
              <span className="portal-chip">Verified delivery</span>
              <span className="portal-chip">Role-based operations</span>
            </div>
            <p className="portal-kicker">NexExpree brings live tracking, verified delivery, and structured courier operations into one device-friendly workflow.</p>
            <h1>{title}</h1>
            {subtitle ? <p className="portal-subtitle">{subtitle}</p> : null}
          </div>

          <aside className="portal-userbox">
            <div className="portal-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="portal-usercopy">
              <strong>{user?.name || 'NexExpree User'}</strong>
              <span>{user?.email || 'No email connected'}</span>
              <span>{user?.phone || 'No phone on file'}</span>
              <span>{user?.city || user?.hub || 'Location not set'}</span>
            </div>
            <div className="portal-utility">
              <div className="portal-utility-card">
                <small>Current role</small>
                <strong>{user?.role || 'workspace'}</strong>
              </div>
              <div className="portal-utility-card">
                <small>Availability</small>
                <strong>{user?.isAvailable ? 'Online' : 'Standard'}</strong>
              </div>
            </div>
          </aside>
        </section>

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
    </div>
  );
};

export default PortalShell;
