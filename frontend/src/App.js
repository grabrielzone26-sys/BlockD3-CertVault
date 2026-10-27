import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoadingAnimation from './components/LoadingAnimation';
import RouteAmbient3D from './components/3d/RouteAmbient3D';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';

// Dashboard Pages
import StudentDashboard from './pages/dashboard/StudentDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import VerifierDashboard from './pages/dashboard/VerifierDashboard';
import VerificationActivity from './pages/dashboard/VerificationActivity';

// Certificate Pages
import IssueCertificate from './pages/certificates/IssueCertificate';
import SubmitCertificateRequest from './pages/certificates/SubmitCertificateRequest';
import VerifyCertificate from './pages/certificates/VerifyCertificate';
import ViewCertificate from './pages/certificates/ViewCertificate';
import CertificatesList from './pages/certificates/CertificatesList';
import BatchCertificates from './pages/certificates/BatchCertificates';
import BatchVerifyCertificates from './pages/certificates/BatchVerifyCertificates';
import BatchDownloadCertificates from './pages/certificates/BatchDownloadCertificates';

// Profile Pages
import ProfilePage from './pages/profile/ProfilePage';
import TwoFactorSettings from './pages/profile/TwoFactorSettings';

// Public Pages
import PublicVerification from './pages/public/PublicVerification';
import NotFoundPage from './pages/NotFoundPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <LoadingAnimation
        variant="screen"
        kicker="BlockD3 CertVault"
        message="Verifying session authorization"
        subtext="Connecting to decentralized ledger network..."
      />
    );
  }

  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, isAdmin } = useAuth();
  return user && isAdmin() ? children : <Navigate to="/" />;
};


const App = () => {
  const { user, isAdmin, isVerifier } = useAuth();

  const getDashboardRoute = () => {
    if (!user) return '/login';
    if (isAdmin()) return '/admin';
    if (isVerifier()) return '/verifier';
    return '/student';
  };

  return (
    <ThemeProvider>
      <div className="app-scene-shell">
        <RouteAmbient3D />
        <Routes>
          <Route path="/verify" element={<PublicVerification />} />
          <Route path="/verify/:certificateId" element={<PublicVerification />} />

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
          </Route>

          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to={getDashboardRoute()} />} />

            <Route path="/student" element={
              <PrivateRoute>
                <StudentDashboard />
              </PrivateRoute>
            } />
            <Route path="/certificates" element={
              <PrivateRoute>
                <CertificatesList />
              </PrivateRoute>
            } />
            <Route path="/submit-certificate" element={
              <PrivateRoute>
                <SubmitCertificateRequest />
              </PrivateRoute>
            } />
            <Route path="/certificates/:id" element={
              <PrivateRoute>
                <ViewCertificate />
              </PrivateRoute>
            } />

            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/issue-certificate" element={
              <AdminRoute>
                <IssueCertificate />
              </AdminRoute>
            } />
            <Route path="/batch-certificates" element={
              <AdminRoute>
                <BatchCertificates />
              </AdminRoute>
            } />
            <Route path="/batch-verify" element={
              <PrivateRoute>
                <BatchVerifyCertificates />
              </PrivateRoute>
            } />
            <Route path="/batch-download" element={
              <AdminRoute>
                <BatchDownloadCertificates />
              </AdminRoute>
            } />

            <Route path="/verifier" element={
              <PrivateRoute>
                <VerifierDashboard />
              </PrivateRoute>
            } />
            <Route path="/verification-activity" element={
              <PrivateRoute>
                <VerificationActivity />
              </PrivateRoute>
            } />
            <Route path="/verify-certificate" element={
              <PrivateRoute>
                <VerifyCertificate />
              </PrivateRoute>
            } />
            <Route path="/verify-certificate/scan" element={
              <PrivateRoute>
                <VerifyCertificate />
              </PrivateRoute>
            } />

            <Route path="/profile" element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            } />
            <Route path="/profile/two-factor" element={
              <PrivateRoute>
                <TwoFactorSettings />
              </PrivateRoute>
            } />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
};

export default App;
