import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import api, { getChatHistory } from '../lib/api'
import ChatMessage from '../components/ChatMessage'

const SIDEBAR_ITEMS = [
  { key: 'chat', icon: '💬', label: 'CHAT' },
  { key: 'knowledge-base', icon: '📚', label: 'KNOWLEDGE BASE' },
  { key: 'recent-chats', icon: '💬', label: 'RECENT CHATS' },
  { key: 'saved-insights', icon: '🔖', label: 'SAVED INSIGHTS' },
  { key: 'analytics', icon: '📈', label: 'ANALYTICS' },
]

const TOP_TABS = [
  { key: 'explorer', label: 'EXPLORER' },
  { key: 'collections', label: 'COLLECTIONS' },
  { key: 'analytics', label: 'ANALYTICS' },
]

const defaultStats = {
  totalQuestions: 0,
  documentsReferenced: 0,
  queriesThisWeek: 0,
}

function formatRelativeDate(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hours ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDate(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getTypeBadgeClass(type) {
  const normalized = String(type || '').toLowerCase()
  if (normalized === 'pdf') return 'ud-badge ud-badge-red'
  if (normalized === 'url') return 'ud-badge ud-badge-blue'
  if (normalized === 'arxiv') return 'ud-badge ud-badge-green'
  return 'ud-badge ud-badge-muted'
}

function getStatusBadgeClass(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'pending') return 'ud-badge ud-badge-yellow'
  if (normalized === 'completed') return 'ud-badge ud-badge-green'
  if (normalized === 'failed') return 'ud-badge ud-badge-red'
  return 'ud-badge ud-badge-muted'
}

export default function UserDashboard() {
  const { user, signOut, orgName, role, orgId } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('chat')
  const [topTab, setTopTab] = useState('analytics')
  const [showProfile, setShowProfile] = useState(false)
  const [showTopProfile, setShowTopProfile] = useState(false)

  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  // Each entry: { id, query, response: { answer, citations, confidence, reasoning_trace, total_time_ms } | null, pending, timestamp }
  const [conversations, setConversations] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const [stats, setStats] = useState(defaultStats)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState('')

  const [chatHistory, setChatHistory] = useState([])
  const [chatsLoading, setChatsLoading] = useState(true)
  const [chatsError, setChatsError] = useState('')

  const [documents, setDocuments] = useState([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [documentsError, setDocumentsError] = useState('')

  const [backendOffline, setBackendOffline] = useState(false)

  const userLabel = user?.email || 'User'
  const userInitial = userLabel?.[0]?.toUpperCase() || '?'

  useEffect(() => {
    if (!user?.id) return
    const fetchStats = async () => {
      setStatsLoading(true)
      setStatsError('')
      let fetchedStats = { ...defaultStats }
      try {
        const { data } = await api.get('/stats/user')
        fetchedStats = {
          totalQuestions: Number(data?.total_questions ?? 0),
          documentsReferenced: Number(data?.documents_referenced ?? 0),
          queriesThisWeek: Number(data?.queries_this_week ?? 0),
        }
      } catch {
        setStatsError('Stats endpoint unavailable. Showing fallback values.')
      }

      try {
        const historyResponse = await getChatHistory(50)
        const countFromHistory = Array.isArray(historyResponse?.data) ? historyResponse.data.length : 0
        if (!fetchedStats.totalQuestions && countFromHistory) {
          fetchedStats.totalQuestions = countFromHistory
        }
      } catch {
        // Keep graceful fallback.
      }

      setStats(fetchedStats)
      setStatsLoading(false)
    }

    fetchStats()
  }, [user?.id])

  useEffect(() => {
    const fetchRecentChats = async () => {
      setChatsLoading(true)
      setChatsError('')
      try {
        const { data, error } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error
        setChatHistory(data || [])
      } catch (error) {
        setChatsError(error?.message || 'Failed to load chat history.')
        setChatHistory([])
      } finally {
        setChatsLoading(false)
      }
    }

    if (user?.id) fetchRecentChats()
  }, [user?.id])

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!orgId) return
      setDocumentsLoading(true)
      setDocumentsError('')
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setDocuments(data || [])
      } catch (error) {
        setDocumentsError(error?.message || 'Failed to load documents.')
        setDocuments([])
      } finally {
        setDocumentsLoading(false)
      }
    }

    if (user?.id) fetchDocuments()
  }, [user?.id, orgId])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return
    const query = inputValue.trim()
    const id = Date.now()
    setConversations(prev => [...prev, { id, query, response: null, pending: true, timestamp: new Date().toISOString() }])
    setInputValue('')
    setIsTyping(true)

    try {
      const { data } = await api.post('/query/ask', { query, include_history: true })
      setConversations(prev => prev.map(c => c.id === id ? {
        ...c,
        pending: false,
        response: {
          answer: data.answer,
          citations: data.citations,
          confidence: data.confidence,
          reasoning_trace: data.reasoning_trace,
          total_time_ms: data.total_time_ms,
        }
      } : c))
    } catch (e) {
      const isNetworkError = !e?.response && e?.message === 'Network Error'
      if (isNetworkError) setBackendOffline(true)
      const detail = isNetworkError
        ? 'Cannot reach backend server. Please make sure the backend is running on port 8000 (run start.bat).'
        : (e?.response?.data?.detail || e?.message || 'Unknown error')
      setConversations(prev => prev.map(c => c.id === id ? {
        ...c,
        pending: false,
        response: { answer: `Error: ${detail}`, citations: [] }
      } : c))
    } finally {
      setIsTyping(false)
    }
  }

  const handleSidebarClick = (key) => {
    setActiveSection(key)
    if (key === 'analytics') setTopTab('analytics')
    if (key === 'knowledge-base') setTopTab('explorer')
    if (key === 'chat' || key === 'recent-chats' || key === 'saved-insights') setTopTab('analytics')
  }

  const syncTopTab = (key) => {
    setTopTab(key)
    if (key === 'explorer') setActiveSection('knowledge-base')
    if (key === 'analytics') setActiveSection('analytics')
  }

  const analyticsCards = useMemo(
    () => [
      { label: 'TOTAL QUESTIONS ASKED', value: stats.totalQuestions, trend: statsLoading ? 'Loading' : 'Live' },
      { label: 'DOCUMENTS REFERENCED', value: stats.documentsReferenced, trend: statsLoading ? 'Loading' : 'Live' },
      { label: 'QUERIES THIS WEEK', value: stats.queriesThisWeek, trend: statsLoading ? 'Loading' : 'Live' },
    ],
    [stats, statsLoading],
  )

  const renderDocumentCards = () => {
    const mono = "'JetBrains Mono',monospace"
    const completedDocs = documents.filter(d => d.status === 'completed')
    const filtered = completedDocs.filter(d =>
      !kbSearch.trim() || (d.name || '').toLowerCase().includes(kbSearch.toLowerCase())
    )
    const totalChunks = 0 // chunks not stored per-doc in Supabase schema
    const totalQueries = 0

    const TypeBadge = ({ type }) => {
      const colors = { pdf:'#ef4444', url:'#3b82f6', arxiv:'#10b981' }
      const c = colors[String(type||'').toLowerCase()] || '#6b7280'
      return <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, padding:'3px 8px', borderRadius:6, background:`${c}18`, border:`1px solid ${c}33`, color:c, fontFamily:mono, whiteSpace:'nowrap', textTransform:'uppercase' }}>{type||'DOC'}</span>
    }

    const DocCardGrid = ({ doc }) => {
      const [hov, setHov] = useState(false)
      return (
        <div
          onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
          style={{ background: hov?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.025)', border:`1px solid ${hov?'rgba(139,92,246,0.3)':'rgba(255,255,255,0.07)'}`, borderRadius:14, padding:20, transition:'all 0.2s', transform:hov?'translateY(-2px)':'none', boxShadow:hov?'0 8px 30px rgba(0,0,0,0.3)':'none', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(99,102,241,0.15))', border:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.5 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.9)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:6 }}>{doc.name || 'Untitled'}</div>
              <TypeBadge type={doc.type} />
            </div>
          </div>
          {doc.source_url && (
            <a href={doc.source_url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'rgba(139,92,246,0.7)', fontFamily:mono, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration:'none' }}>↗ {doc.source_url}</a>
          )}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:10 }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontFamily:mono }}>{formatDate(doc.created_at)}</span>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, padding:'3px 8px', borderRadius:6, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', color:'#34d399', fontFamily:mono }}>INDEXED</span>
          </div>
        </div>
      )
    }

    const DocRowList = ({ doc }) => {
      const [hov, setHov] = useState(false)
      return (
        <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
          style={{ display:'grid', gridTemplateColumns:'1fr 70px 95px', alignItems:'center', padding:'12px 16px', gap:8, background:hov?'rgba(255,255,255,0.03)':'transparent', borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.15s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.4, flexShrink:0 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.8)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name || 'Untitled'}</span>
          </div>
          <TypeBadge type={doc.type} />
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontFamily:mono }}>{formatDate(doc.created_at)}</span>
        </div>
      )
    }

    return (
      <div style={{ padding:'24px 32px', overflowY:'auto', flex:1, scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.06) transparent' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom:24 }}>
            <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:'rgba(255,255,255,0.9)' }}>Knowledge Base</h2>
            <p style={{ margin:'4px 0 0', fontSize:13, color:'rgba(255,255,255,0.35)' }}>Browse your organisation's available documents</p>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
            {[
              { label:'Available Documents', value: documentsLoading ? '...' : completedDocs.length, icon:'📄' },
              { label:'Total Indexed', value: documentsLoading ? '...' : completedDocs.length, icon:'✅' },
              { label:'Total Documents', value: documentsLoading ? '...' : documents.length, icon:'🗃️' },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ fontSize:22 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize:22, fontWeight:700, color:'rgba(255,255,255,0.9)', fontFamily:mono }}>{s.value}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:1, textTransform:'uppercase', fontFamily:mono }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading skeletons */}
          {documentsLoading && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height:160, borderRadius:14, background:'rgba(255,255,255,0.03)', animation:'udPulse 1.2s ease-in-out infinite', backgroundSize:'200% 100%' }} />
              ))}
            </div>
          )}

          {/* Error */}
          {!documentsLoading && documentsError && <div className="ud-error">{documentsError}</div>}

          {/* Empty */}
          {!documentsLoading && !documentsError && !completedDocs.length && (
            <div className="ud-empty-panel">
              <div style={{ fontSize:32 }}>📭</div>
              No documents available yet. Contact your admin.
            </div>
          )}

          {/* Populated */}
          {!documentsLoading && !documentsError && completedDocs.length > 0 && (
            <>
              {/* Search + view toggle */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ flex:1, display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'8px 14px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input value={kbSearch} onChange={e => setKbSearch(e.target.value)} placeholder="Search documents…"
                    style={{ flex:1, background:'none', border:'none', outline:'none', color:'rgba(255,255,255,0.8)', fontSize:13, fontFamily:"'Outfit',sans-serif" }} />
                </div>
                <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.04)', borderRadius:8, padding:3 }}>
                  {[
                    { mode:'grid', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
                    { mode:'list', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
                  ].map(v => (
                    <button key={v.mode} onClick={() => setKbViewMode(v.mode)} style={{ background:kbViewMode===v.mode?'rgba(139,92,246,0.2)':'transparent', border:'none', borderRadius:6, padding:'6px 10px', cursor:'pointer', color:kbViewMode===v.mode?'#c4b5fd':'rgba(255,255,255,0.3)', display:'flex', alignItems:'center', transition:'all 0.15s' }}>{v.icon}</button>
                  ))}
                </div>
              </div>

              {/* Doc list */}
              {kbViewMode === 'grid' ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                  {filtered.map(doc => <DocCardGrid key={doc.id} doc={doc} />)}
                </div>
              ) : (
                <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, overflow:'hidden' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 70px 95px', padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', gap:8 }}>
                    {['Name','Type','Date'].map(h => (
                      <span key={h} style={{ fontSize:10, fontWeight:600, letterSpacing:1.2, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', fontFamily:mono }}>{h}</span>
                    ))}
                  </div>
                  {filtered.map(doc => <DocRowList key={doc.id} doc={doc} />)}
                </div>
              )}

              {filtered.length === 0 && (
                <div style={{ textAlign:'center', padding:'60px 20px', color:'rgba(255,255,255,0.25)' }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>🔍</div>
                  <p style={{ margin:0, fontSize:14 }}>No documents match "{kbSearch}"</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  const renderRecentChats = () => {
    if (chatsLoading) {
      return (
        <div className="ud-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="ud-card ud-skeleton" key={`chat-skeleton-${index}`} />
          ))}
        </div>
      )
    }
    if (chatsError) return <div className="ud-error">{chatsError}</div>
    if (!chatHistory.length) {
      return <div className="ud-empty-panel">No conversations yet. Start asking questions.</div>
    }
    return (
      <div className="ud-grid">
        {chatHistory.map((chat) => (
          <div
            className="ud-card"
            key={chat.id}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              const response = chat.response || {}
              setConversations([{
                id: chat.id,
                query: chat.query || chat.question || '',
                response: {
                  answer: response.answer || 'No answer recorded.',
                  citations: response.citations || [],
                  confidence: response.confidence,
                  reasoning_trace: response.reasoning_trace,
                  total_time_ms: response.total_time_ms,
                },
                pending: false,
                timestamp: chat.created_at,
              }])
              setActiveSection('chat')
              setTopTab('analytics')
            }}
          >
            <div className="ud-card-title ud-truncate">{chat.query || chat.question || 'Untitled conversation'}</div>
            <div className="ud-muted">{formatRelativeDate(chat.created_at)}</div>
          </div>
        ))}
      </div>
    )
  }

  const [kbSearch, setKbSearch]     = useState('')
  const [kbViewMode, setKbViewMode] = useState('grid')

  const [insights, setInsights]           = useState([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsLoaded, setInsightsLoaded]   = useState(false)
  const [deletingId, setDeletingId]           = useState(null)

  const loadInsights = async () => {
    if (!user?.id) return
    setInsightsLoading(true)
    const { data } = await supabase
      .from('saved_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setInsights(data || [])
    setInsightsLoading(false)
    setInsightsLoaded(true)
  }

  const deleteInsight = async (id) => {
    setDeletingId(id)
    await supabase.from('saved_insights').delete().eq('id', id)
    setInsights(prev => prev.filter(i => i.id !== id))
    setDeletingId(null)
  }

  useEffect(() => {
    if (activeSection === 'saved-insights' && !insightsLoaded) loadInsights()
  }, [activeSection])

  const renderSavedInsights = () => {
    if (insightsLoading) return <div className="ud-empty-panel">Loading saved insights...</div>
    if (!insights.length) return (
      <div className="ud-empty-panel">
        <div className="ud-large-icon">🔖</div>
        No saved insights yet. Hit "Save Insight" on any answer in the chat.
      </div>
    )
    return (
      <div className="ud-stack">
        {insights.map(ins => (
          <div className="ud-card" key={ins.id} style={{ position:'relative' }}>
            <div style={{ fontSize:11, opacity:0.4, marginBottom:8 }}>
              {new Date(ins.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
              {typeof ins.confidence === 'number' && <> · Confidence: {Math.round(ins.confidence * 100)}%</>}
            </div>
            <div className="ud-card-title ud-truncate" style={{ marginBottom:8 }}>Q: {ins.query}</div>
            <div style={{ fontSize:13, opacity:0.75, lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {ins.answer}
            </div>
            {ins.citations?.length > 0 && (
              <div style={{ marginTop:10, display:'flex', gap:6, flexWrap:'wrap' }}>
                {ins.citations.map((c, i) => (
                  <span key={i} style={{ fontSize:10, background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.25)', color:'#60a5fa', padding:'2px 8px' }}>
                    {c.source_name || 'Source'}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={() => deleteInsight(ins.id)}
              disabled={deletingId === ins.id}
              style={{ position:'absolute', top:14, right:14, background:'transparent', border:'1px solid rgba(248,113,113,0.2)', color:'rgba(248,113,113,0.5)', padding:'3px 10px', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', transition:'all 0.2s', fontFamily:'inherit' }}
            >
              {deletingId === ins.id ? '...' : 'Delete'}
            </button>
          </div>
        ))}
      </div>
    )
  }

  const renderAnalytics = () => (
    <div className="ud-stack">
      {statsError ? <div className="ud-error">{statsError}</div> : null}
      <div className="ud-analytics-stats">
        {analyticsCards.map((card) => (
          <div className="ud-stat-card" key={card.label}>
            <div className="ud-stat-label">{card.label}</div>
            <div className="ud-stat-val">{statsLoading ? '...' : card.value.toLocaleString()}</div>
            <div className="ud-stat-trend">{statsLoading ? 'Loading...' : card.trend}</div>
          </div>
        ))}
      </div>
      <div className="ud-card">
        <div className="ud-card-title">Recent activity snapshot</div>
        <div className="ud-muted">
          {chatsLoading ? 'Loading chat history...' : `${chatHistory.length || 0} conversations fetched from history`}
        </div>
      </div>
    </div>
  )

  const renderChat = () => (
    <div className="ud-chat-view">
      {backendOffline && (
        <div style={{ background:'rgba(127,29,29,0.8)', color:'#fca5a5', padding:'10px 16px', borderRadius:8, margin:'12px 32px 0', fontSize:13, border:'1px solid rgba(248,113,113,0.2)' }}>
          ⚠️ Backend offline. Run <strong>start.bat</strong> or <code>uvicorn main:app --reload</code> in the backend folder.
        </div>
      )}
      <div className="ud-messages">
        {/* Welcome message */}
        <div>
          <div className="ud-welcome-bubble">
            Hello! I am your AI Knowledge Navigator. How can I help you today?
          </div>
        </div>

        {/* Conversation pairs */}
        {conversations.map(conv => (
          <ChatMessage
            key={conv.id}
            query={conv.query}
            response={conv.pending ? null : conv.response}
            pending={conv.pending}
            timestamp={conv.timestamp}
            userId={user?.id}
            orgId={orgId}
          />
        ))}
      </div>
      <div className="ud-input-area">
        <div className="ud-input-wrap">
          <input
            className="ud-chat-input"
            placeholder="Query the knowledge base..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            className={`ud-send-btn ${inputValue.trim() ? 'active' : 'inactive'}`}
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )

  const renderMainContent = () => {
    if (activeSection === 'chat') return renderChat()
    if (activeSection === 'knowledge-base') return renderDocumentCards()
    if (activeSection === 'recent-chats') return renderRecentChats()
    if (activeSection === 'saved-insights') return renderSavedInsights()
    return renderAnalytics()
  }

  const renderTopTabContent = () => {
    if (topTab === 'explorer') return renderDocumentCards()
    if (topTab === 'collections') {
      return (
        <div className="ud-empty-panel">
          <div className="ud-large-icon">🗂️</div>
          Collections coming soon
        </div>
      )
    }
    return renderAnalytics()
  }

  const shouldShowAnalyticsLayout = activeSection === 'analytics' || topTab !== 'analytics'

  return (
    <div className="ud-root">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes cmTyping { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
        @keyframes slideUp { from{transform:translateY(8px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes udPulse { 0%{background-position:0% 0%} 100%{background-position:-200% 0%} }

        .ud-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .ud-root {
          display: flex; height: 100vh;
          background: #0c0a14;
          color: #f0ede6;
          font-family: 'Outfit', sans-serif;
          overflow: hidden;
        }

        /* ── Sidebar ── */
        .ud-sidebar {
          width: 240px; flex-shrink: 0;
          display: flex; flex-direction: column;
          background: rgba(255,255,255,0.01);
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .ud-brand { padding: 24px 20px 4px; }
        .ud-brand-logo {
          display: flex; align-items: center; gap: 8px;
          font-size: 18px; font-weight: 700; letter-spacing: -0.5px; color: #f0ede6;
        }
        .ud-brand-logo-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: linear-gradient(135deg,#8b5cf6,#6366f1);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700;
        }
        .ud-brand-sub {
          font-size: 9px; letter-spacing: 2px; color: rgba(255,255,255,0.2);
          text-transform: uppercase; font-family: 'JetBrains Mono',monospace; margin-top: 4px;
        }
        .ud-profile {
          margin: 16px 12px; padding: 10px 12px; border-radius: 10px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; gap: 10;
        }
        .ud-avatar {
          width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700;
        }
        .ud-profile-name { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ud-profile-role { font-size: 10px; color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono',monospace; }
        .ud-nav-section { padding: 8px 12px; flex: 1; }
        .ud-nav-label { font-size: 10px; letter-spacing: 1.5px; color: rgba(255,255,255,0.2); padding: 0 16px 8px; font-family: 'JetBrains Mono',monospace; }
        .ud-nav-item {
          display: flex; align-items: center; gap: 10; width: 100%;
          padding: 10px 16px; border-radius: 10px; border: none; cursor: pointer;
          background: transparent; color: rgba(255,255,255,0.4);
          font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
          font-family: 'JetBrains Mono',monospace; transition: all 0.15s; margin-bottom: 2px;
          text-align: left;
        }
        .ud-nav-item:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.75); }
        .ud-nav-item.active { background: rgba(139,92,246,0.12); color: #c4b5fd; }
        .ud-nav-icon { font-size: 15px; }
        .ud-new-chat-btn {
          width: 100%; padding: 10px 0; border-radius: 10px;
          border: 1px dashed rgba(139,92,246,0.3); background: rgba(139,92,246,0.06);
          color: #a78bfa; font-size: 12px; font-weight: 600; cursor: pointer;
          font-family: 'JetBrains Mono',monospace; letter-spacing: 1px; transition: all 0.15s;
        }
        .ud-new-chat-btn:hover { background: rgba(139,92,246,0.12); border-color: rgba(139,92,246,0.5); }
        .ud-history-empty { font-size: 11px; color: rgba(255,255,255,0.15); font-family: 'JetBrains Mono',monospace; }

        /* ── Main ── */
        .ud-main-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .ud-analytics-view {}
        .ud-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 32px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
        }
        .ud-topbar-left { display: flex; align-items: center; }
        .ud-topbar-title {
          font-size: 20px; font-weight: 700; font-style: italic;
          background: linear-gradient(135deg,#c4b5fd,#818cf8);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .ud-topbar-tabs { display: flex; align-items: center; gap: 24px; }
        .ud-top-tab {
          background: none; border: none; cursor: pointer;
          font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
          color: rgba(255,255,255,0.35); font-family: 'JetBrains Mono',monospace;
          border-bottom: 2px solid transparent; padding-bottom: 2px; transition: all 0.15s;
        }
        .ud-top-tab.active { color: #c4b5fd; border-bottom-color: #8b5cf6; }
        .ud-topbar-right { display: flex; align-items: center; gap: 12px; }
        .ud-icon-btn {
          width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.06);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; cursor: pointer; border: none; transition: background 0.15s;
        }
        .ud-icon-btn:hover { background: rgba(255,255,255,0.1); }
        .ud-top-avatar {
          width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700;
        }

        /* ── Scroll area ── */
        .ud-analytics-scroll { flex: 1; overflow-y: auto; padding: 32px 40px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
        .ud-analytics-scroll::-webkit-scrollbar { width: 4px; }
        .ud-analytics-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

        /* ── Shared content ── */
        .ud-stack { display: flex; flex-direction: column; gap: 20px; }
        .ud-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(260px,1fr)); gap: 16px; }
        .ud-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 18px; min-height: 100px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.2s; }
        .ud-card:hover { border-color: rgba(255,255,255,0.12); }
        .ud-card-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); }
        .ud-truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ud-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .ud-muted { color: rgba(255,255,255,0.4); font-size: 12px; }
        .ud-error { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); border-radius: 8px; padding: 12px 14px; font-size: 12px; }
        .ud-empty-panel { min-height: 200px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px; color: rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; font-size: 14px; }
        .ud-large-icon { font-size: 28px; }
        .ud-skeleton { animation: udPulse 1.2s ease-in-out infinite; background: linear-gradient(90deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 100%); background-size: 200% 100%; border-color: transparent !important; }
        .ud-badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.4px; border: 1px solid transparent; }
        .ud-badge-red   { color: #f87171; background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.25); }
        .ud-badge-blue  { color: #60a5fa; background: rgba(96,165,250,0.1);  border-color: rgba(96,165,250,0.25); }
        .ud-badge-green { color: #34d399; background: rgba(52,211,153,0.1);  border-color: rgba(52,211,153,0.25); }
        .ud-badge-yellow{ color: #fbbf24; background: rgba(251,191,36,0.1);  border-color: rgba(251,191,36,0.25); }
        .ud-badge-muted { color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }

        /* ── Analytics cards ── */
        .ud-analytics-stats { display: grid; grid-template-columns: repeat(3,1fr); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
        .ud-stat-card { padding: 28px; border-right: 1px solid rgba(255,255,255,0.06); }
        .ud-stat-card:last-child { border-right: none; }
        .ud-stat-label { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: rgba(255,255,255,0.35); margin-bottom: 12px; text-transform: uppercase; font-family: 'JetBrains Mono',monospace; }
        .ud-stat-val { font-size: 36px; font-weight: 800; color: #f0ede6; margin-bottom: 8px; }
        .ud-stat-trend { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); font-family: 'JetBrains Mono',monospace; }

        /* ── Chat view ── */
        .ud-chat-view { height: calc(100vh - 72px); display: flex; flex-direction: column; overflow: hidden; }
        .ud-messages { flex: 1; overflow-y: auto; padding: 24px 32px; max-width: 884px; margin: 0 auto; width: 100%; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.06) transparent; }
        .ud-messages::-webkit-scrollbar { width: 3px; }
        .ud-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

        /* Welcome message */
        .ud-welcome-bubble { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 16px 20px; display: inline-block; max-width: 65%; margin-bottom: 20px; font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.85); }

        /* Markdown body inside chat */
        .ud-md p { margin: 0 0 8px; }
        .ud-md p:last-child { margin-bottom: 0; }
        .ud-md code { background: rgba(255,255,255,0.08); border-radius: 4px; padding: 1px 5px; font-family: 'JetBrains Mono',monospace; font-size: 12px; }
        .ud-md pre { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; overflow-x: auto; margin: 8px 0; }
        .ud-md pre code { background: none; padding: 0; }
        .ud-md ul,ol { padding-left: 20px; margin: 6px 0; }
        .ud-md li { margin-bottom: 4px; }
        .ud-md strong { color: rgba(255,255,255,0.95); }

        /* Input bar */
        .ud-input-area { border-top: 1px solid rgba(255,255,255,0.06); padding: 14px 32px 18px; flex-shrink: 0; }
        .ud-input-wrap {
          max-width: 820px; margin: 0 auto;
          display: flex; align-items: center; gap: 10;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 4px 6px 4px 20px; transition: border-color 0.2s;
        }
        .ud-input-wrap:focus-within { border-color: rgba(139,92,246,0.35); }
        .ud-chat-input { flex: 1; border: none; outline: none; background: transparent; color: rgba(255,255,255,0.85); font-size: 14px; font-family: 'Outfit',sans-serif; padding: 8px 0; }
        .ud-chat-input::placeholder { color: rgba(255,255,255,0.25); }
        .ud-send-btn {
          width: 40px; height: 40px; border-radius: 10px; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
          flex-shrink: 0;
        }
        .ud-send-btn.active { background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; }
        .ud-send-btn.inactive { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.2); cursor: default; }

        /* Profile dropdown */
        .profile-dropdown {
          position: fixed; bottom: 80px; left: 10px; width: 240px;
          background: #0c0a14; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 20px; z-index: 1000;
          box-shadow: 0 10px 40px rgba(0,0,0,0.6); animation: slideUp 0.2s ease;
        }
        .p-section { margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 14px; }
        .p-label { font-size: 8px; color: rgba(255,255,255,0.3); letter-spacing: 1.5px; margin-bottom: 4px; text-transform: uppercase; font-weight: 700; font-family: 'JetBrains Mono',monospace; }
        .p-val { font-size: 13px; font-weight: 600; color: #f0ede6; }
      `}</style>

      <div className="ud-sidebar">
        {/* Logo */}
        <div className="ud-brand">
          <div className="ud-brand-logo">
            <div className="ud-brand-logo-icon">◆</div>
            AskIT
          </div>
          <div className="ud-brand-sub">Institutional Intelligence</div>
        </div>

        {/* User card */}
        <div className="ud-profile" style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div className="ud-avatar">{userInitial}</div>
          <div style={{ minWidth:0 }}>
            <div className="ud-profile-name">{userLabel}</div>
            <div className="ud-profile-role">USER PORTAL</div>
          </div>
        </div>

        {/* Nav */}
        <div className="ud-nav-section">
          <div className="ud-nav-label">NAVIGATION</div>
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`ud-nav-item ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => handleSidebarClick(item.key)}
            >
              <span className="ud-nav-icon">{item.icon}</span>{item.label}
            </button>
          ))}
        </div>

        <div style={{ flex:1 }} />

        {/* New Chat + profile */}
        <div style={{ padding:'0 12px 8px' }}>
          <button className="ud-new-chat-btn" style={{ marginBottom:8 }} onClick={() => {
            if (conversations.length > 0) {
              const session = { id: Date.now(), title: conversations[0].query.slice(0, 50), conversations, timestamp: new Date() }
              setSessions(prev => [session, ...prev])
            }
            setConversations([])
            setActiveSessionId(null)
            setActiveSection('chat')
            setTopTab('analytics')
          }}>+ NEW CHAT</button>
        </div>

        {/* History */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'12px 20px' }}>
          <div className="ud-nav-label" style={{ padding:'0 0 8px' }}>HISTORY</div>
          {sessions.length === 0 ? (
            <div className="ud-history-empty">0 sessions</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {sessions.map(s => (
                <button
                  key={s.id}
                  className={`ud-nav-item${activeSessionId === s.id ? ' active' : ''}`}
                  style={{ fontSize:11 }}
                  title={s.title}
                  onClick={() => {
                    setConversations(s.conversations || [])
                    setActiveSessionId(s.id)
                    setActiveSection('chat')
                    setTopTab('analytics')
                  }}
                >
                  <span className="ud-nav-icon">💬</span>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {showProfile && (
          <div className="profile-dropdown">
            <div className="p-section">
              <div className="p-label">CONNECTED ACCOUNT</div>
              <div className="p-val">{user?.email}</div>
            </div>
            <div className="p-section">
              <div className="p-label">ORGANIZATION</div>
              <div className="p-val">{orgName || 'External Partner'}</div>
            </div>
            <div className="p-section" style={{ border:'none', marginBottom:12 }}>
              <div className="p-label">ACCESS LEVEL</div>
              <div className="p-val">{(role || 'USER').toUpperCase()}</div>
            </div>
            <button style={{ width:'100%', color:'#ef4444', background:'transparent', border:'1px solid rgba(239,68,68,0.25)', padding:'8px', cursor:'pointer', borderRadius:'8px', fontSize:11, fontFamily:"'JetBrains Mono',monospace", letterSpacing:1 }} onClick={signOut}>SIGN OUT</button>
          </div>
        )}
      </div>

      <div className={`ud-main-content ${shouldShowAnalyticsLayout ? 'ud-analytics-view' : ''}`}>
        <div className="ud-topbar">
          <div className="ud-topbar-left">
            <div className="ud-topbar-title">Knowledge Navigator</div>
          </div>

          <div className="ud-topbar-tabs">
            {TOP_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`ud-top-tab ${topTab === tab.key ? 'active' : ''}`}
                onClick={() => syncTopTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="ud-topbar-right" style={{ position:'relative' }}>
            <button className="ud-icon-btn">🔔</button>
            <button className="ud-icon-btn" onClick={() => setShowTopProfile(v => !v)}>⚙</button>
            <div className="ud-top-avatar" onClick={() => setShowTopProfile(v => !v)}>{userInitial}</div>
            {showTopProfile && (
              <div style={{ position:'absolute', top:44, right:0, width:220, background:'#0c0a14', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:16, zIndex:200, boxShadow:'0 10px 40px rgba(0,0,0,.7)', animation:'slideUp .2s ease' }}>
                {[['ACCOUNT', user?.email], ['ORGANIZATION', orgName||'N/A'], ['ROLE', (role||'USER').toUpperCase()]].map(([lbl, val]) => (
                  <div key={lbl} style={{ marginBottom:12, paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'1.5px', marginBottom:3, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{lbl}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#f0ede6', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{val}</div>
                  </div>
                ))}
                <button style={{ width:'100%', background:'transparent', border:'1px solid rgba(239,68,68,.25)', color:'#ef4444', padding:'8px', fontSize:'10px', letterSpacing:'1px', cursor:'pointer', borderRadius:8, fontFamily:"'JetBrains Mono',monospace" }} onClick={signOut}>SIGN OUT</button>
              </div>
            )}
          </div>
        </div>

        {activeSection === 'chat'
          ? renderChat()
          : (activeSection === 'knowledge-base' || topTab === 'explorer')
            ? <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>{topTab === 'analytics' ? renderMainContent() : renderTopTabContent()}</div>
            : <div className="ud-analytics-scroll">{topTab === 'analytics' ? renderMainContent() : renderTopTabContent()}</div>
        }
      </div>
    </div>
  )
}
