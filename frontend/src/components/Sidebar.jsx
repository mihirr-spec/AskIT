import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

const ADMIN_NAV = [
  { icon: '⊞', label: 'Dashboard', path: '/dashboard' },
  { icon: '🏢', label: 'Organization', path: '/organization' },
  { icon: '👥', label: 'Members', path: '/members' },
  { icon: '📄', label: 'Documents', path: '/documents' },
  { icon: '📊', label: 'Analytics', path: '/analytics' },
]

const USER_NAV = [
  { icon: '💬', label: 'Chat', path: '/chat' },
]

export default function Sidebar() {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [theme, setTheme] = useState('dark')

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next === 'light' ? 'light' : '')
    setTheme(next)
  }

  const navItems = role === 'admin' ? ADMIN_NAV : USER_NAV

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const emailInitial = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>🧭 Knowledge Navigator</h1>
        <p>{role === 'admin' ? '🏢 Admin Portal' : '👤 User Portal'}</p>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map(item => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div className="divider" />
        <div className="nav-section-label">System</div>

        <button className="nav-item" onClick={toggleTheme}>
          <span className="nav-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        {role === 'admin' && (
          <button className="nav-item" onClick={() => navigate('/chat')}>
            <span className="nav-icon">💬</span>
            Try Chat View
          </button>
        )}
        {role !== 'admin' && (
          <div className="nav-item" style={{ cursor: 'default', opacity: 0.5 }}>
            <span className="nav-icon">🧭</span>
            Agentic RAG
          </div>
        )}
      </nav>

      <div className="sidebar-bottom">
        <div className="user-pill">
          <div className="user-avatar">{emailInitial}</div>
          <div className="user-info">
            <div className="user-email">{user?.email}</div>
            <div className="user-role">{role}</div>
          </div>
          <button className="sign-out-btn" onClick={handleSignOut} title="Sign out">⏻</button>
        </div>
      </div>
    </aside>
  )
}
