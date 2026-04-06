import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
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
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import Profile from './pages/Profile'
import Schemes from './pages/Schemes'
import SchemeDetail from './pages/SchemeDetail'
import Apply from './pages/Apply'
import Eligibility from './pages/Eligibility'
import Applications from './pages/Applications'
import UploadDocuments from './pages/UploadDocuments'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminSchemes from './pages/admin/AdminSchemes'
import AdminApplications from './pages/admin/AdminApplications'

// Layout wrapper for admin routes
const AdminShell = () => (
  <ProtectedAdminRoute>
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  </ProtectedAdminRoute>
)

function App() {
  const setTokens = useAuthStore((state) => state.setTokens)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')
    const userRole = localStorage.getItem('user_role')
    const userId = localStorage.getItem('user_id')
    
    if (token && refreshToken) {
      setTokens(token, refreshToken, userRole, userId)
    }
  }, [setTokens])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />

        <Routes>
          {/* Public Routes (no navbar) */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

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
            <Route path="/schemes" element={<Schemes />} />
            <Route path="/schemes/:schemeId" element={<SchemeDetail />} />
            <Route path="/eligibility" element={<Eligibility />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/upload" element={<UploadDocuments />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
