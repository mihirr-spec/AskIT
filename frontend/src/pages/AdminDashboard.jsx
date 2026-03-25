import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api, { uploadDocument, ingestUrl } from '../lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const NAV_ITEMS = [
  { label: 'DASHBOARD', path: '/dashboard', icon: '⊞' },
  { label: 'ORGANIZATION', path: '/organization', icon: '🏢' },
  { label: 'MEMBERS', path: '/members', icon: '👥' },
  { label: 'DOCUMENTS', path: '/documents', icon: '📄' },
  { label: 'ANALYTICS', path: '/analytics', icon: '📊' },
]

const safe = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback)
const humanDate = (v) => v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
  .ar *{box-sizing:border-box;margin:0;padding:0}
  .ar{display:flex;min-height:100vh;background:#0b0c10;color:#f5f5f5;font-family:Inter,system-ui,sans-serif}
  /* SIDEBAR */
  .ar-sidebar{width:220px;background:#0a0b10;border-right:1px solid #1f222b;display:flex;flex-direction:column;position:fixed;top:0;bottom:0;left:0;z-index:100}
  .ar-brand{padding:24px 20px 16px;border-bottom:1px solid #1f222b}
  .ar-brand h1{font-family:'DM Serif Display',serif;font-size:22px;font-style:italic;color:#f1f5f9}
  .ar-brand p{font-size:9px;letter-spacing:1.5px;color:#475569;margin-top:4px}
  .ar-nav{padding:16px 10px;flex:1;display:flex;flex-direction:column;gap:2px}
  .ar-nav-btn{width:100%;display:flex;gap:10px;align-items:center;padding:10px 12px;border:none;border-left:2px solid transparent;background:transparent;color:#94a3b8;font-size:10px;letter-spacing:1px;font-weight:700;cursor:pointer;border-radius:0 4px 4px 0;transition:.15s;text-align:left}
  .ar-nav-btn.active{background:#1a1b26;color:#f1f5f9;border-left-color:#a5b4fc}
  .ar-nav-btn:hover{background:#15161e;color:#e2e8f0}
  .ar-sidebar-bottom{padding:14px 12px;border-top:1px solid #1f222b;display:flex;flex-direction:column;gap:8px}
  .ar-profile-btn{background:transparent;border:1px solid #1f222b;color:#94a3b8;padding:9px 12px;font-size:10px;letter-spacing:1px;font-weight:700;cursor:pointer;width:100%;text-align:left;transition:.15s}
  .ar-profile-btn:hover{background:#1e2029;color:#fff}
  .ar-profile-dropdown{position:fixed;bottom:80px;left:10px;width:200px;background:#0a0b10;border:1px solid #1f222b;padding:16px;z-index:200;box-shadow:0 10px 40px rgba(0,0,0,.6);animation:slideUp .2s ease}
  @keyframes slideUp{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
  .ar-p-label{font-size:8px;color:#475569;letter-spacing:1.5px;margin-bottom:4px;text-transform:uppercase;font-weight:700}
  .ar-p-val{font-size:12px;font-weight:600;color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:12px}
  .ar-logout-btn{width:100%;background:transparent;border:1px solid rgba(239,68,68,.3);color:#ef4444;padding:8px;font-size:10px;letter-spacing:1px;cursor:pointer}
  /* MAIN */
  .ar-main{flex:1;margin-left:220px;padding:28px 32px 40px;min-height:100vh}
  .ar-topbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
  .ar-page-title{font-family:'DM Serif Display',serif;font-size:40px;font-style:italic;text-transform:capitalize;color:#f1f5f9}
  .ar-page-sub{font-size:11px;color:#64748b;margin-top:4px;letter-spacing:.5px}
  .ar-health{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:1px}
  .ar-dot{width:7px;height:7px;border-radius:50%;display:inline-block}
  /* CARDS */
  .ar-card{background:#14151a;border:1px solid #1f222b;border-radius:4px;padding:20px}
  .ar-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
  .ar-stat-label{font-size:9px;color:#64748b;letter-spacing:1.5px;font-weight:700;margin-bottom:12px}
  .ar-stat-val{font-size:32px;font-family:'DM Serif Display',serif;color:#f1f5f9}
  .ar-split{display:grid;grid-template-columns:2fr 1fr;gap:14px}
  .ar-section-label{font-size:10px;letter-spacing:1.5px;color:#64748b;font-weight:700;margin-bottom:14px}
  /* TABLE */
  .ar-table{width:100%;border-collapse:collapse}
  .ar-table th{font-size:9px;letter-spacing:1px;color:#64748b;font-weight:700;padding:8px;border-bottom:1px solid #1f222b;text-align:left}
  .ar-table td{padding:10px 8px;border-bottom:1px solid #1a1b22;font-size:13px;color:#e2e8f0}
  .ar-table tr:last-child td{border-bottom:none}
  .ar-table tr:hover td{background:#15161e}
  /* BADGE */
  .ar-badge{display:inline-flex;align-items:center;padding:3px 8px;border-radius:2px;font-size:10px;font-weight:700;letter-spacing:.5px;border:1px solid #2f2f3b;color:#94a3b8;background:#1a1b22}
  .ar-badge.green{color:#34d399;background:rgba(52,211,153,.1);border-color:rgba(52,211,153,.3)}
  .ar-badge.red{color:#f87171;background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.3)}
  .ar-badge.blue{color:#60a5fa;background:rgba(96,165,250,.1);border-color:rgba(96,165,250,.3)}
  .ar-badge.yellow{color:#fbbf24;background:rgba(251,191,36,.1);border-color:rgba(251,191,36,.3)}
  /* BUTTONS */
  .ar-btn{background:#17171d;border:1px solid #2f2f3b;color:#e2e8f0;padding:9px 14px;font-size:10px;letter-spacing:1px;font-weight:700;cursor:pointer;transition:.15s}
  .ar-btn:hover{background:#1e2029;color:#fff}
  .ar-btn.primary{background:#5b5fc7;border-color:#5b5fc7;color:#fff}
  .ar-btn.primary:hover{background:#4f53b0}
  .ar-btn:disabled{opacity:.5;cursor:not-allowed}
  /* INPUTS */
  .ar-input{background:#1b1b22;border:1px solid #2f2f3b;color:#f5f5f5;padding:10px 12px;width:100%;font-size:13px;font-family:Inter,sans-serif;outline:none;border-radius:3px}
  .ar-input:focus{border-color:#5b5fc7}
  .ar-select{background:#1b1b22;border:1px solid #2f2f3b;color:#f5f5f5;padding:10px 12px;width:100%;font-size:13px;font-family:Inter,sans-serif;outline:none;border-radius:3px;appearance:none;cursor:pointer}
  .ar-label{font-size:9px;letter-spacing:1.5px;color:#64748b;font-weight:700;margin-bottom:6px;display:block;text-transform:uppercase}
  .ar-field{margin-bottom:14px}
  /* ROW / LAYOUT */
  .ar-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .ar-stack{display:flex;flex-direction:column;gap:14px}
  .ar-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  /* STATES */
  .ar-empty{padding:40px;text-align:center;color:#64748b;font-size:13px;border:1px dashed #2f2f3b;border-radius:4px}
  .ar-error{padding:12px 14px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#ef4444;font-size:12px;border-radius:3px;margin-bottom:14px}
  .ar-spinner{width:18px;height:18px;border:2px solid #1f222b;border-top-color:#5b5fc7;border-radius:50%;animation:spin .7s linear infinite;margin:40px auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  /* MODAL */
  .ar-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:300;display:flex;align-items:center;justify-content:center}
  .ar-modal{background:#0f1016;border:1px solid #1f222b;padding:28px;width:460px;max-width:94vw;border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,.8)}
  .ar-modal-title{font-family:'DM Serif Display',serif;font-size:22px;font-style:italic;margin-bottom:20px;color:#f1f5f9}
  /* ORG INFO */
  .ar-org-row{display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #1f222b}
  .ar-org-row:last-child{border-bottom:none}
  .ar-org-key{font-size:10px;letter-spacing:1.5px;color:#64748b;font-weight:700}
  .ar-org-val{font-size:14px;font-weight:600;color:#e2e8f0}
  /* UPLOAD ZONE */
  .ar-drop-zone{border:2px dashed #2f2f3b;border-radius:6px;padding:36px;text-align:center;cursor:pointer;transition:.2s;color:#64748b;font-size:13px}
  .ar-drop-zone:hover,.ar-drop-zone.drag{border-color:#5b5fc7;background:rgba(91,95,199,.05);color:#a5b4fc}
  .ar-file-input{display:none}
`

function Spinner() { return <div className="ar-spinner" /> }
function ErrorMsg({ msg }) { return msg ? <div className="ar-error">{msg}</div> : null }
function Empty({ msg }) { return <div className="ar-empty">{msg}</div> }

export default function AdminDashboard() {
  const { user, signOut, orgName, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [health, setHealth] = useState(null)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    api.get('/health').then(({ data }) => setHealth(data?.status === 'ok')).catch(() => setHealth(false))
  }, [])

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div className="ar">
      <style>{CSS}</style>
      <aside className="ar-sidebar">
        <div className="ar-brand">
          <h1>Smart Navigator</h1>
          <p>ADMIN PORTAL</p>
        </div>
        <nav className="ar-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.path} className={`ar-nav-btn ${location.pathname === item.path ? 'active' : ''}`} onClick={() => navigate(item.path)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="ar-sidebar-bottom">
          {showProfile && (
            <div className="ar-profile-dropdown">
              <div className="ar-p-label">Account</div>
              <div className="ar-p-val">{user?.email}</div>
              <div className="ar-p-label">Organization</div>
              <div className="ar-p-val">{orgName || '—'}</div>
              <div className="ar-p-label">Role</div>
              <div className="ar-p-val">{(role || 'admin').toUpperCase()}</div>
              <button className="ar-logout-btn" onClick={handleSignOut}>SIGN OUT</button>
            </div>
          )}
          <button className="ar-profile-btn" onClick={() => setShowProfile(v => !v)}>👤 USER PROFILE</button>
        </div>
      </aside>

      <main className="ar-main">
        <div className="ar-topbar">
          <div>
            <div className="ar-page-title">{location.pathname.replace('/', '') || 'dashboard'}</div>
            <div className="ar-page-sub">
              <span className="ar-health">
                <span className="ar-dot" style={{ background: health === null ? '#64748b' : health ? '#22c55e' : '#ef4444' }} />
                {health === null ? 'CHECKING...' : health ? 'SYSTEM NOMINAL' : 'BACKEND OFFLINE'}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#475569', letterSpacing: 1 }}>{(user?.email || '').toUpperCase()}</div>
        </div>

        {location.pathname === '/dashboard' && <DashboardPage />}
        {location.pathname === '/organization' && <OrganizationPage />}
        {location.pathname === '/members' && <MembersPage />}
        {location.pathname === '/documents' && <DocumentsPage />}
        {location.pathname === '/analytics' && <AnalyticsPage />}
      </main>
    </div>
  )
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [feed, setFeed] = useState([])

  useEffect(() => {
    const run = async () => {
      try {
        const [sumRes, actRes] = await Promise.all([
          api.get('/admin/dashboard/summary'),
          api.get('/admin/activity'),
        ])
        setData(sumRes.data || {})
        setFeed(actRes.data?.events || [])
      } catch {
        setData({ total_documents: 0, total_members: 0, total_queries: 0, chunks_indexed: 0 })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' })()

  if (loading) return <Spinner />

  return (
    <div className="ar-stack">
      <div className="ar-card">
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 42, color: '#f1f5f9', marginBottom: 8 }}>{greeting}, {user?.email?.split('@')[0] || 'Admin'}.</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>{safe(data?.total_documents)} documents indexed · {safe(data?.chunks_indexed)} chunks in vector store</div>
      </div>
      <div className="ar-stats">
        {[
          { label: 'DOCUMENTS', value: data?.total_documents },
          { label: 'CHUNKS INDEXED', value: data?.chunks_indexed },
          { label: 'MEMBERS', value: data?.total_members },
          { label: 'TOTAL QUERIES', value: data?.total_queries },
        ].map(s => (
          <div className="ar-card" key={s.label}>
            <div className="ar-stat-label">{s.label}</div>
            <div className="ar-stat-val">{safe(s.value).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div className="ar-split">
        <div className="ar-card">
          <div className="ar-section-label">RECENT ACTIVITY</div>
          {!feed.length ? <Empty msg="No activity yet." /> : feed.map((ev, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #1f222b' }}>
              <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1, marginBottom: 3 }}>{ev.type?.toUpperCase()} · {humanDate(ev.timestamp)}</div>
              <div style={{ fontSize: 14, color: '#e2e8f0' }}>{ev.title || '—'}</div>
            </div>
          ))}
        </div>
        <div className="ar-stack">
          <div className="ar-card">
            <div className="ar-section-label">QUICK ACTIONS</div>
            <div className="ar-stack">
              <button className="ar-btn" onClick={() => navigate('/documents')}>UPLOAD DOCUMENT</button>
              <button className="ar-btn" onClick={() => navigate('/members')}>ADD MEMBER</button>
              <button className="ar-btn primary" onClick={() => navigate('/analytics')}>VIEW ANALYTICS</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ORGANIZATION ─────────────────────────────────────────────────────────────
const CollegeIllustration = () => (
  <svg viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    {/* Sky */}
    <rect width="400" height="220" fill="url(#skyGrad)" />
    {/* Ground */}
    <rect y="185" width="400" height="35" fill="#0f1016" />
    {/* Trees */}
    <rect x="22" y="155" width="6" height="30" fill="#1a2a1a" />
    <ellipse cx="25" cy="148" rx="14" ry="18" fill="#1e3a1e" />
    <rect x="362" y="155" width="6" height="30" fill="#1a2a1a" />
    <ellipse cx="365" cy="148" rx="14" ry="18" fill="#1e3a1e" />
    {/* Side wings */}
    <rect x="55" y="115" width="80" height="70" fill="#1a1b26" />
    <rect x="55" y="110" width="80" height="10" fill="#252640" />
    <rect x="265" y="115" width="80" height="70" fill="#1a1b26" />
    <rect x="265" y="110" width="80" height="10" fill="#252640" />
    {/* Main building */}
    <rect x="110" y="75" width="180" height="110" fill="#1e2035" />
    <rect x="110" y="68" width="180" height="12" fill="#2a2b48" />
    {/* Columns */}
    {[130, 155, 180, 205, 230, 255].map(x => (
      <rect key={x} x={x} y="130" width="8" height="55" fill="#252640" />
    ))}
    {/* Portico top */}
    <rect x="118" y="126" width="164" height="8" fill="#2a2b48" />
    {/* Steps */}
    <rect x="150" y="185" width="100" height="5" fill="#252640" />
    <rect x="155" y="180" width="90" height="5" fill="#1e2035" />
    <rect x="160" y="175" width="80" height="5" fill="#252640" />
    {/* Clock tower */}
    <rect x="175" y="30" width="50" height="48" fill="#252640" />
    <rect x="172" y="27" width="56" height="8" fill="#2a2b48" />
    {/* Pyramid top */}
    <polygon points="200,5 168,30 232,30" fill="#1a1b26" />
    {/* Clock face */}
    <circle cx="200" cy="50" r="12" fill="#0f1016" stroke="#5b5fc7" strokeWidth="1.5" />
    <line x1="200" y1="50" x2="200" y2="42" stroke="#a5b4fc" strokeWidth="1.5" />
    <line x1="200" y1="50" x2="206" y2="54" stroke="#a5b4fc" strokeWidth="1" />
    {/* Windows - side wings */}
    {[70, 95, 115].map(x => [130, 155].map(y => (
      <rect key={`${x}-${y}`} x={x} y={y} width="14" height="16" fill="#0a0b14" stroke="#2f3048" strokeWidth="0.5" />
    )))}
    {[275, 300, 320].map(x => [130, 155].map(y => (
      <rect key={`${x}-${y}`} x={x} y={y} width="14" height="16" fill="#0a0b14" stroke="#2f3048" strokeWidth="0.5" />
    )))}
    {/* Windows - main building */}
    {[125, 160, 195, 230, 255].map(x => [85, 108].map(y => (
      <rect key={`m-${x}-${y}`} x={x} y={y} width="14" height="16" rx="2" fill="#0a0b14" stroke="#2f3048" strokeWidth="0.5" />
    )))}
    {/* Door */}
    <rect x="186" y="155" width="28" height="30" rx="2" fill="#0a0b14" stroke="#5b5fc7" strokeWidth="1" />
    <line x1="200" y1="155" x2="200" y2="185" stroke="#2f3048" strokeWidth="0.5" />
    <defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#080910" />
        <stop offset="100%" stopColor="#12132a" />
      </linearGradient>
    </defs>
  </svg>
)

const OfficeIllustration = () => (
  <svg viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="400" height="220" fill="url(#skyGrad2)" />
    <rect y="185" width="400" height="35" fill="#0f1016" />
    {/* Background buildings */}
    <rect x="280" y="100" width="60" height="85" fill="#141520" />
    <rect x="60" y="120" width="50" height="65" fill="#141520" />
    {[285, 300, 315, 330].map(x => [108, 124, 140, 156, 172].map(y => (
      <rect key={`bg-${x}-${y}`} x={x} y={y} width="8" height="10" fill="#0f1016" stroke="#1a1b26" strokeWidth="0.5" />
    )))}
    {/* Main tower */}
    <rect x="130" y="40" width="140" height="145" fill="#1a1b2e" />
    {/* Glass facade lines */}
    {[130, 147, 164, 181, 198, 215, 232, 249].map(x => (
      <line key={`v-${x}`} x1={x} y1="40" x2={x} y2="185" stroke="#1f2035" strokeWidth="1" />
    ))}
    {[40, 55, 70, 85, 100, 115, 130, 145, 160, 175].map(y => (
      <line key={`h-${y}`} x1="130" y1={y} x2="270" y2={y} stroke="#1f2035" strokeWidth="0.5" />
    ))}
    {/* Lit windows */}
    {[[148, 57],[182, 57],[216, 57],[148, 85],[216, 85],[148, 113],[182, 113],[148, 141],[216, 141],[182, 169]].map(([x,y]) => (
      <rect key={`w-${x}-${y}`} x={x} y={y} width="14" height="10" fill="#1e2a4a" stroke="#2a3a6a" strokeWidth="0.5" />
    ))}
    {/* Dark windows */}
    {[[165,57],[199,57],[165,85],[199,85],[165,113],[199,113],[216,113],[165,141],[199,141],[165,169],[199,169],[216,169]].map(([x,y]) => (
      <rect key={`d-${x}-${y}`} x={x} y={y} width="14" height="10" fill="#0f1016" stroke="#1a1b26" strokeWidth="0.5" />
    ))}
    {/* Building top detail */}
    <rect x="148" y="30" width="104" height="14" fill="#222340" />
    <rect x="165" y="22" width="70" height="12" fill="#1a1b2e" />
    <rect x="178" y="14" width="44" height="12" fill="#222340" />
    {/* Side building */}
    <rect x="270" y="85" width="55" height="100" fill="#161724" />
    {[275, 292, 309].map(x => [93, 108, 123, 138, 153, 168].map(y => (
      <rect key={`s-${x}-${y}`} x={x} y={y} width="9" height="9" fill="#0f1016" stroke="#1a1b26" strokeWidth="0.5" />
    )))}
    {/* Lobby */}
    <rect x="155" y="165" width="90" height="20" fill="#1e1f30" />
    <rect x="168" y="165" width="64" height="20" fill="#0f1016" stroke="#5b5fc7" strokeWidth="0.5" />
    {/* Revolving door */}
    <circle cx="200" cy="175" r="10" fill="none" stroke="#5b5fc7" strokeWidth="0.5" />
    <line x1="200" y1="165" x2="200" y2="185" stroke="#5b5fc7" strokeWidth="0.5" />
    <line x1="190" y1="175" x2="210" y2="175" stroke="#5b5fc7" strokeWidth="0.5" />
    <defs>
      <linearGradient id="skyGrad2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#060709" />
        <stop offset="100%" stopColor="#0f1020" />
      </linearGradient>
    </defs>
  </svg>
)

const CommunityIllustration = () => (
  <svg viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="400" height="220" fill="url(#skyGrad3)" />
    <rect y="185" width="400" height="35" fill="#0f1016" />
    {/* Trees */}
    <rect x="30" y="155" width="5" height="30" fill="#1a2a1a" />
    <ellipse cx="32" cy="148" rx="12" ry="14" fill="#1e3a1e" />
    <rect x="355" y="155" width="5" height="30" fill="#1a2a1a" />
    <ellipse cx="357" cy="148" rx="12" ry="14" fill="#1e3a1e" />
    {/* Main building */}
    <rect x="90" y="90" width="220" height="95" fill="#1a1b26" />
    {/* Roof */}
    <polygon points="80,92 200,50 320,92" fill="#1e2035" />
    <polygon points="80,92 200,50 320,92" fill="none" stroke="#2a2b48" strokeWidth="1" />
    {/* Banner/sign area */}
    <rect x="130" y="105" width="140" height="25" fill="#252640" />
    {/* Windows */}
    {[100, 135, 245, 280].map(x => (
      <rect key={`w-${x}`} x={x} y="130" width="30" height="36" rx="15" fill="#0a0b14" stroke="#2f3048" strokeWidth="1" />
    ))}
    {/* Door */}
    <rect x="178" y="147" width="44" height="38" rx="4" fill="#0a0b14" stroke="#5b5fc7" strokeWidth="1" />
    <line x1="200" y1="147" x2="200" y2="185" stroke="#2f3048" strokeWidth="0.5" />
    {/* Steps */}
    <rect x="165" y="183" width="70" height="4" fill="#252640" />
    <rect x="160" y="179" width="80" height="4" fill="#1e2035" />
    {/* Lamp posts */}
    <line x1="65" y1="185" x2="65" y2="135" stroke="#2f3048" strokeWidth="2" />
    <circle cx="65" cy="133" r="4" fill="#fbbf24" opacity="0.6" />
    <line x1="335" y1="185" x2="335" y2="135" stroke="#2f3048" strokeWidth="2" />
    <circle cx="335" cy="133" r="4" fill="#fbbf24" opacity="0.6" />
    {/* Flag */}
    <line x1="200" y1="50" x2="200" y2="20" stroke="#2f3048" strokeWidth="1.5" />
    <polygon points="200,20 225,28 200,36" fill="#5b5fc7" />
    <defs>
      <linearGradient id="skyGrad3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#080910" />
        <stop offset="100%" stopColor="#0f1420" />
      </linearGradient>
    </defs>
  </svg>
)

function OrganizationPage() {
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/organization')
      .then(({ data }) => setOrg(data))
      .catch(() => setError('Could not load organization info.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const typeLabel = { college: 'College / University', school: 'School / College', company: 'Company / Enterprise', community: 'Community / NGO' }
  const typeColor = { college: '#a5b4fc', school: '#a5b4fc', company: '#34d399', community: '#fbbf24' }

  const Illustration = org?.type === 'company' ? OfficeIllustration
    : org?.type === 'community' ? CommunityIllustration
    : CollegeIllustration

  return (
    <div className="ar-stack">
      <ErrorMsg msg={error} />
      {org && (
        <>
          {/* Hero card */}
          <div style={{ background: '#0f1016', border: '1px solid #1f222b', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
            {/* Building illustration */}
            <div style={{ height: 220, position: 'relative', overflow: 'hidden' }}>
              <Illustration />
              {/* Gradient overlay at bottom */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: 'linear-gradient(to top, #0f1016 0%, transparent 100%)' }} />
              {/* Type badge */}
              <div style={{ position: 'absolute', top: 16, left: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: `1px solid ${typeColor[org.type] || '#2f2f3b'}`, borderRadius: 3, padding: '4px 10px', fontSize: 9, letterSpacing: 1.5, fontWeight: 700, color: typeColor[org.type] || '#94a3b8' }}>
                {(typeLabel[org.type] || org.type || 'ORGANIZATION').toUpperCase()}
              </div>
            </div>

            {/* Org name overlay */}
            <div style={{ padding: '0 28px 28px', marginTop: -24 }}>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 42, fontStyle: 'italic', color: '#f1f5f9', lineHeight: 1.1, marginBottom: 6 }}>{org.name}</div>
              <div style={{ fontSize: 11, color: '#475569', letterSpacing: 1 }}>Knowledge Network · Powered by Smart Navigator</div>
            </div>
          </div>

          {/* Details card */}
          <div className="ar-card">
            <div className="ar-section-label" style={{ marginBottom: 16 }}>ORGANIZATION DETAILS</div>
            <div className="ar-org-row">
              <div className="ar-org-key">NAME</div>
              <div className="ar-org-val">{org.name}</div>
            </div>
            <div className="ar-org-row">
              <div className="ar-org-key">TYPE</div>
              <div className="ar-org-val">
                <span style={{ color: typeColor[org.type] || '#94a3b8' }}>{typeLabel[org.type] || org.type?.toUpperCase() || '—'}</span>
              </div>
            </div>
            <div className="ar-org-row" style={{ borderBottom: 'none' }}>
              <div className="ar-org-key">ORGANIZATION ID</div>
              <div className="ar-org-val" style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{org.org_id || '—'}</div>
            </div>
          </div>
        </>
      )}
      {!org && !error && <Empty msg="No organization data found." />}
    </div>
  )
}

// ─── MEMBERS ─────────────────────────────────────────────────────────────────
function MembersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await api.get('/admin/members')
      setRows(data?.items || [])
    } catch {
      setError('Could not load members.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? rows : rows.filter(r => r.member_type === filter)

  const memberTypeColor = { student: 'blue', employee: 'green', general: '' }

  return (
    <div className="ar-stack">
      <ErrorMsg msg={error} />
      <div className="ar-row">
        {['all', 'student', 'employee', 'general'].map(f => (
          <button key={f} className={`ar-btn ${filter === f ? 'primary' : ''}`} onClick={() => setFilter(f)}>{f.toUpperCase()}</button>
        ))}
        <span style={{ flex: 1 }} />
        <span className="ar-badge">{filtered.length} MEMBERS</span>
        <button className="ar-btn primary" onClick={() => setShowModal(true)}>+ ADD MEMBER</button>
      </div>
      <div className="ar-card">
        {loading ? <Spinner /> : !filtered.length ? <Empty msg="No members found." /> : (
          <table className="ar-table">
            <thead>
              <tr>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>TYPE</th>
                <th>STATUS</th>
                <th>JOINED</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td>{m.name || '—'}</td>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>{m.email}</td>
                  <td><span className={`ar-badge ${memberTypeColor[m.member_type] || ''}`}>{(m.member_type || 'general').toUpperCase()}</span></td>
                  <td><span className={`ar-badge ${m.is_registered ? 'green' : 'yellow'}`}>{m.is_registered ? 'REGISTERED' : 'PENDING'}</span></td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{humanDate(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showModal && <AddMemberModal onClose={() => setShowModal(false)} onAdded={() => { setShowModal(false); load() }} />}
    </div>
  )
}

function AddMemberModal({ onClose, onAdded }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [memberType, setMemberType] = useState('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await api.post('/admin/members', { name, email, member_type: memberType })
      onAdded()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ar-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ar-modal">
        <div className="ar-modal-title">Add New Member</div>
        <ErrorMsg msg={error} />
        <form onSubmit={submit}>
          <div className="ar-field">
            <label className="ar-label">Full Name</label>
            <input className="ar-input" value={name} onChange={e => setName(e.target.value)} placeholder="Member name" required />
          </div>
          <div className="ar-field">
            <label className="ar-label">Email Address</label>
            <input className="ar-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="member@example.com" required />
          </div>
          <div className="ar-field">
            <label className="ar-label">Member Type</label>
            <select className="ar-select" value={memberType} onChange={e => setMemberType(e.target.value)}>
              <option value="student">Student</option>
              <option value="employee">Employee</option>
              <option value="general">General</option>
            </select>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
            This member will be able to register with their email. They cannot sign up without being added here first.
          </div>
          <div className="ar-row">
            <button type="button" className="ar-btn" onClick={onClose}>CANCEL</button>
            <button type="submit" className="ar-btn primary" disabled={loading}>{loading ? 'ADDING...' : 'ADD MEMBER'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────
function DocumentsPage() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [url, setUrl] = useState('')
  const [urlName, setUrlName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [docName, setDocName] = useState('')
  const fileRef = useRef(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await api.get('/admin/documents')
      setDocs(data?.items || [])
    } catch {
      setError('Could not load documents.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const stageFile = (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) { setError('Only PDF files are supported'); return }
    setError('')
    setPendingFile(file)
    setDocName(file.name.replace(/\.pdf$/i, ''))
  }

  const confirmUpload = async () => {
    if (!pendingFile) return
    setUploading(true); setError('')
    const fd = new FormData()
    fd.append('file', pendingFile)
    if (docName.trim()) fd.append('name', docName.trim())
    try {
      await uploadDocument(fd)
      setPendingFile(null); setDocName('')
      await load()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Upload failed. Make sure backend is running.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = (e) => { const f = e.target.files?.[0]; if (f) stageFile(f); e.target.value = '' }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) stageFile(f)
  }

  const handleIngestUrl = async () => {
    if (!url.trim()) return
    setIngesting(true); setError('')
    try {
      await ingestUrl(url.trim(), urlName.trim() || url.trim())
      setUrl(''); setUrlName(''); await load()
    } catch (err) {
      setError(err?.response?.data?.detail || 'URL ingestion failed.')
    } finally {
      setIngesting(false)
    }
  }

  const statusColor = { pending: 'yellow', processing: 'blue', completed: 'green', failed: 'red' }
  const typeColor = { pdf: 'red', url: 'blue', arxiv: 'green' }

  return (
    <div className="ar-stack">
      <ErrorMsg msg={error} />
      <div className="ar-split">
        {/* Upload PDF */}
        <div className="ar-card">
          <div className="ar-section-label">UPLOAD PDF DOCUMENT</div>
          {!pendingFile ? (
            <div
              className={`ar-drop-zone ${dragging ? 'drag' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
                <div>Drop PDF here or click to browse</div>
                <div style={{ fontSize: 11, marginTop: 6, color: '#475569' }}>PDF files only · Auto-embedded on upload</div>
              </>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '10px 12px', background: 'rgba(91,95,199,.08)', border: '1px solid rgba(91,95,199,.2)', borderRadius: 4, fontSize: 12, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📄</span><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFile.name}</span>
                <span style={{ color: '#475569' }}>({(pendingFile.size / 1024).toFixed(0)} KB)</span>
              </div>
              <div className="ar-field" style={{ marginBottom: 0 }}>
                <label className="ar-label">DOCUMENT NAME</label>
                <input className="ar-input" placeholder="Enter a display name..." value={docName} onChange={e => setDocName(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmUpload()} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="ar-btn" onClick={() => { setPendingFile(null); setDocName('') }} style={{ flex: 1 }}>CANCEL</button>
                <button className="ar-btn primary" onClick={confirmUpload} disabled={uploading} style={{ flex: 2 }}>
                  {uploading ? '⏳ UPLOADING...' : 'CONFIRM UPLOAD'}
                </button>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".pdf" className="ar-file-input" onChange={handleFileInput} />
        </div>

        {/* Ingest URL */}
        <div className="ar-card">
          <div className="ar-section-label">EMBED REMOTE URL</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>
            Web pages, arXiv papers, or any publicly accessible URL.
          </div>
          <div className="ar-field">
            <label className="ar-label">URL</label>
            <input className="ar-input" placeholder="https://arxiv.org/abs/..." value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div className="ar-field">
            <label className="ar-label">DOCUMENT NAME <span style={{ color: '#475569', fontWeight: 400 }}>(optional)</span></label>
            <input className="ar-input" placeholder="e.g. Python Tutorial Docs" value={urlName} onChange={e => setUrlName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleIngestUrl()} />
          </div>
          <button className="ar-btn primary" style={{ width: '100%' }} onClick={handleIngestUrl} disabled={ingesting || !url.trim()}>
            {ingesting ? 'EMBEDDING...' : 'EMBED URL'}
          </button>
        </div>
      </div>

      {/* Document list */}
      <div className="ar-card">
        <div className="ar-row" style={{ marginBottom: 14 }}>
          <div className="ar-section-label" style={{ margin: 0 }}>REPOSITORY</div>
          <span style={{ flex: 1 }} />
          <button className="ar-btn" onClick={load}>REFRESH</button>
        </div>
        {loading ? <Spinner /> : !docs.length ? <Empty msg="No documents uploaded yet." /> : (
          <table className="ar-table">
            <thead><tr><th>NAME</th><th>TYPE</th><th>STATUS</th><th>UPLOADED</th></tr></thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id}>
                  <td>{d.name || 'Untitled'}</td>
                  <td><span className={`ar-badge ${typeColor[d.type] || ''}`}>{(d.type || '—').toUpperCase()}</span></td>
                  <td><span className={`ar-badge ${statusColor[d.status] || ''}`}>{(d.status || '—').toUpperCase()}</span></td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{humanDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/analytics')
      .then(({ data }) => setData(data))
      .catch(() => setData({ queries_last_7_days: 0, total_queries: 0, total_members: 0, total_documents: 0, total_chunks: 0, queries_over_time: [] }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="ar-stack">
      <div className="ar-stats" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'TOTAL QUERIES', value: data?.total_queries },
          { label: 'QUERIES THIS WEEK', value: data?.queries_last_7_days },
          { label: 'MEMBERS', value: data?.total_members },
          { label: 'CHUNKS INDEXED', value: data?.total_chunks },
        ].map(s => (
          <div className="ar-card" key={s.label}>
            <div className="ar-stat-label">{s.label}</div>
            <div className="ar-stat-val">{safe(s.value).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="ar-card">
        <div className="ar-section-label">QUERIES OVER TIME (LAST 7 DAYS)</div>
        {!data?.queries_over_time?.length ? <Empty msg="No query data yet." /> : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.queries_over_time} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#1f222b" vertical={false} />
                <XAxis dataKey="label" stroke="#475569" tick={{ fontSize: 10 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#14151a', border: '1px solid #1f222b', borderRadius: 4 }} />
                <Bar dataKey="value" fill="#5b5fc7" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="ar-card">
        <div className="ar-section-label">KNOWLEDGE BASE STATS</div>
        {[
          { label: 'Total documents in repository', value: safe(data?.total_documents) },
          { label: 'Total semantic chunks indexed', value: safe(data?.total_chunks) },
          { label: 'Active members', value: safe(data?.total_members) },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #1f222b' }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>{row.label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{row.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
