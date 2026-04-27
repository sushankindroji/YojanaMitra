import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useAuthStore } from './store/authStore'

// Components
import ErrorBoundary from './components/common/ErrorBoundary'
import ProtectedRoute from './components/common/ProtectedRoute'
import ProtectedAdminRoute from './components/common/ProtectedAdminRoute'
import OnboardingRouteGuard from './components/common/OnboardingRouteGuard'
import AdminLayout from './components/admin/AdminLayout'
import AppShell from './components/layout/AppShell'

// Pages
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Profile = lazy(() => import('./pages/Profile'))
const Schemes = lazy(() => import('./pages/Schemes'))
const SchemeDetail = lazy(() => import('./pages/SchemeDetail'))
const Apply = lazy(() => import('./pages/Apply'))
const Eligibility = lazy(() => import('./pages/Eligibility'))
const Applications = lazy(() => import('./pages/Applications'))
const UploadDocuments = lazy(() => import('./pages/UploadDocuments'))

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminSchemes = lazy(() => import('./pages/admin/AdminSchemes'))
const AdminApplications = lazy(() => import('./pages/admin/AdminApplications'))

// Layout wrapper for admin routes
const AdminShell = () => (
  <ProtectedAdminRoute>
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  </ProtectedAdminRoute>
)

const isValidToken = (value) =>
  typeof value === 'string' && value.trim().length > 0 && value !== 'undefined' && value !== 'null'

function App() {
  const setTokens = useAuthStore((state) => state.setTokens)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')
    const userRole = localStorage.getItem('user_role')
    const userId = localStorage.getItem('user_id')
    const onboardingIncomplete = localStorage.getItem('onboarding_incomplete')

    if (isValidToken(token) && isValidToken(refreshToken)) {
      setTokens(
        token,
        refreshToken,
        userRole,
        userId,
        onboardingIncomplete === null ? null : onboardingIncomplete === 'true'
      )
    }
  }, [setTokens])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop={true}
          limit={3}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />

        <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-body-sm text-stone-600">Loading...</div>}>
          <Routes>
            {/* Public Routes (no navbar) */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/schemes" element={<Schemes />} />
            <Route path="/schemes/:schemeId" element={<SchemeDetail />} />
            <Route path="/schemes/:id" element={<SchemeDetail />} />

            {/* Protected Routes - Onboarding (special layout, no navbar) */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingRouteGuard requireComplete={false}>
                    <Onboarding />
                  </OnboardingRouteGuard>
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Apply (special layout, no navbar) */}
            <Route
              path="/apply/:schemeId"
              element={
                <ProtectedRoute>
                  <OnboardingRouteGuard requireComplete>
                    <Apply />
                  </OnboardingRouteGuard>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes (with dedicated admin shell) */}
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="schemes" element={<AdminSchemes />} />
              <Route path="applications" element={<AdminApplications />} />
              <Route path="settings" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>

            {/* Protected Routes (with navbar + footer) */}
            <Route
              element={
                <ProtectedRoute>
                  <OnboardingRouteGuard requireComplete>
                    <AppShell />
                  </OnboardingRouteGuard>
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/eligibility" element={<Eligibility />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/documents" element={<UploadDocuments />} />
              <Route path="/upload" element={<UploadDocuments />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
