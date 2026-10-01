import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ScanProvider } from "./context/ScanContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Medicines from "./pages/Medicines";
import Prescriptions from "./pages/Prescriptions";
import PrescriptionDetail from "./pages/PrescriptionDetail";
import Pharmacists from "./pages/Pharmacists";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import ForgotPassword from "./pages/ForgotPassword";
import ComingSoon from "./pages/ComingSoon";
import Batches from "./pages/Batches";
import ExpiryManagement from "./pages/ExpiryManagement";
import Suppliers from "./pages/Suppliers"; // ✅ NEW
import Notifications from "./pages/Notifications"; // ✅ NEW

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ScanProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/medicines" element={<ProtectedRoute><Medicines /></ProtectedRoute>} />

            {/* Prescriptions */}
            <Route path="/prescriptions" element={<ProtectedRoute><Prescriptions /></ProtectedRoute>} />
            <Route path="/prescriptions/:id" element={<ProtectedRoute><PrescriptionDetail /></ProtectedRoute>} />

            {/* Other */}
            <Route path="/pharmacists" element={<ProtectedRoute><Pharmacists /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/batches" element={<ProtectedRoute><Batches /></ProtectedRoute>} />
            <Route path="/expiry" element={<ProtectedRoute><ExpiryManagement /></ProtectedRoute>} />

            {/* ✅ Suppliers */}
            <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />

            {/* ✅ Notifications */}
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

            {/* Coming Soon */}
            <Route path="/reorder" element={<ProtectedRoute><ComingSoon title="Auto-Reorder" /></ProtectedRoute>} />
            <Route path="/shipments" element={<ProtectedRoute><ComingSoon title="Shipments" /></ProtectedRoute>} />
            <Route path="/forecast" element={<ProtectedRoute><ComingSoon title="AI Forecast" /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ScanProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
