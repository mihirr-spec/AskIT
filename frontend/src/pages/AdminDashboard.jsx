import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api, { uploadDocument, ingestUrl } from '../lib/api'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const safe = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback)
const humanDate = (v) => v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Syne:wght@400;500;600;700;800&display=swap');

  :root {
    --ad-black: #080808;
    --ad-surface: #0f0f0f;
    --ad-surface2: #141414;
    --ad-surface3: #1a1a1a;
    --ad-off-white: #F0EDE6;
    --ad-cream: #E8E4DC;
    --ad-purple: #5B4FE8;
    --ad-purple-light: #7B72F0;
    --ad-purple-dim: rgba(91,79,232,0.12);
    --ad-purple-border: rgba(91,79,232,0.3);
    --ad-muted: rgba(240,237,230,0.4);
    --ad-muted2: rgba(240,237,230,0.2);
    --ad-border: rgba(240,237,230,0.08);
    --ad-border2: rgba(240,237,230,0.12);
    --ad-green: #1D9E75;
    --ad-serif: 'DM Serif Display', serif;
    --ad-sans: 'Syne', sans-serif;
  }

  .ad *, .ad *::before, .ad *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .ad {
    display: grid;
    grid-template-columns: 220px 1fr;
    min-height: 100vh;
    background: var(--ad-black);
    color: var(--ad-off-white);
    font-family: var(--ad-sans);
    cursor: none;
  }

  /* ── Cursor ── */
  #ad-cursor { position:fixed; width:6px; height:6px; background:var(--ad-purple); border-radius:50%; pointer-events:none; z-index:9999; transform:translate(-50%,-50%); mix-blend-mode:screen; }
  #ad-cursor-ring { position:fixed; width:28px; height:28px; border:1px solid rgba(91,79,232,0.4); border-radius:50%; pointer-events:none; z-index:9998; transform:translate(-50%,-50%); transition:width .25s,height .25s; }

  /* ── Sidebar ── */
  .ad-sidebar { background:var(--ad-surface); border-right:1px solid var(--ad-border); display:flex; flex-direction:column; position:sticky; top:0; height:100vh; overflow-y:auto; }
  .ad-logo { padding:28px 24px 20px; border-bottom:1px solid var(--ad-border); }
  .ad-logo-text { font-family:var(--ad-serif); font-size:22px; font-style:italic; color:var(--ad-off-white); line-height:1; }
  .ad-logo-sub { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:var(--ad-muted); margin-top:4px; font-family:var(--ad-sans); }
  .ad-nav { padding:16px 0; flex:1; }
  .ad-nav-item { display:flex; align-items:center; gap:12px; padding:11px 24px; font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:var(--ad-muted); cursor:none; transition:color 0.2s,background 0.2s; position:relative; width:100%; border:none; background:none; text-align:left; font-family:var(--ad-sans); }
  .ad-nav-item:hover { color:var(--ad-off-white); background:rgba(240,237,230,0.03); }
  .ad-nav-item.active { color:var(--ad-off-white); background:rgba(91,79,232,0.08); }
  .ad-nav-item.active::before { content:''; position:absolute; left:0; top:0; bottom:0; width:2px; background:var(--ad-purple); }
  .ad-nav-icon { width:14px; height:14px; opacity:0.6; flex-shrink:0; }
  .ad-nav-item.active .ad-nav-icon { opacity:1; }
  .ad-sidebar-foot { padding:20px 24px; border-top:1px solid var(--ad-border); }
  .ad-status { display:flex; align-items:center; gap:8px; font-size:9px; letter-spacing:0.12em; color:var(--ad-muted); margin-bottom:12px; }
  .ad-status-dot { width:6px; height:6px; border-radius:50%; background:var(--ad-green); box-shadow:0 0 6px rgba(29,158,117,0.5); flex-shrink:0; }
  .ad-profile-btn { width:100%; background:transparent; border:1px solid var(--ad-border2); color:var(--ad-muted); padding:9px 12px; font-size:9px; letter-spacing:0.15em; text-transform:uppercase; cursor:none; font-family:var(--ad-sans); transition:all 0.2s; text-align:left; display:flex; align-items:center; gap:8px; }
  .ad-profile-btn:hover { border-color:var(--ad-purple-border); color:var(--ad-off-white); }
  .ad-dropdown { position:fixed; bottom:72px; left:8px; width:204px; background:var(--ad-surface); border:1px solid var(--ad-border2); padding:20px; z-index:200; box-shadow:0 20px 60px rgba(0,0,0,0.8); animation:adSlideUp 0.2s ease; }
  @keyframes adSlideUp { from{transform:translateY(8px);opacity:0} to{transform:translateY(0);opacity:1} }
  .ad-d-label { font-size:8px; color:var(--ad-muted); letter-spacing:0.2em; text-transform:uppercase; margin-bottom:4px; }
  .ad-d-val { font-size:12px; color:var(--ad-off-white); margin-bottom:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ad-logout { width:100%; background:transparent; border:1px solid rgba(239,68,68,0.25); color:#f87171; padding:8px; font-size:9px; letter-spacing:0.15em; text-transform:uppercase; cursor:none; font-family:var(--ad-sans); transition:all 0.2s; }
  .ad-logout:hover { background:rgba(239,68,68,0.08); }

  /* ── Main ── */
  .ad-main { display:flex; flex-direction:column; overflow-y:auto; min-height:100vh; }
  .ad-topbar { display:flex; align-items:center; justify-content:space-between; padding:20px 40px; border-bottom:1px solid var(--ad-border); background:rgba(8,8,8,0.9); position:sticky; top:0; z-index:10; backdrop-filter:blur(8px); }
  .ad-topbar-left { display:flex; align-items:center; gap:16px; }
  .ad-sys-badge { display:flex; align-items:center; gap:6px; font-size:9px; letter-spacing:0.15em; text-transform:uppercase; color:var(--ad-green); border:1px solid rgba(29,158,117,0.25); padding:5px 12px; background:rgba(29,158,117,0.06); font-family:var(--ad-sans); }
  .ad-sys-badge.offline { color:#f87171; border-color:rgba(248,113,113,0.25); background:rgba(248,113,113,0.06); }
  .ad-topbar-right { display:flex; align-items:center; gap:20px; }
  .ad-topbar-email { font-size:10px; letter-spacing:0.1em; color:var(--ad-muted); font-family:var(--ad-sans); }
  .ad-topbar-clock { font-size:10px; letter-spacing:0.08em; color:var(--ad-muted2); font-family:var(--ad-sans); }
  .ad-content { padding:40px; flex:1; }

  /* ── Greeting ── */
  .ad-greeting { background:var(--ad-surface); border:1px solid var(--ad-border); padding:40px 44px; margin-bottom:24px; position:relative; overflow:hidden; }
  .ad-greeting::after { content:''; position:absolute; right:-80px; top:-80px; width:280px; height:280px; background:radial-gradient(circle,rgba(91,79,232,0.08) 0%,transparent 70%); pointer-events:none; }
  .ad-greeting-time { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:var(--ad-muted); margin-bottom:16px; }
  .ad-greeting-title { font-family:var(--ad-serif); font-size:clamp(32px,4vw,52px); color:var(--ad-off-white); line-height:1.05; margin-bottom:12px; }
  .ad-greeting-sub { font-size:11px; color:var(--ad-muted); letter-spacing:0.05em; }
  .ad-greeting-sub span { color:var(--ad-purple-light); }

  /* ── Stats ── */
  .ad-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--ad-border); border:1px solid var(--ad-border); margin-bottom:24px; }
  .ad-stat { background:var(--ad-surface); padding:28px 28px 24px; position:relative; overflow:hidden; transition:background 0.2s; }
  .ad-stat:hover { background:var(--ad-surface2); }
  .ad-stat-label { font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:var(--ad-muted); margin-bottom:16px; font-family:var(--ad-sans); }
  .ad-stat-val { font-family:var(--ad-serif); font-size:48px; color:var(--ad-off-white); line-height:1; margin-bottom:10px; }
  .ad-stat-delta { font-size:9px; letter-spacing:0.1em; color:var(--ad-muted); display:flex; align-items:center; gap:6px; }
  .ad-stat-delta.up { color:var(--ad-green); }
  .ad-stat-bar { position:absolute; bottom:0; left:0; right:0; height:2px; background:var(--ad-border); }
  .ad-stat-bar-fill { height:100%; background:var(--ad-purple); transition:width 1s ease; }

  /* ── Bottom grid ── */
  .ad-bottom { display:grid; grid-template-columns:1fr 340px; gap:24px; }
  .ad-left-col { display:flex; flex-direction:column; gap:24px; }
  .ad-right-col { display:flex; flex-direction:column; gap:24px; }

  /* ── Panel ── */
  .ad-panel { background:var(--ad-surface); border:1px solid var(--ad-border); }
  .ad-panel-hd { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--ad-border); }
  .ad-panel-title { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:var(--ad-muted); font-family:var(--ad-sans); }
  .ad-panel-action { font-size:9px; letter-spacing:0.15em; text-transform:uppercase; color:var(--ad-purple-light); cursor:none; background:none; border:none; font-family:var(--ad-sans); transition:color 0.2s; }
  .ad-panel-action:hover { color:var(--ad-off-white); }
  .ad-panel-body { padding:24px; }

  /* ── Empty ── */
  .ad-empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:180px; gap:12px; }
  .ad-empty-icon { width:40px; height:40px; border:1px solid var(--ad-border2); display:flex; align-items:center; justify-content:center; }
  .ad-empty-txt { font-size:10px; color:var(--ad-muted); letter-spacing:0.08em; }

  /* ── Sparkline ── */
  .ad-sparkline { display:flex; align-items:flex-end; gap:3px; height:40px; padding:0 4px; }
  .ad-spark-bar { flex:1; background:var(--ad-purple-dim); border-top:1px solid var(--ad-purple-border); transition:background 0.2s; }
  .ad-spark-bar:hover { background:rgba(91,79,232,0.25); }

  /* ── Quick actions ── */
  .ad-actions { display:flex; flex-direction:column; }
  .ad-action { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; border-bottom:1px solid var(--ad-border); cursor:none; transition:background 0.2s; background:none; border-left:none; border-right:none; border-top:none; width:100%; color:var(--ad-off-white); font-family:var(--ad-sans); }
  .ad-action:last-child { border-bottom:none; }
  .ad-action:hover { background:rgba(240,237,230,0.03); }
  .ad-action.primary { background:var(--ad-purple-dim); border-bottom-color:var(--ad-purple-border); }
  .ad-action.primary:hover { background:rgba(91,79,232,0.18); }
  .ad-action-label { font-size:10px; letter-spacing:0.15em; text-transform:uppercase; }
  .ad-action.primary .ad-action-label { color:var(--ad-purple-light); }
  .ad-action-arrow { font-size:14px; color:var(--ad-muted); transition:transform 0.2s,color 0.2s; }
  .ad-action:hover .ad-action-arrow { transform:translateX(3px); color:var(--ad-off-white); }
  .ad-action.primary .ad-action-arrow { color:var(--ad-purple-light); }

  /* ── Index status ── */
  .ad-index-row { display:flex; align-items:center; justify-content:space-between; padding:14px 24px; border-bottom:1px solid var(--ad-border); }
  .ad-index-row:last-child { border-bottom:none; }
  .ad-index-label { font-size:10px; letter-spacing:0.1em; color:var(--ad-muted); }
  .ad-index-tag { font-size:8px; letter-spacing:0.15em; text-transform:uppercase; padding:3px 8px; border:1px solid; font-family:var(--ad-sans); }
  .tag-idle { color:var(--ad-muted); border-color:var(--ad-border2); }
  .tag-ready { color:var(--ad-green); border-color:rgba(29,158,117,0.3); }
  .tag-offline { color:#f87171; border-color:rgba(248,113,113,0.3); }

  /* ── Vec canvas ── */
  .ad-vec-viz { padding:20px 24px; border-top:1px solid var(--ad-border); }
  .ad-vec-label { font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:var(--ad-muted); margin-bottom:12px; font-family:var(--ad-sans); }
  .ad-vec-wrap { position:relative; height:80px; background:var(--ad-surface2); border:1px solid var(--ad-border); overflow:hidden; }
  .ad-vec-wrap canvas { width:100%; height:100%; display:block; }

  /* ── Activity feed ── */
  .ad-feed-item { padding:14px 0; border-bottom:1px solid var(--ad-border); }
  .ad-feed-item:last-child { border-bottom:none; }
  .ad-feed-meta { font-size:9px; color:var(--ad-muted); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:4px; }
  .ad-feed-title { font-size:13px; color:var(--ad-off-white); }

  /* ── Section header ── */
  .ad-section-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
  .ad-section-label { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:var(--ad-muted); font-family:var(--ad-sans); display:flex; align-items:center; gap:12px; }
  .ad-section-label::after { content:''; flex:1; height:1px; background:var(--ad-border); }

  /* ── Cards / panels for sub-pages ── */
  .ad-card { background:var(--ad-surface); border:1px solid var(--ad-border); padding:24px; margin-bottom:20px; }
  .ad-card:last-child { margin-bottom:0; }
  .ad-stack { display:flex; flex-direction:column; gap:20px; }
  .ad-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .ad-split { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .ad-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

  /* ── Table ── */
  .ad-table { width:100%; border-collapse:collapse; }
  .ad-table th { font-size:9px; letter-spacing:0.15em; text-transform:uppercase; color:var(--ad-muted); font-family:var(--ad-sans); padding:10px 12px; border-bottom:1px solid var(--ad-border); text-align:left; }
  .ad-table td { padding:12px; border-bottom:1px solid var(--ad-border); font-size:13px; color:var(--ad-off-white); }
  .ad-table tr:last-child td { border-bottom:none; }
  .ad-table tr:hover td { background:rgba(240,237,230,0.02); }

  /* ── Badges ── */
  .ad-badge { display:inline-flex; align-items:center; padding:3px 10px; font-size:9px; letter-spacing:0.12em; text-transform:uppercase; font-family:var(--ad-sans); border:1px solid var(--ad-border2); color:var(--ad-muted); }
  .ad-badge.green { color:var(--ad-green); border-color:rgba(29,158,117,0.3); background:rgba(29,158,117,0.06); }
  .ad-badge.red { color:#f87171; border-color:rgba(248,113,113,0.3); background:rgba(248,113,113,0.06); }
  .ad-badge.blue { color:#60a5fa; border-color:rgba(96,165,250,0.3); background:rgba(96,165,250,0.06); }
  .ad-badge.yellow { color:#fbbf24; border-color:rgba(251,191,36,0.3); background:rgba(251,191,36,0.06); }
  .ad-badge.purple { color:var(--ad-purple-light); border-color:var(--ad-purple-border); background:var(--ad-purple-dim); }

  /* ── Buttons ── */
  .ad-btn { background:transparent; border:1px solid var(--ad-border2); color:var(--ad-muted); padding:9px 18px; font-size:9px; letter-spacing:0.15em; text-transform:uppercase; cursor:none; font-family:var(--ad-sans); transition:all 0.2s; }
  .ad-btn:hover { border-color:var(--ad-off-white); color:var(--ad-off-white); }
  .ad-btn.primary { background:var(--ad-purple-dim); border-color:var(--ad-purple-border); color:var(--ad-purple-light); }
  .ad-btn.primary:hover { background:rgba(91,79,232,0.2); color:var(--ad-off-white); }
  .ad-btn:disabled { opacity:0.4; cursor:not-allowed; }

  /* ── Inputs ── */
  .ad-input, .ad-select { background:var(--ad-surface2); border:1px solid var(--ad-border2); color:var(--ad-off-white); padding:10px 14px; width:100%; font-size:13px; font-family:var(--ad-sans); outline:none; }
  .ad-input::placeholder { color:var(--ad-muted); }
  .ad-input:focus, .ad-select:focus { border-color:var(--ad-purple-border); }
  .ad-select { appearance:none; cursor:none; }
  .ad-label { font-size:9px; letter-spacing:0.15em; text-transform:uppercase; color:var(--ad-muted); margin-bottom:6px; display:block; font-family:var(--ad-sans); }
  .ad-field { margin-bottom:16px; }

  /* ── Drop zone ── */
  .ad-drop-zone { border:1px dashed var(--ad-border2); padding:40px; text-align:center; cursor:none; transition:all 0.2s; color:var(--ad-muted); font-size:12px; }
  .ad-drop-zone:hover, .ad-drop-zone.drag { border-color:var(--ad-purple-border); background:var(--ad-purple-dim); color:var(--ad-purple-light); }
  .ad-file-input { display:none; }

  /* ── Error / success ── */
  .ad-error { padding:12px 16px; background:rgba(248,113,113,0.07); border:1px solid rgba(248,113,113,0.2); color:#f87171; font-size:12px; margin-bottom:16px; }
  .ad-success { padding:12px 16px; background:rgba(29,158,117,0.07); border:1px solid rgba(29,158,117,0.2); color:var(--ad-green); font-size:12px; margin-bottom:16px; }
  .ad-empty { padding:40px; text-align:center; color:var(--ad-muted); font-size:12px; border:1px dashed var(--ad-border); }
  .ad-spinner { width:16px; height:16px; border:1.5px solid var(--ad-border2); border-top-color:var(--ad-purple); border-radius:50%; animation:adSpin 0.7s linear infinite; margin:48px auto; }
  @keyframes adSpin { to{transform:rotate(360deg)} }

  /* ── Modal ── */
  .ad-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:300; display:flex; align-items:center; justify-content:center; }
  .ad-modal { background:var(--ad-surface); border:1px solid var(--ad-border2); padding:32px; width:460px; max-width:94vw; box-shadow:0 24px 60px rgba(0,0,0,0.8); }
  .ad-modal-title { font-family:var(--ad-serif); font-size:24px; font-style:italic; margin-bottom:24px; color:var(--ad-off-white); }

  /* ── Org details ── */
  .ad-org-row { display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid var(--ad-border); }
  .ad-org-row:last-child { border-bottom:none; }
  .ad-org-key { font-size:9px; letter-spacing:0.15em; text-transform:uppercase; color:var(--ad-muted); font-family:var(--ad-sans); }
  .ad-org-val { font-size:14px; color:var(--ad-off-white); }

  /* ── Reveal ── */
  .ad-reveal { opacity:0; transform:translateY(16px); transition:opacity 0.5s ease,transform 0.5s ease; }
  .ad-reveal.in { opacity:1; transform:none; }
  .d1{transition-delay:0.05s} .d2{transition-delay:0.1s} .d3{transition-delay:0.15s} .d4{transition-delay:0.2s}
`

function Spinner() { return <div className="ad-spinner" /> }
function ErrorMsg({ msg }) { return msg ? <div className="ad-error">{msg}</div> : null }
function Empty({ msg }) { return <div className="ad-empty">{msg}</div> }

function MiniVecCanvas() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    const resize = () => {
      canvas.width  = canvas.offsetWidth  * (window.devicePixelRatio || 1)
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1)
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
    }
    resize()
    const W = () => canvas.offsetWidth, H = () => canvas.offsetHeight
    const dots = Array.from({ length: 30 }, () => ({
      x: Math.random() * W(), y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
      r: 1 + Math.random() * 1.5, a: 0.15 + Math.random() * 0.35,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0 || d.x > W()) d.vx *= -1
        if (d.y < 0 || d.y > H()) d.vy *= -1
      })
      dots.forEach((a, i) => {
        dots.slice(i + 1).forEach(b => {
          const dx = a.x - b.x, dy = a.y - b.y, dist = Math.sqrt(dx*dx+dy*dy)
          if (dist < 55) {
            ctx.strokeStyle = `rgba(91,79,232,${0.12*(1-dist/55)})`
            ctx.lineWidth = 0.5
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          }
        })
      })
      dots.forEach(d => {
        ctx.fillStyle = `rgba(91,79,232,${d.a})`
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2); ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={canvasRef} />
}

const NAV_ITEMS = [
  {
    label: 'Dashboard', path: '/dashboard',
    icon: <svg className="ad-nav-icon" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1"/><rect x="8" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1"/><rect x="1" y="8" width="5" height="5" stroke="currentColor" strokeWidth="1"/><rect x="8" y="8" width="5" height="5" stroke="currentColor" strokeWidth="1"/></svg>
  },
  {
    label: 'Organization', path: '/organization',
    icon: <svg className="ad-nav-icon" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1"/><path d="M4 3V2M10 3V2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/><line x1="1" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="0.8"/></svg>
  },
  {
    label: 'Members', path: '/members',
    icon: <svg className="ad-nav-icon" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1"/><circle cx="10" cy="5" r="2" stroke="currentColor" strokeWidth="1"/><path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/><path d="M10 9c1.7 0 3 1.3 3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
  },
  {
    label: 'Documents', path: '/documents',
    icon: <svg className="ad-nav-icon" viewBox="0 0 14 14" fill="none"><rect x="2" y="1" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1"/><line x1="4" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="0.8"/><line x1="4" y1="7.5" x2="10" y2="7.5" stroke="currentColor" strokeWidth="0.8"/><line x1="4" y1="10" x2="7" y2="10" stroke="currentColor" strokeWidth="0.8"/></svg>
  },
  {
    label: 'Analytics', path: '/analytics',
    icon: <svg className="ad-nav-icon" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8 10,3 13,5" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="13" x2="13" y2="13" stroke="currentColor" strokeWidth="0.8"/></svg>
  },
]

export default function AdminDashboard() {
  const { user, signOut, orgName, role } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [health, setHealth] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [time, setTime] = useState('')

  useEffect(() => {
    api.get('/health').then(({ data }) => setHealth(data?.status === 'ok')).catch(() => setHealth(false))
  }, [])

  useEffect(() => {
    const update = () => {
      const n = new Date()
      const h = String(n.getHours()).padStart(2,'0')
      const m = String(n.getMinutes()).padStart(2,'0')
      const s = String(n.getSeconds()).padStart(2,'0')
      setTime(`${h}:${m}:${s} IST`)
    }
    update(); const id = setInterval(update, 1000); return () => clearInterval(id)
  }, [])

  // cursor
  useEffect(() => {
    const dot  = document.getElementById('ad-cursor')
    const ring = document.getElementById('ad-cursor-ring')
    if (!dot || !ring) return
    let rx=0,ry=0,cx=0,cy=0
    const onMove = e => { cx=e.clientX; cy=e.clientY; dot.style.left=cx+'px'; dot.style.top=cy+'px' }
    document.addEventListener('mousemove', onMove)
    let raf
    const anim = () => { rx+=(cx-rx)*0.12; ry+=(cy-ry)*0.12; ring.style.left=rx+'px'; ring.style.top=ry+'px'; raf=requestAnimationFrame(anim) }
    anim()
    return () => { document.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])

  // scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in') }), { threshold: 0.1 })
    document.querySelectorAll('.ad-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  })

  const handleSignOut = async () => { await signOut(); navigate('/login') }
  const isNominal = health === true

  return (
    <div className="ad">
      <style>{CSS}</style>
      <div id="ad-cursor" />
      <div id="ad-cursor-ring" />

      {/* ── SIDEBAR ── */}
      <aside className="ad-sidebar">
        <div className="ad-logo">
          <div className="ad-logo-text">AskIT</div>
          <div className="ad-logo-sub">Admin Portal</div>
        </div>
        <nav className="ad-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.path}
              className={`ad-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        <div className="ad-sidebar-foot">
          <div className="ad-status">
            <div className="ad-status-dot" style={health === false ? { background: '#f87171', boxShadow: '0 0 6px rgba(248,113,113,0.5)' } : {}} />
            {health === null ? 'Checking...' : health ? 'System Nominal' : 'Backend Offline'}
          </div>
          {showProfile && (
            <div className="ad-dropdown">
              <div className="ad-d-label">Account</div>
              <div className="ad-d-val">{user?.email}</div>
              <div className="ad-d-label">Organization</div>
              <div className="ad-d-val">{orgName || '—'}</div>
              <div className="ad-d-label">Role</div>
              <div className="ad-d-val">{(role || 'admin').toUpperCase()}</div>
              <button className="ad-logout" onClick={handleSignOut}>Sign Out →</button>
            </div>
          )}
          <button className="ad-profile-btn" onClick={() => setShowProfile(v => !v)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1"/><path d="M1 11c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
            User Profile
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="ad-main">
        <div className="ad-topbar">
          <div className="ad-topbar-left">
            <div className={`ad-sys-badge ${!isNominal && health !== null ? 'offline' : ''}`}>
              <div style={{ width:5, height:5, borderRadius:'50%', background: health === false ? '#f87171' : 'var(--ad-green)' }} />
              {health === null ? 'Checking...' : health ? 'System Nominal' : 'Backend Offline'}
            </div>
          </div>
          <div className="ad-topbar-right">
            <span className="ad-topbar-clock">{time}</span>
            <span className="ad-topbar-email">{(user?.email || '').toUpperCase()}</span>
          </div>
        </div>

        <div className="ad-content">
          {location.pathname === '/dashboard'    && <DashboardPage    health={health} />}
          {location.pathname === '/organization' && <OrganizationPage />}
          {location.pathname === '/members'      && <MembersPage />}
          {location.pathname === '/documents'    && <DocumentsPage />}
          {location.pathname === '/analytics'    && <AnalyticsPage />}
        </div>
      </main>
    </div>
  )
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function DashboardPage({ health }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [feed, setFeed]     = useState([])
  const [greetTime, setGreetTime] = useState('')
  const [greetTitle, setGreetTitle] = useState('')
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    const n = new Date()
    const h = String(n.getHours()).padStart(2,'0')
    const m = String(n.getMinutes()).padStart(2,'0')
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    setGreetTime(`${days[n.getDay()]} ${n.getDate()} ${months[n.getMonth()]} ${n.getFullYear()} · ${h}:${m} IST`)
  }, [])

  useEffect(() => {
    const hr = new Date().getHours()
    const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'
    const displayName = adminName || user?.email?.split('@')[0] || 'admin'
    setGreetTitle(`${greeting}, ${displayName}.`)
  }, [adminName, user])

  useEffect(() => {
    const run = async () => {
      try {
        const [sumRes, actRes, membersRes] = await Promise.all([
          api.get('/admin/dashboard/summary'),
          api.get('/admin/activity'),
          api.get('/admin/members'),
        ])
        setData(sumRes.data || {})
        setFeed(actRes.data?.events || [])
        const me = (membersRes.data?.items || []).find(m => m.email?.toLowerCase() === user?.email?.toLowerCase())
        if (me?.name) setAdminName(me.name)
      } catch {
        setData({ total_documents: 0, total_members: 0, total_queries: 0, chunks_indexed: 0 })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user])

  if (loading) return <Spinner />

  const docs    = safe(data?.total_documents)
  const chunks  = safe(data?.chunks_indexed)
  const members = safe(data?.total_members)
  const queries = safe(data?.total_queries)

  const stats = [
    { label: 'Documents',     value: docs,    delta: docs    > 0 ? '↑ Knowledge loaded'   : '— No uploads yet',        up: docs    > 0, pct: Math.min(docs    * 10, 100) },
    { label: 'Chunks Indexed',value: chunks,  delta: chunks  > 0 ? '↑ Vector store active' : '— Awaiting ingestion',    up: chunks  > 0, pct: Math.min(chunks  / 10, 100) },
    { label: 'Members',       value: members, delta: members > 0 ? '↑ Active workspace'    : '— No members yet',        up: members > 0, pct: Math.min(members * 10, 100) },
    { label: 'Total Queries', value: queries, delta: queries > 0 ? '↑ Navigator active'    : '— Query your docs to begin', up: queries > 0, pct: Math.min(queries * 5, 100) },
  ]

  // fake sparkline — zeros unless real data wired
  const sparkVals = Array(14).fill(0)

  return (
    <>
      {/* Greeting */}
      <div className="ad-greeting ad-reveal">
        <div className="ad-greeting-time">{greetTime}</div>
        <h1 className="ad-greeting-title">{greetTitle}</h1>
        <p className="ad-greeting-sub">
          <span>{docs}</span> documents indexed &nbsp;·&nbsp;
          <span>{chunks}</span> chunks in vector store &nbsp;·&nbsp;
          <span>{queries}</span> queries today
        </p>
      </div>

      {/* Stats */}
      <div className="ad-stats ad-reveal d1">
        {stats.map(s => (
          <div key={s.label} className="ad-stat">
            <div className="ad-stat-label">{s.label}</div>
            <div className="ad-stat-val">{s.value.toLocaleString()}</div>
            <div className={`ad-stat-delta ${s.up ? 'up' : ''}`}>{s.delta}</div>
            <div className="ad-stat-bar"><div className="ad-stat-bar-fill" style={{ width: s.pct + '%' }} /></div>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="ad-bottom">
        <div className="ad-left-col">
          {/* Activity */}
          <div className="ad-panel ad-reveal d2">
            <div className="ad-panel-hd">
              <span className="ad-panel-title">Recent Activity</span>
              <button className="ad-panel-action">View All →</button>
            </div>
            <div className="ad-panel-body">
              {!feed.length
                ? (
                  <div className="ad-empty-state">
                    <div className="ad-empty-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="10" height="12" rx="1" stroke="rgba(240,237,230,0.2)" strokeWidth="1"/><line x1="5" y1="6" x2="11" y2="6" stroke="rgba(240,237,230,0.15)" strokeWidth="0.8"/><line x1="5" y1="8.5" x2="11" y2="8.5" stroke="rgba(240,237,230,0.15)" strokeWidth="0.8"/><line x1="5" y1="11" x2="8" y2="11" stroke="rgba(240,237,230,0.15)" strokeWidth="0.8"/></svg>
                    </div>
                    <span className="ad-empty-txt">No activity yet. Upload a document to get started.</span>
                  </div>
                )
                : feed.map((ev, i) => (
                  <div key={i} className="ad-feed-item">
                    <div className="ad-feed-meta">{ev.type?.toUpperCase()} · {humanDate(ev.timestamp)}</div>
                    <div className="ad-feed-title">{ev.title || '—'}</div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Sparkline */}
          <div className="ad-panel ad-reveal d3">
            <div className="ad-panel-hd">
              <span className="ad-panel-title">Query Volume — Last 14 Days</span>
            </div>
            <div className="ad-panel-body" style={{ paddingBottom: 16 }}>
              <div className="ad-sparkline">
                {sparkVals.map((v, i) => (
                  <div key={i} className="ad-spark-bar" style={{ height: Math.max(4, v) + 'px' }} />
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, padding:'0 4px' }}>
                <span style={{ fontSize:9, color:'var(--ad-muted)', letterSpacing:'0.1em' }}>14d ago</span>
                <span style={{ fontSize:9, color:'var(--ad-muted)', letterSpacing:'0.1em' }}>Today</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ad-right-col">
          {/* Quick actions */}
          <div className="ad-panel ad-reveal d2">
            <div className="ad-panel-hd"><span className="ad-panel-title">Quick Actions</span></div>
            <div className="ad-actions">
              <button className="ad-action" onClick={() => navigate('/documents')}>
                <span className="ad-action-label">Upload Document</span>
                <span className="ad-action-arrow">→</span>
              </button>
              <button className="ad-action" onClick={() => navigate('/members')}>
                <span className="ad-action-label">Add Member</span>
                <span className="ad-action-arrow">→</span>
              </button>
              <button className="ad-action primary" onClick={() => navigate('/analytics')}>
                <span className="ad-action-label">View Analytics</span>
                <span className="ad-action-arrow">→</span>
              </button>
              <button className="ad-action" onClick={() => navigate('/documents')}>
                <span className="ad-action-label">Query Navigator</span>
                <span className="ad-action-arrow">→</span>
              </button>
            </div>
          </div>

          {/* Index status */}
          <div className="ad-panel ad-reveal d3">
            <div className="ad-panel-hd"><span className="ad-panel-title">Index Status</span></div>
            <div className="ad-index-row">
              <span className="ad-index-label">Vector Store</span>
              <span className={`ad-index-tag ${chunks > 0 ? 'tag-ready' : 'tag-idle'}`}>{chunks > 0 ? 'Active' : 'Idle'}</span>
            </div>
            <div className="ad-index-row">
              <span className="ad-index-label">Embedding Model</span>
              <span className="ad-index-tag tag-ready">Ready</span>
            </div>
            <div className="ad-index-row">
              <span className="ad-index-label">Ingestion Pipeline</span>
              <span className="ad-index-tag tag-ready">Ready</span>
            </div>
            <div className="ad-index-row">
              <span className="ad-index-label">Agent Loop</span>
              <span className={`ad-index-tag ${health ? 'tag-ready' : 'tag-offline'}`}>{health ? 'Ready' : 'Offline'}</span>
            </div>
            <div className="ad-vec-viz">
              <div className="ad-vec-label">Vector Space Preview</div>
              <div className="ad-vec-wrap"><MiniVecCanvas /></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── ORGANIZATION PAGE ────────────────────────────────────────────────────────
const CollegeIllustration = () => (
  <svg viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%' }}>
    <rect width="400" height="220" fill="url(#skyGrad)" />
    <rect y="185" width="400" height="35" fill="#0f1016" />
    <rect x="22" y="155" width="6" height="30" fill="#1a2a1a" /><ellipse cx="25" cy="148" rx="14" ry="18" fill="#1e3a1e" />
    <rect x="362" y="155" width="6" height="30" fill="#1a2a1a" /><ellipse cx="365" cy="148" rx="14" ry="18" fill="#1e3a1e" />
    <rect x="55" y="115" width="80" height="70" fill="#1a1b26" /><rect x="55" y="110" width="80" height="10" fill="#252640" />
    <rect x="265" y="115" width="80" height="70" fill="#1a1b26" /><rect x="265" y="110" width="80" height="10" fill="#252640" />
    <rect x="110" y="75" width="180" height="110" fill="#1e2035" /><rect x="110" y="68" width="180" height="12" fill="#2a2b48" />
    {[130,155,180,205,230,255].map(x=><rect key={x} x={x} y="130" width="8" height="55" fill="#252640"/>)}
    <rect x="118" y="126" width="164" height="8" fill="#2a2b48" />
    <rect x="150" y="185" width="100" height="5" fill="#252640" /><rect x="155" y="180" width="90" height="5" fill="#1e2035" /><rect x="160" y="175" width="80" height="5" fill="#252640" />
    <rect x="175" y="30" width="50" height="48" fill="#252640" /><rect x="172" y="27" width="56" height="8" fill="#2a2b48" />
    <polygon points="200,5 168,30 232,30" fill="#1a1b26" />
    <circle cx="200" cy="50" r="12" fill="#0f1016" stroke="#5b5fc7" strokeWidth="1.5" />
    <line x1="200" y1="50" x2="200" y2="42" stroke="#a5b4fc" strokeWidth="1.5" /><line x1="200" y1="50" x2="206" y2="54" stroke="#a5b4fc" strokeWidth="1" />
    <rect x="186" y="155" width="28" height="30" rx="2" fill="#0a0b14" stroke="#5b5fc7" strokeWidth="1" />
    <defs><linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#080910"/><stop offset="100%" stopColor="#12132a"/></linearGradient></defs>
  </svg>
)

const OfficeIllustration = () => (
  <svg viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%' }}>
    <rect width="400" height="220" fill="url(#skyGrad2)" />
    <rect y="185" width="400" height="35" fill="#0f1016" />
    <rect x="130" y="40" width="140" height="145" fill="#1a1b2e" />
    {[130,147,164,181,198,215,232,249].map(x=><line key={`v-${x}`} x1={x} y1="40" x2={x} y2="185" stroke="#1f2035" strokeWidth="1"/>)}
    {[40,55,70,85,100,115,130,145,160,175].map(y=><line key={`h-${y}`} x1="130" y1={y} x2="270" y2={y} stroke="#1f2035" strokeWidth="0.5"/>)}
    <rect x="148" y="30" width="104" height="14" fill="#222340" /><rect x="165" y="22" width="70" height="12" fill="#1a1b2e" /><rect x="178" y="14" width="44" height="12" fill="#222340" />
    <rect x="155" y="165" width="90" height="20" fill="#1e1f30" /><rect x="168" y="165" width="64" height="20" fill="#0f1016" stroke="#5b5fc7" strokeWidth="0.5" />
    <circle cx="200" cy="175" r="10" fill="none" stroke="#5b5fc7" strokeWidth="0.5" />
    <line x1="200" y1="165" x2="200" y2="185" stroke="#5b5fc7" strokeWidth="0.5" /><line x1="190" y1="175" x2="210" y2="175" stroke="#5b5fc7" strokeWidth="0.5" />
    <defs><linearGradient id="skyGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#060709"/><stop offset="100%" stopColor="#0f1020"/></linearGradient></defs>
  </svg>
)

const CommunityIllustration = () => (
  <svg viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%' }}>
    <rect width="400" height="220" fill="url(#skyGrad3)" />
    <rect y="185" width="400" height="35" fill="#0f1016" />
    <rect x="90" y="90" width="220" height="95" fill="#1a1b26" />
    <polygon points="80,92 200,50 320,92" fill="#1e2035" stroke="#2a2b48" strokeWidth="1" />
    <rect x="130" y="105" width="140" height="25" fill="#252640" />
    <rect x="178" y="147" width="44" height="38" rx="4" fill="#0a0b14" stroke="#5b5fc7" strokeWidth="1" />
    <line x1="200" y1="147" x2="200" y2="185" stroke="#2f3048" strokeWidth="0.5" />
    <line x1="200" y1="50" x2="200" y2="20" stroke="#2f3048" strokeWidth="1.5" />
    <polygon points="200,20 225,28 200,36" fill="#5b5fc7" />
    <defs><linearGradient id="skyGrad3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#080910"/><stop offset="100%" stopColor="#0f1420"/></linearGradient></defs>
  </svg>
)

function OrganizationPage() {
  const [loading, setLoading] = useState(true)
  const [org, setOrg]         = useState(null)
  const [summary, setSummary] = useState(null)
  const [error, setError]     = useState('')
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/admin/organization'),
      api.get('/admin/dashboard/summary'),
    ])
      .then(([orgRes, sumRes]) => { setOrg(orgRes.data); setSummary(sumRes.data) })
      .catch(() => setError('Could not load organization info.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const typeLabel = { college:'College / University', company:'Company / Enterprise', community:'Community / NGO' }
  const typeColor = { college:'var(--ad-purple-light)', company:'var(--ad-green)', community:'#fbbf24' }
  const typeBg    = { college:'rgba(123,114,240,0.12)', company:'rgba(29,158,117,0.12)', community:'rgba(251,191,36,0.12)' }

  const copyId = () => {
    navigator.clipboard.writeText(org.org_id || '')
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const members = safe(summary?.total_members)
  const docs    = safe(summary?.total_documents)
  const orgInitial = (org?.name || 'O')[0].toUpperCase()
  const tc = typeColor[org?.type] || 'var(--ad-purple-light)'
  const tb = typeBg[org?.type]    || 'var(--ad-purple-dim)'

  return (
    <div className="ad-stack">
      <ErrorMsg msg={error} />
      {org && (
        <>
          {/* ── Hero Banner ── */}
          <div style={{ background:'var(--ad-surface)', border:'1px solid var(--ad-border)', overflow:'hidden', position:'relative', minHeight:260 }}>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(29,158,117,0.06) 0%,rgba(91,79,232,0.08) 60%,transparent 100%)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(0deg,rgba(240,237,230,0.015) 0px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,rgba(240,237,230,0.015) 0px,transparent 1px,transparent 40px)', pointerEvents:'none' }} />

            {/* Type badge */}
            <div style={{ position:'absolute', top:20, left:24, display:'flex', alignItems:'center', gap:7, background:tb, border:`1px solid ${tc}`, padding:'6px 14px', fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:tc, textTransform:'uppercase' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:tc, boxShadow:`0 0 6px ${tc}` }} />
              {typeLabel[org.type] || org.type || 'Organization'}
            </div>

            {/* Org card — top right */}
            <div style={{ position:'absolute', top:20, right:24, background:'rgba(8,8,8,0.65)', border:'1px solid var(--ad-border2)', backdropFilter:'blur(12px)', padding:'20px 28px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <div style={{ width:52, height:52, background:tb, border:`1px solid ${tc}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:tc, fontFamily:'var(--ad-serif)', fontStyle:'italic' }}>
                {orgInitial}
              </div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ad-off-white)' }}>{org.name}</div>
            </div>

            {/* Bottom info row */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'20px 28px', display:'flex', alignItems:'flex-end', justifyContent:'space-between', background:'linear-gradient(to top,rgba(15,15,15,0.96) 0%,transparent 100%)' }}>
              <div>
                <div style={{ fontFamily:'var(--ad-serif)', fontSize:38, fontStyle:'italic', color:'var(--ad-off-white)', lineHeight:1.1, marginBottom:6 }}>{org.name}</div>
                <div style={{ fontSize:11, color:'var(--ad-muted)' }}>Knowledge Network · <span style={{ color:tc }}>Powered by AskIT</span></div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(29,158,117,0.1)', border:'1px solid rgba(29,158,117,0.3)', padding:'6px 18px', borderRadius:100, fontSize:11, fontWeight:700, color:'var(--ad-green)', flexShrink:0, letterSpacing:'0.05em' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--ad-green)', boxShadow:'0 0 6px rgba(29,158,117,0.7)' }} />
                Active
              </div>
            </div>
          </div>

          {/* ── Details + Stats ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20 }}>

            {/* Org Details */}
            <div className="ad-card">
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--ad-green)' }} />
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--ad-muted)' }}>Organization Details</span>
              </div>
              <div className="ad-org-row">
                <div className="ad-org-key">Name</div>
                <div className="ad-org-val">{org.name}</div>
              </div>
              <div className="ad-org-row">
                <div className="ad-org-key">Type</div>
                <div className="ad-org-val">
                  <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:tb, border:`1px solid ${tc}`, padding:'4px 12px', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:tc }}>
                    {typeLabel[org.type] || org.type || '—'}
                  </span>
                </div>
              </div>
              <div className="ad-org-row" style={{ borderBottom:'none' }}>
                <div className="ad-org-key">Organization ID</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--ad-muted)', background:'var(--ad-surface2)', border:'1px solid var(--ad-border)', padding:'4px 10px', maxWidth:230, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>
                    {org.org_id || '—'}
                  </span>
                  <button onClick={copyId} style={{ background: copied ? 'rgba(29,158,117,0.1)' : 'transparent', border:`1px solid ${copied ? 'rgba(29,158,117,0.3)' : 'var(--ad-border2)'}`, color: copied ? 'var(--ad-green)' : 'var(--ad-muted)', padding:'4px 12px', fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', cursor:'none', transition:'all 0.2s', fontFamily:'var(--ad-sans)' }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right stat cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div className="ad-card">
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--ad-muted)', marginBottom:16 }}>Members</div>
                <div style={{ fontFamily:'var(--ad-serif)', fontSize:56, color:'var(--ad-off-white)', lineHeight:1, marginBottom:10 }}>{members}</div>
                <div style={{ fontSize:11, color:'var(--ad-muted)' }}>
                  {members > 0 ? <>Admin active — <span style={{ color:'var(--ad-purple-light)' }}>{(org.name||'').toLowerCase().replace(/\s+/g,'')}.dev</span></> : 'No members yet'}
                </div>
              </div>
              <div className="ad-card">
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--ad-muted)', marginBottom:16 }}>Documents Indexed</div>
                <div style={{ fontFamily:'var(--ad-serif)', fontSize:56, color:'var(--ad-off-white)', lineHeight:1, marginBottom:10 }}>{docs}</div>
                <div style={{ fontSize:11, color:'var(--ad-muted)' }}>{docs > 0 ? `${docs} document${docs !== 1 ? 's' : ''} in knowledge base` : 'No documents uploaded yet'}</div>
              </div>
            </div>
          </div>
        </>
      )}
      {!org && !error && <Empty msg="No organization data found." />}
    </div>
  )
}

// ─── MEMBERS PAGE ─────────────────────────────────────────────────────────────
function MembersPage() {
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [rows, setRows]           = useState([])
  const [filter, setFilter]       = useState('all')
  const [showModal, setShowModal] = useState(false)

  const load = async () => {
    setLoading(true); setError('')
    try { const { data } = await api.get('/admin/members'); setRows(data?.items || []) }
    catch { setError('Could not load members.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? rows : rows.filter(r => r.member_type === filter)
  const typeColor = { student:'blue', employee:'green', general:'' }

  return (
    <div className="ad-stack">
      <ErrorMsg msg={error} />
      <div className="ad-row">
        {['all','student','employee','general'].map(f => (
          <button key={f} className={`ad-btn ${filter === f ? 'primary' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
        <span style={{ flex:1 }} />
        <span className="ad-badge purple">{filtered.length} Members</span>
        <button className="ad-btn primary" onClick={() => setShowModal(true)}>+ Add Member</button>
      </div>
      <div className="ad-card" style={{ padding:0 }}>
        {loading ? <div style={{ padding:24 }}><Spinner /></div> : !filtered.length ? <div style={{ padding:24 }}><Empty msg="No members found." /></div> : (
          <table className="ad-table">
            <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Status</th><th>Joined</th></tr></thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td>{m.name||'—'}</td>
                  <td style={{ color:'var(--ad-muted)', fontSize:12 }}>{m.email}</td>
                  <td><span className={`ad-badge ${typeColor[m.member_type]||''}`}>{(m.member_type||'general').toUpperCase()}</span></td>
                  <td><span className={`ad-badge ${m.is_registered?'green':'yellow'}`}>{m.is_registered?'Registered':'Pending'}</span></td>
                  <td style={{ fontSize:11, color:'var(--ad-muted)' }}>{humanDate(m.created_at)}</td>
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
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [memberType, setMemberType] = useState('student')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await api.post('/admin/members', { name, email, member_type: memberType }); onAdded() }
    catch (err) { setError(err?.response?.data?.detail || 'Failed to add member') }
    finally { setLoading(false) }
  }

  return (
    <div className="ad-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ad-modal">
        <div className="ad-modal-title">Add New Member</div>
        <ErrorMsg msg={error} />
        <form onSubmit={submit}>
          <div className="ad-field"><label className="ad-label">Full Name</label><input className="ad-input" value={name} onChange={e => setName(e.target.value)} placeholder="Member name" required /></div>
          <div className="ad-field"><label className="ad-label">Email Address</label><input className="ad-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="member@example.com" required /></div>
          <div className="ad-field">
            <label className="ad-label">Member Type</label>
            <select className="ad-select" value={memberType} onChange={e => setMemberType(e.target.value)}>
              <option value="student">Student</option><option value="employee">Employee</option><option value="general">General</option>
            </select>
          </div>
          <div style={{ fontSize:11, color:'var(--ad-muted)', marginBottom:20, lineHeight:1.6 }}>This member can register with their email. They cannot sign up without being added here first.</div>
          <div className="ad-row">
            <button type="button" className="ad-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="ad-btn primary" disabled={loading}>{loading ? 'Adding...' : 'Add Member'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── DOCUMENTS PAGE ───────────────────────────────────────────────────────────
function DocumentsPage() {
  const [docs, setDocs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [uploading, setUploading] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [url, setUrl]             = useState('')
  const [urlName, setUrlName]     = useState('')
  const [dragging, setDragging]   = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [docName, setDocName]     = useState('')
  const [search, setSearch]       = useState('')
  const [chunks, setChunks]       = useState(0)
  const fileRef = useRef(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [docsRes, summaryRes] = await Promise.all([
        api.get('/admin/documents'),
        api.get('/admin/dashboard/summary'),
      ])
      setDocs(docsRes.data?.items || [])
      setChunks(safe(summaryRes.data?.chunks_indexed))
    } catch {
      setError('Could not load documents.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const stageFile = (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) { setError('Only PDF files are supported'); return }
    setError(''); setPendingFile(file); setDocName(file.name.replace(/\.pdf$/i, ''))
  }

  const confirmUpload = async () => {
    if (!pendingFile) return
    setUploading(true); setError('')
    const fd = new FormData()
    fd.append('file', pendingFile)
    if (docName.trim()) fd.append('name', docName.trim())
    try { await uploadDocument(fd); setPendingFile(null); setDocName(''); await load() }
    catch (err) { setError(err?.response?.data?.detail || 'Upload failed. Make sure backend is running.') }
    finally { setUploading(false) }
  }

  const handleFileInput = (e) => { const f = e.target.files?.[0]; if (f) stageFile(f); e.target.value = '' }
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) stageFile(f) }

  const handleIngestUrl = async () => {
    if (!url.trim()) return
    setIngesting(true); setError('')
    try { await ingestUrl(url.trim(), urlName.trim() || url.trim()); setUrl(''); setUrlName(''); await load() }
    catch (err) { setError(err?.response?.data?.detail || 'URL ingestion failed.') }
    finally { setIngesting(false) }
  }

  const statusColor = { pending:'yellow', processing:'blue', completed:'green', failed:'red' }
  const typeColor   = { pdf:'red', url:'blue', arxiv:'green' }

  const totalDocs   = docs.length
  const totalUrls   = docs.filter(d => d.type === 'url' || d.type === 'arxiv').length

  const filtered = docs.filter(d =>
    !search.trim() ||
    (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.type || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.status || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="ad-stack">
      <ErrorMsg msg={error} />

      {/* ── Page header ── */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'var(--ad-serif)', fontSize:40, fontStyle:'italic', color:'var(--ad-off-white)', lineHeight:1 }}>Documents</div>
          <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', color:'var(--ad-muted)', marginTop:6, textTransform:'uppercase' }}>Manage your knowledge base · Upload PDFs or embed remote URLs</div>
        </div>
        <div style={{ fontSize:10, color:'var(--ad-muted)', letterSpacing:'0.08em', fontWeight:600 }}>{totalDocs} document{totalDocs !== 1 ? 's' : ''} indexed</div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:'var(--ad-border)', border:'1px solid var(--ad-border)' }}>
        {[
          {
            label:'Documents', value: totalDocs,
            color:'var(--ad-purple-light)', bg:'var(--ad-purple-dim)', border:'var(--ad-purple-border)',
            icon:<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2h7l4 4v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M10 2v4h4"/></svg>
          },
          {
            label:'Embedded URLs', value: totalUrls,
            color:'#60a5fa', bg:'rgba(96,165,250,0.1)', border:'rgba(96,165,250,0.25)',
            icon:<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4v4l3 2"/></svg>
          },
          {
            label:'Vectors Stored', value: chunks,
            color:'#b57bff', bg:'rgba(181,123,255,0.1)', border:'rgba(181,123,255,0.25)',
            icon:<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="8" cy="6" rx="6" ry="3"/><path d="M2 6c0 1.7 2.7 3 6 3s6-1.3 6-3"/><path d="M2 10c0 1.7 2.7 3 6 3s6-1.3 6-3"/></svg>
          },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--ad-surface)', padding:'18px 22px', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:s.bg, border:`1px solid ${s.border}`, color:s.color }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ad-muted)' }}>{s.label}</div>
              <div style={{ fontFamily:'var(--ad-serif)', fontSize:28, color:'var(--ad-off-white)', marginTop:2 }}>{s.value.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Upload grid ── */}
      <div className="ad-split">

        {/* Upload PDF */}
        <div style={{ background:'var(--ad-surface)', border:'1px solid var(--ad-border)', overflow:'hidden' }}>
          <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--ad-border)', display:'flex', alignItems:'center', gap:8, fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--ad-muted)' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--ad-purple-light)', boxShadow:'0 0 6px var(--ad-purple)' }} />
            Upload PDF Document
          </div>
          <div style={{ padding:20 }}>
            {!pendingFile ? (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{ border:`1px dashed ${dragging ? 'rgba(91,79,232,0.6)' : 'rgba(91,79,232,0.25)'}`, padding:'48px 24px', textAlign:'center', cursor:'pointer', position:'relative', overflow:'hidden', background: dragging ? 'rgba(91,79,232,0.05)' : 'rgba(91,79,232,0.02)', transition:'all 0.25s' }}>
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center,rgba(91,79,232,0.08) 0%,transparent 70%)', opacity: dragging ? 1 : 0, transition:'opacity 0.3s', pointerEvents:'none' }} />
                <div style={{ width:48, height:48, margin:'0 auto 16px', borderRadius:10, background:'rgba(91,79,232,0.1)', border:'1px solid rgba(91,79,232,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="var(--ad-purple-light)" strokeWidth="1.5">
                    <path d="M4 14v3a1 1 0 001 1h12a1 1 0 001-1v-3"/>
                    <polyline points="7,9 11,5 15,9"/><line x1="11" y1="5" x2="11" y2="15"/>
                  </svg>
                </div>
                <div style={{ fontSize:15, fontWeight:600, color:'var(--ad-off-white)', marginBottom:6 }}>Drop your PDF here</div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'var(--ad-muted)', textTransform:'uppercase', marginBottom:18 }}>or click to browse files</div>
                <button style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px', background:'rgba(91,79,232,0.12)', border:'1px solid rgba(91,79,232,0.4)', fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'var(--ad-purple-light)', textTransform:'uppercase', cursor:'pointer', transition:'all 0.2s', fontFamily:'var(--ad-sans)' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8v1.5a.5.5 0 00.5.5h7a.5.5 0 00.5-.5V8"/><polyline points="4,5 6,3 8,5"/><line x1="6" y1="3" x2="6" y2="8"/></svg>
                  Browse Files
                </button>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'var(--ad-muted)', textTransform:'uppercase', marginTop:10, opacity:0.5 }}>PDF only · Auto-embedded on upload</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ padding:'10px 14px', background:'var(--ad-purple-dim)', border:'1px solid var(--ad-purple-border)', fontSize:12, color:'var(--ad-purple-light)', display:'flex', alignItems:'center', gap:8 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1"/></svg>
                  <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pendingFile.name}</span>
                  <span style={{ color:'var(--ad-muted)', fontSize:10 }}>({(pendingFile.size/1024).toFixed(0)} KB)</span>
                </div>
                <div className="ad-field" style={{ marginBottom:0 }}>
                  <label className="ad-label">Document Name</label>
                  <input className="ad-input" placeholder="Enter a display name..." value={docName} onChange={e => setDocName(e.target.value)} onKeyDown={e => e.key==='Enter'&&confirmUpload()} autoFocus />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="ad-btn" onClick={() => { setPendingFile(null); setDocName('') }} style={{ flex:1 }}>Cancel</button>
                  <button className="ad-btn primary" onClick={confirmUpload} disabled={uploading} style={{ flex:2 }}>{uploading ? 'Uploading...' : 'Confirm Upload →'}</button>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf" className="ad-file-input" onChange={handleFileInput} />
          </div>
        </div>

        {/* Ingest URL */}
        <div style={{ background:'var(--ad-surface)', border:'1px solid var(--ad-border)', overflow:'hidden' }}>
          <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--ad-border)', display:'flex', alignItems:'center', gap:8, fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--ad-muted)' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#60a5fa', boxShadow:'0 0 6px rgba(96,165,250,0.5)' }} />
            Embed Remote URL
          </div>
          <div style={{ padding:20 }}>
            <div style={{ fontSize:11, color:'var(--ad-muted)', marginBottom:16, lineHeight:1.7 }}>
              Embed <span style={{ color:'var(--ad-purple-light)' }}>web pages</span>, <span style={{ color:'var(--ad-purple-light)' }}>arXiv papers</span>, or any publicly accessible URL into your knowledge base.
            </div>
            <div className="ad-field"><label className="ad-label">URL</label><input className="ad-input" placeholder="https://arxiv.org/abs/..." value={url} onChange={e => setUrl(e.target.value)} /></div>
            <div className="ad-field"><label className="ad-label">Document Name <span style={{ color:'var(--ad-muted)', fontWeight:400, textTransform:'none' }}>(optional)</span></label><input className="ad-input" placeholder="e.g. Python Tutorial Docs" value={urlName} onChange={e => setUrlName(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleIngestUrl()} /></div>
            <button
              onClick={handleIngestUrl}
              disabled={ingesting || !url.trim()}
              style={{ width:'100%', padding:'11px', background:'linear-gradient(135deg,rgba(91,79,232,0.15),rgba(123,114,240,0.08))', border:'1px solid rgba(91,79,232,0.4)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', color:'var(--ad-purple-light)', textTransform:'uppercase', cursor: ingesting || !url.trim() ? 'not-allowed' : 'pointer', opacity: ingesting || !url.trim() ? 0.5 : 1, transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'var(--ad-sans)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="5"/><path d="M4 6h4M6 4l2 2-2 2"/></svg>
              {ingesting ? 'Embedding...' : 'Embed URL'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Repository ── */}
      <div style={{ background:'var(--ad-surface)', border:'1px solid var(--ad-border)', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--ad-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--ad-muted)' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--ad-purple-light)', boxShadow:'0 0 6px var(--ad-purple)' }} />
            Repository
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Search */}
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--ad-surface2)', border:'1px solid var(--ad-border)', padding:'6px 12px' }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--ad-muted)" strokeWidth="1.5"><circle cx="5" cy="5" r="3.5"/><line x1="7.5" y1="7.5" x2="10" y2="10"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search documents…"
                style={{ background:'none', border:'none', outline:'none', fontSize:10, fontWeight:600, color:'var(--ad-off-white)', letterSpacing:'0.05em', width:160, fontFamily:'var(--ad-sans)' }}
              />
            </div>
            <button className="ad-btn" onClick={load}>Refresh</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding:32 }}><Spinner /></div>
        ) : !docs.length ? (
          <div style={{ padding:'72px 24px', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(91,79,232,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(91,79,232,0.025) 1px,transparent 1px)', backgroundSize:'28px 28px' }} />
            <div style={{ width:52, height:52, margin:'0 auto 18px', borderRadius:12, background:'var(--ad-surface2)', border:'1px solid var(--ad-border)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ad-muted)" strokeWidth="1.3"><path d="M5 3h9l5 5v13a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>
            </div>
            <div style={{ fontFamily:'var(--ad-serif)', fontSize:20, color:'var(--ad-muted)', marginBottom:8, fontStyle:'italic' }}>No documents yet.</div>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.08em', color:'var(--ad-muted)', lineHeight:1.8, maxWidth:340, margin:'0 auto' }}>
              Upload a PDF or embed a URL above to start building your knowledge base. Documents appear here once indexed — usually within <span style={{ color:'var(--ad-purple-light)' }}>a few seconds</span>.
            </div>
          </div>
        ) : !filtered.length ? (
          <div style={{ padding:32, textAlign:'center', fontSize:12, color:'var(--ad-muted)' }}>No documents match "{search}"</div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight:600 }}>{d.name || 'Untitled'}</td>
                  <td><span className={`ad-badge ${typeColor[d.type] || ''}`}>{(d.type || '—').toUpperCase()}</span></td>
                  <td><span className={`ad-badge ${statusColor[d.status] || ''}`}>{(d.status || '—').toUpperCase()}</span></td>
                  <td style={{ fontSize:11, color:'var(--ad-muted)' }}>{humanDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function ALabel({ children }) {
  return (
    <div style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--ad-muted)', display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
      <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--ad-purple)', flexShrink:0 }} />
      {children}
      <div style={{ flex:1, height:1, background:'var(--ad-border)' }} />
    </div>
  )
}

function AnalyticsPage() {
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [range, setRange]             = useState('7d')
  const [rangeData, setRangeData]     = useState([])
  const [rangeLoading, setRangeLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/analytics?range=7d')
      setData(res.data)
      setRangeData(res.data?.queries_over_time || [])
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const changeRange = async (r) => {
    if (r === range || rangeLoading) return
    setRange(r)
    setRangeLoading(true)
    try {
      const res = await api.get(`/admin/analytics?range=${r}`)
      setRangeData(res.data?.queries_over_time || [])
    } catch {}
    finally { setRangeLoading(false) }
  }

  if (loading) return <Spinner />

  const d               = data || {}
  const totalQueries    = safe(d.total_queries)
  const weekQueries     = safe(d.queries_last_7_days)
  const members         = safe(d.total_members)
  const chunks          = safe(d.total_chunks)
  const memberCounts    = d.member_query_counts || []
  const chunksByType    = d.chunks_by_type || { pdf:0, url:0, arxiv:0 }
  const chunkIndexing   = d.chunk_indexing_by_week || []
  const recentQueries   = d.recent_queries || []
  const avgConf         = d.avg_confidence
  const avgLatency      = d.avg_latency_ms
  const maxMemberCount  = Math.max(...memberCounts.map(m => m.count), 1)
  const maxChunkType    = Math.max(chunksByType.pdf||0, chunksByType.url||0, chunksByType.arxiv||0, 1)

  const tooltipStyle = { background:'var(--ad-surface)', border:'1px solid rgba(240,237,230,0.1)', borderRadius:0, fontFamily:'Syne', fontSize:10, color:'var(--ad-off-white)' }

  return (
    <div className="ad-stack">

      {/* ── Page Header ── */}
      <div>
        <div style={{ fontFamily:'var(--ad-serif)', fontSize:52, color:'var(--ad-off-white)', lineHeight:1, marginBottom:8 }}>Analytics</div>
        <div style={{ fontSize:11, color:'var(--ad-muted)', letterSpacing:'0.06em' }}>Query performance &amp; knowledge base metrics</div>
      </div>

      {/* ── Stats Grid ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'var(--ad-border)', border:'1px solid var(--ad-border)' }}>
        {[
          { label:'Total Queries',     value:totalQueries, color:'var(--ad-off-white)', bar:'var(--ad-purple)', pct:Math.min(totalQueries*5,100),   delta: totalQueries===0 ? '— No queries yet'       : `${totalQueries} total`,      dc:'var(--ad-muted)' },
          { label:'Queries This Week', value:weekQueries,  color:'var(--ad-off-white)', bar:'var(--ad-purple)', pct:Math.min(weekQueries*10,100),   delta: weekQueries===0   ? '— Awaiting activity'    : `↑ ${weekQueries} this week`, dc:'var(--ad-muted)' },
          { label:'Members',           value:members,      color:'var(--ad-green)',     bar:'var(--ad-green)',  pct:Math.min(members*20,100),        delta: members>0         ? '↑ Active workspace'      : '— No members',               dc:'var(--ad-green)' },
          { label:'Chunks Indexed',    value:chunks,       color:'var(--ad-purple-light)', bar:'var(--ad-purple)', pct:Math.min(chunks/10,100),     delta: chunks>0          ? '↑ Ready to query'        : '— No chunks indexed',         dc:'var(--ad-purple-light)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--ad-surface)', padding:'28px 28px 0', position:'relative', overflow:'hidden' }}>
            <div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--ad-muted)', marginBottom:14 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--ad-serif)', fontSize:52, color:s.color, lineHeight:1, marginBottom:8 }}>{s.value.toLocaleString()}</div>
            <div style={{ fontSize:9, letterSpacing:'0.08em', color:s.dc, marginBottom:22 }}>{s.delta}</div>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:'var(--ad-border)' }}>
              <div style={{ height:'100%', background:s.bar, width:`${s.pct}%`, transition:'width 1.2s ease' }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Queries Over Time ── */}
      <div style={{ background:'var(--ad-surface)', border:'1px solid var(--ad-border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid var(--ad-border)' }}>
          <div style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--ad-muted)', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--ad-purple)' }} />
            Queries Over Time
          </div>
          <div style={{ display:'flex' }}>
            {[['7d','Last 7 Days'],['30d','30 Days'],['90d','90 Days']].map(([r,label],i) => (
              <button key={r} onClick={() => changeRange(r)} style={{
                fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', padding:'5px 14px',
                border:'1px solid', background: range===r ? 'var(--ad-purple-dim)' : 'transparent',
                borderColor: range===r ? 'var(--ad-purple-border)' : 'var(--ad-border2)',
                color: range===r ? 'var(--ad-purple-light)' : 'var(--ad-muted)',
                cursor:'pointer', fontFamily:'var(--ad-sans)', marginLeft: i>0 ? -1 : 0,
                position:'relative', zIndex: range===r ? 1 : 0,
              }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ padding:24, height:264 }}>
          {rangeData.length === 0 ? (
            <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity:0.2 }}><polyline points="3,17 8,12 13,14 20,6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
              <span style={{ fontSize:10, color:'var(--ad-muted)', letterSpacing:'0.08em' }}>No queries yet.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rangeData} margin={{ top:4, right:8, bottom:0, left:-20 }}>
                <defs>
                  <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(91,79,232,0.3)" />
                    <stop offset="100%" stopColor="rgba(91,79,232,0)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(240,237,230,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(240,237,230,0.15)" tick={{ fontSize:9, fill:'rgba(240,237,230,0.3)', fontFamily:'Syne' }} />
                <YAxis stroke="rgba(240,237,230,0.15)" tick={{ fontSize:9, fill:'rgba(240,237,230,0.3)', fontFamily:'Syne' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="value" stroke="rgba(91,79,232,0.8)" fill="url(#qGrad)" strokeWidth={1.5} dot={{ r:3, fill:'rgba(91,79,232,1)', strokeWidth:0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Retrieval Quality ── */}
      <div>
        <ALabel>Retrieval Quality</ALabel>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'var(--ad-border)', border:'1px solid var(--ad-border)' }}>
          {[
            { label:'Avg. Chunks Retrieved', value:'5.0', color:'var(--ad-purple-light)', sub:'Per query · top-k setting' },
            { label:'Avg. Relevance Score',  value: avgConf != null ? avgConf.toFixed(2) : '—', color:'var(--ad-green)', sub:'Answer confidence · weighted avg' },
            { label:'Avg. Latency',          value: avgLatency != null ? `${avgLatency}ms` : '—', color:'var(--ad-off-white)', sub: avgLatency ? 'End-to-end response time' : 'No queries run yet' },
            { label:'Answer Confidence',     value: avgConf != null ? (avgConf>=0.7?'High':avgConf>=0.4?'Med':'Low') : '—', color: avgConf==null?'var(--ad-muted)':avgConf>=0.7?'var(--ad-green)':avgConf>=0.4?'#BA7517':'#e05c5c', sub:'Based on chunk density' },
          ].map(q => (
            <div key={q.label} style={{ background:'var(--ad-surface)', padding:'20px 20px 16px' }}>
              <div style={{ fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--ad-muted)', marginBottom:10 }}>{q.label}</div>
              <div style={{ fontFamily:'var(--ad-serif)', fontSize:32, color:q.color, lineHeight:1 }}>{q.value}</div>
              <div style={{ fontSize:9, color:'var(--ad-muted)', marginTop:6 }}>{q.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Grid ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>

        {/* KB Stats */}
        <div>
          <ALabel>Knowledge Base Stats</ALabel>
          <div style={{ background:'var(--ad-surface)', border:'1px solid var(--ad-border)' }}>
            {[
              { label:'Total documents in repository', value: safe(d.total_documents), valColor:'var(--ad-off-white)', valSize:24,
                icon:<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1" stroke="rgba(240,237,230,0.3)" strokeWidth="0.8"/><line x1="3" y1="4" x2="9" y2="4" stroke="rgba(240,237,230,0.3)" strokeWidth="0.6"/><line x1="3" y1="6" x2="9" y2="6" stroke="rgba(240,237,230,0.3)" strokeWidth="0.6"/><line x1="3" y1="8" x2="6" y2="8" stroke="rgba(240,237,230,0.3)" strokeWidth="0.6"/></svg> },
              { label:'Total semantic chunks indexed', value: chunks, valColor:'var(--ad-purple-light)', valSize:24,
                icon:<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polygon points="6,1 11,4 11,8 6,11 1,8 1,4" stroke="rgba(91,79,232,0.5)" strokeWidth="0.8"/><circle cx="6" cy="6" r="2" stroke="rgba(91,79,232,0.4)" strokeWidth="0.6"/></svg> },
              { label:'Active members', value: members, valColor:'var(--ad-green)', valSize:24,
                icon:<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="4" cy="3" r="2" stroke="rgba(240,237,230,0.3)" strokeWidth="0.7"/><circle cx="9" cy="4" r="1.5" stroke="rgba(240,237,230,0.3)" strokeWidth="0.7"/><path d="M1 10c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke="rgba(240,237,230,0.3)" strokeWidth="0.7" strokeLinecap="round"/></svg> },
              { label:'Avg. chunk size (tokens)', value:'~256', valColor:'var(--ad-off-white)', valSize:20,
                icon:<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="4" width="10" height="7" rx="1" stroke="rgba(240,237,230,0.3)" strokeWidth="0.8"/><path d="M4 4V3a2 2 0 014 0v1" stroke="rgba(240,237,230,0.3)" strokeWidth="0.7"/></svg> },
              { label:'Embedding model', value:'all-MiniLM-L6-v2', valColor:'var(--ad-purple-light)', isText:true,
                icon:<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="1,9 4,5 7,7 10,2 11,4" stroke="rgba(91,79,232,0.5)" strokeWidth="0.7" fill="none" strokeLinecap="round"/></svg> },
            ].map(row => (
              <div key={row.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', borderBottom:'1px solid var(--ad-border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:11, color:'var(--ad-muted)' }}>
                  <div style={{ width:24, height:24, border:'1px solid var(--ad-border2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{row.icon}</div>
                  {row.label}
                </div>
                {row.isText
                  ? <div style={{ fontSize:10, color:row.valColor, letterSpacing:'0.04em' }}>{row.value}</div>
                  : <div style={{ fontFamily:'var(--ad-serif)', fontSize:row.valSize||24, color:row.valColor }}>{typeof row.value==='number' ? row.value.toLocaleString() : row.value}</div>
                }
              </div>
            ))}
          </div>
        </div>

        {/* Query Distribution */}
        <div>
          <ALabel>Query Distribution — By Member</ALabel>
          <div style={{ background:'var(--ad-surface)', border:'1px solid var(--ad-border)' }}>
            <div style={{ padding:'18px 24px' }}>
              {memberCounts.length === 0
                ? <div style={{ fontSize:10, color:'var(--ad-muted)', padding:'8px 0' }}>No query data yet.</div>
                : memberCounts.map(m => (
                  <div key={m.name} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 0', borderBottom:'1px solid var(--ad-border)' }}>
                    <span style={{ fontSize:10, color:'var(--ad-muted)', width:80, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</span>
                    <div style={{ flex:1, height:4, background:'var(--ad-border)', position:'relative' }}>
                      <div style={{ position:'absolute', left:0, top:0, bottom:0, background:'var(--ad-purple)', width:`${(m.count/maxMemberCount)*100}%`, transition:'width 1s ease' }} />
                    </div>
                    <span style={{ fontSize:10, color:'var(--ad-off-white)', width:24, textAlign:'right', flexShrink:0 }}>{m.count}</span>
                  </div>
                ))
              }
            </div>
            <div style={{ borderTop:'1px solid var(--ad-border)', padding:'18px 24px 6px' }}>
              <div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--ad-muted)', marginBottom:16 }}>Chunks by Source Type</div>
              {[
                { label:'PDF',   count: chunksByType.pdf||0,   color:'var(--ad-purple)' },
                { label:'URL',   count: chunksByType.url||0,   color:'var(--ad-green)' },
                { label:'arXiv', count: chunksByType.arxiv||0, color:'var(--ad-purple-light)' },
              ].map(row => (
                <div key={row.label} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 0', borderBottom:'1px solid var(--ad-border)' }}>
                  <span style={{ fontSize:10, color:'var(--ad-muted)', width:80, flexShrink:0 }}>{row.label}</span>
                  <div style={{ flex:1, height:4, background:'var(--ad-border)', position:'relative' }}>
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, background:row.color, width:`${(row.count/maxChunkType)*100}%`, transition:'width 1s ease' }} />
                  </div>
                  <span style={{ fontSize:10, color:'var(--ad-off-white)', width:24, textAlign:'right', flexShrink:0 }}>{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chunk Indexing Activity ── */}
      <div style={{ background:'var(--ad-surface)', border:'1px solid var(--ad-border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid var(--ad-border)' }}>
          <div style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--ad-muted)', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--ad-green)' }} />
            Chunk Indexing Activity
          </div>
          <span style={{ fontSize:9, letterSpacing:'0.1em', color:'var(--ad-muted)' }}>{chunks.toLocaleString()} total · {safe(d.total_documents)} document{safe(d.total_documents)!==1?'s':''}</span>
        </div>
        <div style={{ padding:24, height:204 }}>
          {chunkIndexing.length === 0 ? (
            <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:10, color:'var(--ad-muted)' }}>No indexing activity yet.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chunkIndexing} margin={{ top:4, right:8, bottom:0, left:-20 }}>
                <CartesianGrid stroke="rgba(240,237,230,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(240,237,230,0.15)" tick={{ fontSize:9, fill:'rgba(240,237,230,0.3)', fontFamily:'Syne' }} />
                <YAxis stroke="rgba(240,237,230,0.15)" tick={{ fontSize:9, fill:'rgba(240,237,230,0.3)', fontFamily:'Syne' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="rgba(29,158,117,0.25)" stroke="rgba(29,158,117,0.7)" strokeWidth={1} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent Queries ── */}
      <div>
        <ALabel>Recent Queries</ALabel>
        <div style={{ background:'var(--ad-surface)', border:'1px solid var(--ad-border)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderBottom:'1px solid var(--ad-border)' }}>
            <span style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--ad-muted)' }}>Query Log</span>
            <span style={{ fontSize:9, color:'var(--ad-muted)', letterSpacing:'0.1em' }}>{totalQueries} total</span>
          </div>
          {recentQueries.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:120, gap:10 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity:0.2 }}><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1"/><line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
              <span style={{ fontSize:10, color:'var(--ad-muted)', letterSpacing:'0.08em' }}>No queries yet. Ask something to populate this log.</span>
            </div>
          ) : recentQueries.map((q, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 24px', borderBottom: i<recentQueries.length-1?'1px solid var(--ad-border)':'none' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--ad-green)', flexShrink:0 }} />
              <div style={{ flex:1, fontSize:11, color:'var(--ad-off-white)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{q.query}</div>
              <div style={{ display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
                <span style={{ fontSize:9, color:'var(--ad-muted)', letterSpacing:'0.06em' }}>{humanDate(q.created_at)}</span>
                {q.total_time_ms != null && <span style={{ fontSize:9, color:'rgba(240,237,230,0.2)', letterSpacing:'0.06em' }}>{q.total_time_ms}ms</span>}
                {q.confidence != null && <span style={{ fontSize:9, color:'var(--ad-purple-light)', letterSpacing:'0.06em' }}>{Math.round(q.confidence*100)}% conf</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
