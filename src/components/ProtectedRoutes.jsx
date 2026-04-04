import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ roles, children }) => {
  const { user, isAuthenticated, authReady } = useAuth();

  if (!authReady) {
    return <div className="auth-shell"><div className="auth-card">Checking your session...</div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : user?.role === 'agent' ? '/agent' : '/dashboard'} replace />;
  }

  return children;
};

export default ProtectedRoute;
