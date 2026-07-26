import { BrowserRouter, Routes, Route, Navigate } from "react-router";

// Layout & Protection
import Layout from "../components/layout/Layout";
import ProtectedRoute from "../components/layout/ProtectedRoute";

// Auth
import Login from "../pages/auth/Login";

// Owner Pages
import Dashboard from "../pages/owner/Dashboard";
import Collectors from "../pages/owner/Collectors";
import MilkCollections from "../pages/owner/MilkCollections";
import Reports from "../pages/owner/Reports";
import Notifications from "../pages/owner/Notifications";
import Settings from "../pages/owner/Settings";

// Collector Pages
import CollectorDashboard from "../pages/collector/Dashboard";
import History from "../pages/collector/History";
import CollectorNotifications from "../pages/collector/Notifications";
import Profile from "../pages/collector/Profile";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login Page */}
        <Route path="/login" element={<Login />} />

        {/* Protected Owner Routes */}
        <Route
          path="/owner"
          element={
            <ProtectedRoute allowedRole="OWNER">
              <Layout role="owner" />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="collectors" element={<Collectors />} />
          <Route path="milk-collections" element={<MilkCollections />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Protected Collector Routes */}
        <Route
          path="/collector"
          element={
            <ProtectedRoute allowedRole="COLLECTOR">
              <Layout role="collector" />
            </ProtectedRoute>
          }
        >
          <Route index element={<CollectorDashboard />} />
          <Route path="dashboard" element={<CollectorDashboard />} />
          <Route path="history" element={<History />} />
          <Route path="notifications" element={<CollectorNotifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Catch-all Route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}