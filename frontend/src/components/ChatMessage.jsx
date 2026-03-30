import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '../lib/supabase'

const STEP_CONFIG = {
  planning:  { color: '#f97316', label: 'Planning Agent' },
  retrieval: { color: '#3b82f6', label: 'Retrieval Agent' },
  synthesis: { color: '#eab308', label: 'Synthesis Agent' },
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ConfidenceBar({ value }) {
  const color = value >= 80 ? '#10b981' : value >= 60 ? '#eab308' : '#ef4444'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 0 4px' }}>
      <span style={{ fontSize:11, fontWeight:600, letterSpacing:1.5, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', fontFamily:"'JetBrains Mono',monospace" }}>Confidence</span>
      <div style={{ flex:1, height:4, borderRadius:2, background:'rgba(255,255,255,0.06)' }}>
        <div style={{ width:`${value}%`, height:'100%', borderRadius:2, background:`linear-gradient(90deg,${color}88,${color})`, transition:'width 1s ease' }} />
      </div>
      <span style={{ fontSize:13, fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace" }}>{value}%</span>
    </div>
  )
}

function SourcesPanel({ citations }) {
  const [expanded, setExpanded] = useState(false)
  if (!citations?.length) return null
  const shown = expanded ? citations : citations.slice(0, 2)

  return (
    <div style={{ marginTop:8 }}>
      <div
        onClick={() => citations.length > 2 && setExpanded(!expanded)}
        style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 0', cursor: citations.length > 2 ? 'pointer' : 'default', userSelect:'none' }}
      >
        <span style={{ fontSize:11, fontWeight:600, letterSpacing:1.5, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', fontFamily:"'JetBrains Mono',monospace" }}>
          Sources · {citations.length}
        </span>
        {citations.length > 2 && <ChevronDown />}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {shown.map((c, i) => (
          <div
            key={i}
            style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 14px', transition:'border-color 0.2s', cursor: c.source_url ? 'pointer' : 'default' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
            onClick={() => c.source_url && window.open(c.source_url, '_blank')}
          >
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom: c.relevant_excerpt ? 4 : 0 }}>
              <span style={{ opacity:0.5, fontSize:12, flexShrink:0 }}>{c.doc_type === 'pdf' ? '📄' : '🔗'}</span>
              <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.7)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.source_name}</span>
              {c.source_url && <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', flexShrink:0 }}>↗</span>}
            </div>
            {c.relevant_excerpt && (
              <p style={{ fontSize:12, lineHeight:1.5, color:'rgba(255,255,255,0.45)', margin:0, fontStyle:'italic' }}>"{c.relevant_excerpt}"</p>
            )}
          </div>
        ))}
      </div>
      {!expanded && citations.length > 2 && (
        <button onClick={() => setExpanded(true)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:11, padding:'6px 0', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>
          + {citations.length - 2} more source{citations.length - 2 > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}

function InlineReasoningTrace({ trace, totalMs }) {
  const [open, setOpen] = useState(false)
  if (!trace) return null

  const steps = Object.entries(trace).map(([key, step]) => {
    const cfg = STEP_CONFIG[key] || { color: '#94a3b8', label: key }
    const details = []
    if (key === 'planning' && step.sub_queries?.length)
      step.sub_queries.forEach((q, i) => details.push(`[${i + 1}] ${q}`))
    if (key === 'retrieval') {
      if (step.sources_used?.length) details.push(`Sources: ${step.sources_used.join(', ')}`)
      if (step.top_scores?.length)   details.push(`Top scores: ${step.top_scores.join(', ')}`)
    }
    if (key === 'synthesis') {
      if (typeof step.confidence !== 'undefined') details.push(`Confidence: ${Math.round(step.confidence * 100)}%`)
      if (step.citations_count != null) details.push(`Citations: ${step.citations_count}`)
    }
    return { agent: step.agent || cfg.label, color: cfg.color, summary: step.action || '', details, time: step.duration_ms }
  })

  return (
    <div style={{ marginTop:10, borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:8 }}>
      <button onClick={() => setOpen(!open)} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', padding:'4px 0', width:'100%' }}>
        <span style={{ fontSize:13 }}>⚙</span>
        <span style={{ fontSize:11, fontWeight:600, letterSpacing:1.2, textTransform:'uppercase', fontFamily:"'JetBrains Mono',monospace" }}>Reasoning Trace</span>
        <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)', fontFamily:"'JetBrains Mono',monospace" }}>
          {steps.length} agents{totalMs ? ` · ${totalMs}ms` : ''}
        </span>
        <span style={{ marginLeft:'auto', transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', display:'flex' }}>
          <ChevronDown />
        </span>
      </button>

      {open && (
        <div style={{ marginTop:8, position:'relative', paddingLeft:20 }}>
          <div style={{ position:'absolute', left:7, top:6, bottom:6, width:2, background:'linear-gradient(to bottom,rgba(249,115,22,0.4),rgba(59,130,246,0.4),rgba(234,179,8,0.4))', borderRadius:1 }} />
          {steps.map((step, i) => (
            <div key={i} style={{ marginBottom: i < steps.length - 1 ? 16 : 0, position:'relative' }}>
              <div style={{ position:'absolute', left:-16, top:4, width:10, height:10, borderRadius:'50%', background:step.color, boxShadow:`0 0 8px ${step.color}44` }} />
              <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:700, color:step.color }}>{step.agent}</span>
                {step.time && <span style={{ fontSize:10, color:'rgba(255,255,255,0.2)', fontFamily:"'JetBrains Mono',monospace" }}>{step.time}ms</span>}
              </div>
              {step.summary && <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:'0 0 4px' }}>{step.summary}</p>}
              {step.details.length > 0 && (
                <div style={{ background:'rgba(255,255,255,0.02)', borderRadius:6, padding:'6px 10px', border:'1px solid rgba(255,255,255,0.04)' }}>
                  {step.details.map((d, j) => (
                    <div key={j} style={{ fontSize:11, color:'rgba(255,255,255,0.3)', fontFamily:"'JetBrains Mono',monospace", lineHeight:1.7 }}>{d}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {totalMs && (
            <div style={{ marginTop:12, padding:'8px 12px', background:'rgba(255,255,255,0.02)', borderRadius:8, border:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'rgba(255,255,255,0.3)', fontFamily:"'JetBrains Mono',monospace" }}>
                <span>🔗</span>
                {steps.map((s, i) => (
                  <span key={i}>
                    <span style={{ color:s.color }}>{s.agent.split(' ')[0]}</span>
                    {i < steps.length - 1 && <span style={{ margin:'0 4px', opacity:0.4 }}>→</span>}
                  </span>
                ))}
              </div>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontFamily:"'JetBrains Mono',monospace" }}>Total: {totalMs}ms</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ChatMessage({ query, response, pending, timestamp, userId, orgId }) {
  const [saved, setSaved]   = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (saved || saving || !userId || !orgId) return
    setSaving(true)
    try {
      await supabase.from('saved_insights').insert({
        user_id:    userId,
        org_id:     orgId,
        query,
        answer:     response.answer || '',
        citations:  response.citations || [],
        confidence: response.confidence ?? null,
      })
      setSaved(true)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const confidencePct  = typeof response?.confidence === 'number' ? Math.round(response.confidence * 100) : null
  const hasCitations   = response?.citations?.length > 0
  const hasTrace       = !!response?.reasoning_trace
  const hasMetadata    = response && (hasCitations || hasTrace || confidencePct != null)

  return (
    <div style={{ marginBottom:20 }}>
      {/* ── User bubble ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
        <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:'18px 18px 4px 18px', padding:'12px 18px', maxWidth:'65%', fontSize:14, lineHeight:1.6, color:'#fff', fontWeight:500 }}>
          {query}
        </div>
      </div>

      {/* ── AI response ── */}
      {pending ? (
        <div style={{ display:'flex', justifyContent:'flex-start' }}>
          <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:'16px 20px' }}>
            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'rgba(139,92,246,0.7)', animation:`cmTyping 1.2s ease-in-out ${i*0.2}s infinite` }} />
              ))}
            </div>
          </div>
        </div>
      ) : response ? (
        <div style={{ display:'flex', justifyContent:'flex-start' }}>
          <div style={{ maxWidth: hasMetadata ? '78%' : '70%', width: hasMetadata ? '78%' : undefined }}>

            {/* Answer bubble */}
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius: hasMetadata ? '18px 18px 0 0' : 18, padding:'16px 20px' }}>
              <div style={{ fontSize:14, lineHeight:1.7, color:'rgba(255,255,255,0.85)' }} className="ud-md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{response.answer || 'No answer generated.'}</ReactMarkdown>
              </div>
            </div>

            {/* Metadata panel */}
            {hasMetadata && (
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderTop:'none', borderRadius:'0 0 18px 18px', padding:'8px 20px 16px' }}>
                {confidencePct != null && <ConfidenceBar value={confidencePct} />}
                {hasCitations  && <SourcesPanel citations={response.citations} />}
                {hasTrace      && <InlineReasoningTrace trace={response.reasoning_trace} totalMs={response.total_time_ms} />}

                {/* Footer */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, paddingTop:8, borderTop:'1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.2)', fontFamily:"'JetBrains Mono',monospace" }}>
                    Knowledge Assistant
                    {timestamp && ` · ${new Date(timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`}
                    {response.total_time_ms && ` · ${response.total_time_ms}ms`}
                  </span>
                  <button
                    onClick={handleSave}
                    disabled={saved || saving}
                    style={{
                      display:'flex', alignItems:'center', gap:5,
                      background: saved ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${saved ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius:6, padding:'4px 12px',
                      color: saved ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                      fontSize:11, cursor: saved ? 'default' : 'pointer', fontWeight:600,
                      fontFamily:"'JetBrains Mono',monospace", letterSpacing:0.5,
                      transition:'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!saved) { e.currentTarget.style.background='rgba(139,92,246,0.12)'; e.currentTarget.style.borderColor='rgba(139,92,246,0.3)'; e.currentTarget.style.color='#a78bfa' }}}
                    onMouseLeave={e => { if (!saved) { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; e.currentTarget.style.color='rgba(255,255,255,0.4)' }}}
                  >
                    🔖 {saved ? 'SAVED' : saving ? '...' : 'SAVE INSIGHT'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
