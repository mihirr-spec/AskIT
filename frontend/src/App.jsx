import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import UserDashboard from './pages/UserDashboard'
import LandingPage from './pages/LandingPage'

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, role } = useAuth()
  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && role !== requiredRole) return <Navigate to={role === 'admin' ? '/dashboard' : '/chat'} replace />
  return children
}

export default function App() {
  const { user, role, loading } = useAuth()
  
  if (loading) return <div className="loading-center"><div className="spinner" /><span>Initializing...</span></div>

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={role === 'admin' ? '/dashboard' : '/chat'} replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/organization" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/members" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
