import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ roles, children }) => {
    const { user } = useAuth();

    if (!user || !roles.includes(user.user?.role)) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
