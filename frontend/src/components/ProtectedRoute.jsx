import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, hydrating } = useAuth();
    const location = useLocation();

    if (hydrating) return null;
    if (!isAuthenticated) {
        return <Navigate to="/parent-auth" replace state={{ from: location.pathname }} />;
    }
    return children;
}
