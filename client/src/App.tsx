import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FamilyAuthProvider, useFamilyAuth } from './context/FamilyAuthContext';
import Login from './pages/Login';
import ProviderDashboard from './pages/ProviderDashboard';
import PatientDetail from './pages/PatientDetail';
import PatientDashboard from './pages/PatientDashboard';
import PatientInsights from './pages/PatientInsights';
import BiographyWelcome from './pages/BiographyWelcome';
import BiographyInterview from './pages/BiographyInterview';
import BiographyDraft from './pages/BiographyDraft';
import FamilyLogin from './pages/FamilyLogin';
import FamilyHome from './pages/FamilyHome';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'provider'
    ? <Navigate to="/provider" replace />
    : <Navigate to="/patient" replace />;
}

function RequireAuth({ children, role }: { children: React.ReactNode; role?: 'provider' | 'patient' }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Provider routes */}
          <Route path="/provider" element={
            <RequireAuth role="provider"><ProviderDashboard /></RequireAuth>
          } />
          <Route path="/provider/patients/:id" element={
            <RequireAuth role="provider"><PatientDetail /></RequireAuth>
          } />

          {/* Patient routes */}
          <Route path="/patient" element={
            <RequireAuth role="patient"><PatientDashboard /></RequireAuth>
          } />
          <Route path="/patient/insights" element={
            <RequireAuth role="patient"><PatientInsights /></RequireAuth>
          } />

          {/* Biography routes — no auth required */}
          <Route path="/biography" element={<BiographyWelcome />} />
          <Route path="/biography/interview/:id" element={<BiographyInterview />} />
          <Route path="/biography/draft/:id" element={<BiographyDraft />} />

          {/* Family todo app */}
          <Route path="/family/*" element={
            <FamilyAuthProvider>
              <FamilyRoutes />
            </FamilyAuthProvider>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function FamilyRoutes() {
  const { user, loading } = useFamilyAuth();

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <FamilyLogin />;
  return <FamilyHome />;
}
