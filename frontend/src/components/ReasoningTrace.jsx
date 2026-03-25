import { useState } from 'react'

const STEP_CONFIG = {
  planning: { color: '#6366f1', bg: 'var(--accent-dim)', icon: '🧠', label: 'Planning Agent' },
  retrieval: { color: '#3b82f6', bg: 'var(--info-dim)', icon: '🔍', label: 'Retrieval Agent' },
  synthesis: { color: '#10b981', bg: 'var(--success-dim)', icon: '✍️', label: 'Synthesis Agent' },
}

export default function ReasoningTrace({ trace, totalMs }) {
  const [open, setOpen] = useState(false)

  if (!trace) return null

  const steps = Object.entries(trace)

  return (
    <div>
      <button className="trace-toggle" onClick={() => setOpen(o => !o)}>
        <span>🔬 Reasoning Trace</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>{steps.length} agents</span>
        {totalMs && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>· {totalMs}ms</span>}
        <span className={`trace-toggle-icon ${open ? 'open' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="trace-panel">
          {steps.map(([key, step]) => {
            const config = STEP_CONFIG[key] || { color: 'var(--text-secondary)', bg: 'var(--bg-hover)', icon: '⚙️', label: key }
            return (
              <div key={key} className="trace-step">
                <div className="trace-step-icon" style={{ background: config.bg, color: config.color }}>
                  {config.icon}
                </div>
                <div className="trace-step-content">
                  <div className="trace-agent" style={{ color: config.color }}>{step.agent || config.label}</div>
                  <div className="trace-action">{step.action}</div>

                  {/* Planning details */}
                  {key === 'planning' && step.sub_queries?.length > 0 && (
                    <div className="trace-detail">
                      Sub-queries: {step.sub_queries.map((q, i) => `[${i + 1}] ${q}`).join(' | ')}
                    </div>
                  )}

                  {/* Retrieval details */}
                  {key === 'retrieval' && (
                    <div className="trace-detail">
                      Sources: {step.sources_used?.join(', ') || 'None'} | Top scores: {step.top_scores?.join(', ') || '—'}
                    </div>
                  )}

                  {/* Synthesis details */}
                  {key === 'synthesis' && typeof step.confidence !== 'undefined' && (
                    <div className="trace-detail">
                      Confidence: {Math.round(step.confidence * 100)}% | Citations: {step.citations_count || 0}
                    </div>
                  )}

                  <div className="trace-duration">⏱ {step.duration_ms}ms</div>
                </div>
              </div>
            )
          })}

          {/* Total time footer */}
          {totalMs && (
            <div style={{ padding: '10px 16px', background: 'var(--bg-card)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>🤖 3 agents · Planning → Retrieval → Synthesis</span>
              <span>Total: {totalMs}ms</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
