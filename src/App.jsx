import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ScanProvider } from "./context/ScanContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// ─── Lazy-loaded pages (code splitting → smaller initial bundle) ───────────
const Login           = lazy(() => import("./pages/Login"));
const Dashboard       = lazy(() => import("./pages/Dashboard"));
const Medicines       = lazy(() => import("./pages/Medicines"));
const Billing         = lazy(() => import("./pages/Billing"));
const Prescriptions   = lazy(() => import("./pages/Prescriptions"));
const PrescriptionDetail = lazy(() => import("./pages/PrescriptionDetail"));
const Pharmacists     = lazy(() => import("./pages/Pharmacists"));
const Reports         = lazy(() => import("./pages/Reports"));
const Analytics       = lazy(() => import("./pages/Analytics"));
const Profile         = lazy(() => import("./pages/Profile"));
const Settings        = lazy(() => import("./pages/Settings"));
const ForgotPassword  = lazy(() => import("./pages/ForgotPassword"));
const ComingSoon      = lazy(() => import("./pages/ComingSoon"));
const Batches         = lazy(() => import("./pages/Batches"));
const ExpiryManagement = lazy(() => import("./pages/ExpiryManagement"));
const Suppliers       = lazy(() => import("./pages/Suppliers"));
const Notifications   = lazy(() => import("./pages/Notifications"));

// ─── Page-level loading fallback ──────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#0284c7] border-t-transparent animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading…</p>
      </div>
    </div>
  );
}

// ─── Wrap a route element with its own ErrorBoundary + Suspense ───────────
function Page({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ScanProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login"           element={<Page><Login /></Page>} />
          <Route path="/signup"          element={<Page><Login /></Page>} />
          <Route path="/forgot-password" element={<Page><ForgotPassword /></Page>} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<Page><ProtectedRoute><Dashboard /></ProtectedRoute></Page>} />
          <Route path="/medicines"  element={<Page><ProtectedRoute><Medicines /></ProtectedRoute></Page>} />
          <Route path="/billing"    element={<Page><ProtectedRoute><Billing /></ProtectedRoute></Page>} />

          {/* Prescriptions */}
          <Route path="/prescriptions"    element={<Page><ProtectedRoute><Prescriptions /></ProtectedRoute></Page>} />
          <Route path="/prescriptions/:id" element={<Page><ProtectedRoute><PrescriptionDetail /></ProtectedRoute></Page>} />

          {/* Other */}
          <Route path="/pharmacists"  element={<Page><ProtectedRoute><Pharmacists /></ProtectedRoute></Page>} />
          <Route path="/reports"      element={<Page><ProtectedRoute><Reports /></ProtectedRoute></Page>} />
          <Route path="/analytics"    element={<Page><ProtectedRoute><Analytics /></ProtectedRoute></Page>} />
          <Route path="/profile"      element={<Page><ProtectedRoute><Profile /></ProtectedRoute></Page>} />
          <Route path="/settings"     element={<Page><ProtectedRoute><Settings /></ProtectedRoute></Page>} />
          <Route path="/batches"      element={<Page><ProtectedRoute><Batches /></ProtectedRoute></Page>} />
          <Route path="/expiry"       element={<Page><ProtectedRoute><ExpiryManagement /></ProtectedRoute></Page>} />

          {/* Suppliers */}
          <Route path="/suppliers"    element={<Page><ProtectedRoute><Suppliers /></ProtectedRoute></Page>} />

          {/* Notifications */}
          <Route path="/notifications" element={<Page><ProtectedRoute><Notifications /></ProtectedRoute></Page>} />

          {/* Coming Soon */}
          <Route path="/shipments" element={<Page><ProtectedRoute><ComingSoon title="Shipments" /></ProtectedRoute></Page>} />
          <Route path="/forecast"  element={<Page><ProtectedRoute><ComingSoon title="AI Forecast" /></ProtectedRoute></Page>} />

          {/* Fallback */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ScanProvider>
    </ErrorBoundary>
  );
}

export default App;
