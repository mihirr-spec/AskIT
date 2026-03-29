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
    if (documentsLoading) {
      return (
        <div className="ud-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="ud-card ud-skeleton" key={`doc-skeleton-${index}`} />
          ))}
        </div>
      )
    }
    if (documentsError) return <div className="ud-error">{documentsError}</div>
    if (!documents.length) return <div className="ud-empty-panel">No documents uploaded yet</div>
    return (
      <div className="ud-grid">
        {documents.map((doc) => (
          <div className="ud-card" key={doc.id}>
            <div className="ud-card-title">{doc.name || doc.file_name || 'Untitled document'}</div>
            <div className="ud-row">
              <span className={getTypeBadgeClass(doc.type || doc.doc_type)}>{String(doc.type || doc.doc_type || 'unknown').toUpperCase()}</span>
              <span className={getStatusBadgeClass(doc.status)}>{String(doc.status || 'unknown').toUpperCase()}</span>
            </div>
            <div className="ud-muted">{formatDate(doc.created_at)}</div>
          </div>
        ))}
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

  const renderSavedInsights = () => (
    <div className="ud-empty-panel">
      <div className="ud-large-icon">🔖</div>
      Saved insights coming soon
    </div>
  )

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
        <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          ⚠️ Backend server is offline. Start it by running <strong>start.bat</strong> or <code>uvicorn main:app --reload --port 8000</code> in the backend folder.
        </div>
      )}
      <div className="ud-messages">
        {/* Welcome message */}
        <div className="ud-msg-row assistant">
          <div className="ud-msg-bubble">
            <div className="ud-msg-text">Hello! I am your AI Knowledge Navigator. How can I help you today?</div>
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
          />
        ))}

        {isTyping && conversations.length === 0 && (
          <div className="ud-typing">NAVIGATOR IS PROCESSING...</div>
        )}
      </div>
      <div className="ud-input-wrap">
        <input
          className="ud-chat-input"
          placeholder="Query the knowledge base..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
        />
        <button className="ud-send-btn" onClick={handleSendMessage}>
          ➜
        </button>
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
      <style>{`
        .ud-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .ud-root {
          display: flex;
          height: 100vh;
          background-color: #0b0c10;
          color: #f8fafc;
          font-family: 'Inter', system-ui, sans-serif;
          overflow: hidden;
        }

        /* --- SIDEBAR --- */
        .ud-sidebar {
          width: 260px;
          background-color: #0a0b10;
          border-right: 1px solid #1f222b;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        .ud-brand {
          padding: 24px 20px;
        }
        .ud-brand-logo {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #f1f5f9;
        }
        .ud-brand-sub {
          font-size: 9px;
          color: #64748b;
          letter-spacing: 1px;
          margin-top: 6px;
        }
        .ud-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 20px 24px;
        }
        .ud-avatar {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 4px;
          background-color: #334155;
        }
        .ud-avatar-badge {
          position: absolute;
          bottom: -4px;
          right: -4px;
          background: #6366f1;
          font-size: 8px;
          padding: 2px;
          border-radius: 2px;
        }
        .ud-profile-name {
          font-size: 13px;
          font-weight: 600;
          color: #f1f5f9;
        }
        .ud-profile-role { font-size: 9px; color: #94a3b8; margin-top: 2px; text-transform: uppercase; }
        .ud-new-chat-btn {
          margin: 0 20px 24px;
          background-color: transparent;
          border: 1px solid #1f222b;
          color: #cbd5e1;
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          transition: 0.2s;
        }
        .ud-new-chat-btn:hover { background-color: #1e2029; color: #fff; }
        .ud-nav-section {
          padding: 0 12px;
          flex: 1;
        }
        .ud-nav-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #475569;
          margin: 0 8px 12px;
        }
        .ud-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: #94a3b8;
          border-radius: 4px;
          cursor: pointer;
          margin-bottom: 2px;
          transition: 0.2s;
          border-left: 2px solid transparent;
        }
        .ud-nav-item:hover { color: #f1f5f9; background-color: #1e2029; }
        .ud-nav-item.active {
          color: #f1f5f9;
          background-color: #1a1b26;
          border-left-color: #a5b4fc;
        }
        .ud-nav-icon { font-size: 14px; opacity: 0.7; width: 20px; text-align: center; }
        .ud-history-section {
          padding: 24px 20px;
          border-top: 1px solid #1f222b;
        }
        .ud-history-empty {
          font-size: 11px;
          font-style: italic;
          color: #475569;
          padding: 16px;
          border: 1px dashed #1f222b;
          border-radius: 4px;
          text-align: center;
        }

        /* --- MAIN CONTENT --- */
        .ud-main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #0b0c10;
          position: relative;
        }
        .ud-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          height: 72px;
          flex-shrink: 0;
        }
        .ud-topbar-left { display: flex; align-items: center; }
        .ud-topbar-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 600;
          color: #e2e8f0;
        }
        .ud-session-id {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1px;
          color: #64748b;
          margin-left: 12px;
        }
        .ud-topbar-right { display: flex; align-items: center; gap: 20px; }
        .ud-search-box {
          display: flex;
          align-items: center;
          background-color: #14151a;
          border: 1px solid #1f222b;
          border-radius: 4px;
          padding: 8px 12px;
          width: 250px;
        }
        .ud-search-box input {
          background: transparent;
          border: none;
          color: #f8fafc;
          font-size: 12px;
          width: 100%;
          outline: none;
        }
        .ud-search-box input::placeholder { color: #475569; font-weight: 500; }
        .ud-search-icon { font-size: 12px; color: #475569; cursor: pointer; }
        .ud-icon-btn { font-size: 16px; color: #94a3b8; cursor: pointer; transition: color 0.2s; }
        .ud-icon-btn:hover { color: #fff; }

        /* --- ANALYTICS VIEW --- */
        .ud-analytics-view {
          background-color: #0d0f14;
        }
        .ud-topbar-tabs {
          display: flex;
          gap: 32px;
        }
        .ud-top-tab {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1px;
          color: #64748b;
          cursor: pointer;
        }
        .ud-top-tab.active { color: #f8fafc; font-weight: 700; }
        .ud-top-avatar {
          width: 28px; height: 28px; border-radius: 4px; overflow: hidden;
        }

        .ud-analytics-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 40px 60px;
          scrollbar-width: none;
        }
        .ud-analytics-scroll::-webkit-scrollbar { display: none; }

        .ud-analytics-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background-color: #14151a;
          border: 1px solid #1f222b;
          margin-bottom: 40px;
        }
        .ud-stat-card {
          padding: 32px;
          border-right: 1px solid #1f222b;
        }
        .ud-stat-card:last-child { border-right: none; }
        .ud-stat-label { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: #64748b; margin-bottom: 16px; }
        .ud-stat-val { font-family: 'Inter', sans-serif; font-size: 36px; font-weight: 800; color: #f8fafc; margin-bottom: 12px; }
        .ud-stat-trend { font-size: 12px; font-weight: 600; color: #94a3b8; }
        .ud-stack { display: flex; flex-direction: column; gap: 24px; }
        .ud-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .ud-card { background: #14151a; border: 1px solid #1f222b; border-radius: 8px; padding: 18px; min-height: 120px; display: flex; flex-direction: column; gap: 12px; justify-content: space-between; }
        .ud-card-title { font-size: 14px; font-weight: 600; color: #e2e8f0; }
        .ud-truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ud-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .ud-muted { color: #94a3b8; font-size: 12px; }
        .ud-error { background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.28); border-radius: 6px; padding: 12px 14px; font-size: 12px; }
        .ud-empty-panel { min-height: 220px; border: 1px dashed #334155; border-radius: 8px; color: #94a3b8; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; font-size: 14px; }
        .ud-large-icon { font-size: 28px; }
        .ud-skeleton { animation: udPulse 1.2s ease-in-out infinite; background: linear-gradient(90deg, #14151a 0%, #1c1f28 50%, #14151a 100%); background-size: 200% 100%; }
        @keyframes udPulse { 0% { background-position: 0% 0%; } 100% { background-position: -200% 0%; } }
        .ud-badge { display: inline-flex; align-items: center; padding: 4px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.4px; border: 1px solid transparent; }
        .ud-badge-red { color: #f87171; background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.3); }
        .ud-badge-blue { color: #60a5fa; background: rgba(96, 165, 250, 0.1); border-color: rgba(96, 165, 250, 0.3); }
        .ud-badge-green { color: #34d399; background: rgba(52, 211, 153, 0.1); border-color: rgba(52, 211, 153, 0.3); }
        .ud-badge-yellow { color: #fbbf24; background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.3); }
        .ud-badge-muted { color: #94a3b8; background: rgba(148, 163, 184, 0.12); border-color: rgba(148, 163, 184, 0.28); }

        /* --- CHAT VIEW --- */
        .ud-chat-view { height: calc(100vh - 120px); display: flex; flex-direction: column; overflow: hidden; padding: 0 40px 20px; }
        .ud-messages { flex: 1; overflow-y: auto; padding: 20px 0; display: flex; flex-direction: column; gap: 24px; scrollbar-width: none; }
        .ud-messages::-webkit-scrollbar { display: none; }
        .ud-msg-row { display: flex; }
        .ud-msg-row.user { justify-content: flex-end; }
        .ud-msg-bubble { max-width: 80%; padding: 16px 20px; border-radius: 4px; line-height: 1.6; font-size: 14px; position: relative; }
        .ud-msg-row.assistant .ud-msg-bubble { background: #14151a; border: 1px solid #1f222b; color: #e2e8f0; }
        .ud-msg-row.user .ud-msg-bubble { background: #6366f1; color: #fff; font-weight: 500; }
        .ud-msg-text { white-space: pre-wrap; }
        .ud-citations { margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; border-top: 1px solid #1f222b; padding-top: 12px; }
        .ud-cite-label { font-size: 8px; font-weight: 700; color: #64748b; letter-spacing: 1px; }
        .ud-cite-pill { background: #1f222b; border: 1px solid #334155; padding: 4px 8px; border-radius: 2px; font-size: 10px; color: #94a3b8; cursor: help; }
        .ud-typing { font-size: 10px; font-weight: 700; color: #6366f1; letter-spacing: 1px; padding: 10px 0; }
        .ud-input-wrap { display: flex; gap: 12px; align-items: center; background: #0a0b10; border: 1px solid #1f222b; padding: 8px 16px; border-radius: 4px; }
        .ud-chat-input { flex: 1; background: transparent; border: none; color: #fff; outline: none; font-size: 14px; padding: 8px 0; }
        .ud-send-btn { background: #6366f1; color: #fff; border: none; width: 32px; height: 32px; border-radius: 4px; cursor: pointer; display: grid; placeItems: center; font-weight: bold; }
        
        @keyframes slideUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .profile-dropdown {
          position: fixed;
          bottom: 80px;
          left: 10px;
          width: 240px;
          background: #0a0b10;
          border: 1px solid #1f222b;
          border-radius: 4px;
          padding: 20px;
          z-index: 1000;
          box-shadow: 0 10px 40px rgba(0,0,0,0.6);
          animation: slideUp 0.2s ease;
        }
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .p-section { margin-bottom: 16px; border-bottom: 1px solid #1f222b; padding-bottom: 16px; }
        .p-label { font-size: 8px; color: #475569; letter-spacing: 1.5px; margin-bottom: 6px; text-transform: uppercase; font-weight: 700; }
        .p-val { font-size: 13px; font-weight: 600; color: #f1f5f9; }
      `}</style>

      <div className="ud-sidebar">
        <div className="ud-brand">
          <div className="ud-brand-logo"><span className="ud-logo-icon">💠</span> AskIT</div>
          <div className="ud-brand-sub">INSTITUTIONAL INTELLIGENCE</div>
        </div>

        <div className="ud-profile">
          <div className="ud-avatar">
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>{userInitial}</div>
            <div className="ud-avatar-badge">👤</div>
          </div>
          <div className="ud-profile-text">
            <div className="ud-profile-name">{userLabel}</div>
            <div className="ud-profile-role">USER PORTAL</div>
          </div>
        </div>

        <div className="ud-nav-section">
          <div className="ud-nav-label">NAVIGATION</div>
          {SIDEBAR_ITEMS.map((item) => (
            <div
              key={item.key}
              className={`ud-nav-item ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => handleSidebarClick(item.key)}
            >
              <span className="ud-nav-icon">{item.icon}</span> {item.label}
            </div>
          ))}
        </div>

        <div className="ud-sidebar-footer" style={{ padding: '0 12px 20px' }}>
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
              <div className="p-section" style={{ border: 'none' }}>
                <div className="p-label">ACCESS LEVEL</div>
                <div className="p-val">{(role || 'USER').toUpperCase()}</div>
              </div>
              <button className="ud-stat-trend" style={{ width: '100%', color: '#ef4444', background: 'transparent', border: '1px solid #ef444433', padding: '8px', cursor: 'pointer', borderRadius: '4px' }} onClick={signOut}>TERMINATE SESSION</button>
            </div>
          )}
          <button className="ud-new-chat-btn" style={{ width: '100%', margin: '0 0 12px' }} onClick={() => {
            if (conversations.length > 0) {
              const session = { id: Date.now(), title: conversations[0].query.slice(0, 50), conversations, timestamp: new Date() }
              setSessions(prev => [session, ...prev])
            }
            setConversations([])
            setActiveSessionId(null)
            setActiveSection('chat')
            setTopTab('analytics')
          }}>
            + NEW CHAT
          </button>
          <button className="ud-new-chat-btn" style={{ width: '100%', margin: '0 0 20px', background: '#1e2029' }} onClick={() => setShowProfile(!showProfile)}>
            USER PROFILE
          </button>
          
          <div className="ud-nav-label">HISTORY</div>
          {sessions.length === 0 ? (
            <div className="ud-history-empty">0 sessions</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sessions.map(s => (
                <div
                  key={s.id}
                  className={`ud-nav-item${activeSessionId === s.id ? ' active' : ''}`}
                  style={{ fontSize: 11, cursor: 'pointer' }}
                  title={s.title}
                  onClick={() => {
                    setConversations(s.conversations || [])
                    setActiveSessionId(s.id)
                    setActiveSection('chat')
                    setTopTab('analytics')
                  }}
                >
                  <span className="ud-nav-icon">💬</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`ud-main-content ${shouldShowAnalyticsLayout ? 'ud-analytics-view' : ''}`}>
        <div className="ud-topbar">
          <div className="ud-topbar-left">
            <div className="ud-topbar-title" style={{ fontStyle: 'italic' }}>Knowledge Navigator</div>
          </div>

          <div className="ud-topbar-tabs">
            {TOP_TABS.map((tab) => (
              <div
                key={tab.key}
                className={`ud-top-tab ${topTab === tab.key ? 'active' : ''}`}
                onClick={() => syncTopTab(tab.key)}
              >
                {tab.label}
              </div>
            ))}
          </div>

          <div className="ud-topbar-right" style={{ position: 'relative' }}>
            <span className="ud-icon-btn">🔔</span>
            <span className="ud-icon-btn" onClick={() => setShowTopProfile(v => !v)} title="Profile">⚙️</span>
            <div className="ud-top-avatar" style={{ cursor: 'pointer' }} onClick={() => setShowTopProfile(v => !v)}>
              <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>{userInitial}</div>
            </div>
            {showTopProfile && (
              <div style={{ position: 'absolute', top: 40, right: 0, width: 220, background: '#0a0b10', border: '1px solid #1f222b', borderRadius: 4, padding: 16, zIndex: 200, boxShadow: '0 10px 40px rgba(0,0,0,.6)', animation: 'slideUp .2s ease' }}>
                <div style={{ fontSize: 8, color: '#475569', letterSpacing: '1.5px', marginBottom: 4, fontWeight: 700 }}>ACCOUNT</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                <div style={{ fontSize: 8, color: '#475569', letterSpacing: '1.5px', marginBottom: 4, fontWeight: 700 }}>ORGANIZATION</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>{orgName || 'N/A'}</div>
                <div style={{ fontSize: 8, color: '#475569', letterSpacing: '1.5px', marginBottom: 4, fontWeight: 700 }}>ROLE</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>{(role || 'USER').toUpperCase()}</div>
                <button style={{ width: '100%', background: 'transparent', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444', padding: '8px', fontSize: '10px', letterSpacing: '1px', cursor: 'pointer', borderRadius: 3 }} onClick={signOut}>SIGN OUT</button>
              </div>
            )}
          </div>
        </div>

        <div className="ud-analytics-scroll">
          {topTab === 'analytics' ? renderMainContent() : renderTopTabContent()}
        </div>
      </div>
    </div>
  )
}
