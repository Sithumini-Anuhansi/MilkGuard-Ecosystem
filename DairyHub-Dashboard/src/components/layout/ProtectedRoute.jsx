import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ allowedRole, children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}
