import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationCenter from './NotificationCenter';
import './PortalShell.css';

const navigationByRole = {
  sender: [
    { to: '/dashboard', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { to: '/sender/create', label: 'Create Shipment', icon: 'M12 4v16m8-8H4' },
    { to: '/sender/my-packages', label: 'My Shipments', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { to: '/payments', label: 'Payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { to: '/track', label: 'Public Tracking', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { to: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ],
  agent: [
    { to: '/agent', label: 'Operations Board', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { to: '/earnings', label: 'Earnings', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-10V4m0 14v2m-7-7h14' },
    { to: '/payments', label: 'Payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { to: '/track', label: 'Tracking Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { to: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ],
  admin: [
    { to: '/admin', label: 'Control Tower', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z' },
    { to: '/payments', label: 'Payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { to: '/track', label: 'Tracking Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { to: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { to: '/earnings', label: 'Earnings', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-10V4m0 14v2m-7-7h14' },
    { to: '/orders', label: 'Orders', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { to: '/users', label: 'Users', icon: 'M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H11a4 4 0 00-4 4v2m10 0H7m8-10a4 4 0 11-8 0 4 4 0 018 0z' },
    { to: '/analytics', label: 'Analytics', icon: 'M4 19h16M7 16V8m5 8V5m5 11v-6' },
    { to: '/service', label: 'Manage Services', icon: 'M11.049 2.927c.3-1.14 1.603-1.14 1.902 0a1 1 0 00.95.74h1.06c1.2 0 1.7 1.54.73 2.25l-.86.63a1 1 0 00-.36 1.12l.33 1.02c.37 1.15-.96 2.1-1.94 1.4l-.9-.65a1 1 0 00-1.18 0l-.9.65c-.98.7-2.31-.25-1.94-1.4l.33-1.02a1 1 0 00-.36-1.12l-.86-.63c-.97-.71-.47-2.25.73-2.25h1.06a1 1 0 00.95-.74z' },
    { to: '/marketing', label: 'Marketing', icon: 'M11 5.882A1 1 0 0111.447 5h6.106A1 1 0 0119 6v12a1 1 0 01-1.447.894L11 15.618V18a1 1 0 11-2 0v-2.382l-3.553 3.276A1 1 0 014 18.171V5.829a1 1 0 011.447-.894L9 8.382V6a1 1 0 112 0v-.118z' }


  ],
};

function resolveHome(role) {
  if (role === 'agent') return '/agent';
  if (role === 'admin') return '/admin';
  return '/dashboard';
}

const PortalShell = ({ title, subtitle, children, headerUtility = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="portal-layout">
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && <div className="portal-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar Navigation */}
      <aside className={`portal-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="portal-sidebar-header">
          <button className="portal-brand" onClick={() => { navigate(resolveHome(user?.role)); setSidebarOpen(false); }} type="button">
            <span className="brand-logo">N</span>
            <span className="brand-text">NepXpress</span>
          </button>
        </div>

        <nav className="portal-sidenav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => `portal-nav-item ${isActive ? 'active' : ''}`}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="portal-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="portal-sidebar-footer">
          <div className="portal-user-profile">
            <div className="portal-avatar">{initials}</div>
            <div className="portal-user-info">
              <strong className="portal-user-name">{user?.name || 'User'}</strong>
              <span className="portal-user-role">{user?.role || 'Workspace'}</span>
            </div>
          </div>
          <button className="portal-nav-item text-danger" onClick={handleLogout}>
            <svg className="portal-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="portal-content-wrapper">
        <header className="portal-topbar">
          <div className="portal-topbar-left">
            <button className="portal-menu-btn" onClick={() => setSidebarOpen(true)}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="portal-page-titles">
              <h1 className="portal-page-title">{title}</h1>
              {subtitle && <p className="portal-page-subtitle">{subtitle}</p>}
            </div>
          </div>

          <div className="portal-topbar-actions">
            {headerUtility}
            <NotificationCenter />
            <div className="portal-topbar-avatar">{initials}</div>
          </div>
        </header>

        <main className="portal-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%', height: '100%' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default PortalShell;
