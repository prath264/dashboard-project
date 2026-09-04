import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

function ProtectedRoute({
    children,
    allowedRoles = [],
}) {

    const {
        isAuthenticated,
        user,
        loading,
    } = useAuth();

    const location = useLocation();

    if (loading) {
        return (
            <div className="route-loading">
                Loading...
            </div>
        );
    }

    if (!isAuthenticated) {

        return (
            <Navigate
                to="/login"
                replace
                state={{
                    from: location,
                }}
            />
        );
    }

    if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(user?.role)
    ) {

        return (
            <Navigate
                to="/"
                replace
            />
        );
    }

    return children;
}

export default ProtectedRoute;