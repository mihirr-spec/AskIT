import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ReasoningTrace from './ReasoningTrace'

export default function ChatMessage({ query, response, pending, timestamp }) {
  return (
    <div className="message-row">
      {/* User bubble */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div className="message-bubble message-user">{query}</div>
      </div>

      {/* AI bubble */}
      {pending ? (
        <div className="message-bubble message-ai" style={{ width: 'fit-content' }}>
          <div className="typing-indicator">
            <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
          </div>
        </div>
      ) : response ? (
        <div>
          <div className="message-bubble message-ai">
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{response.answer || 'No answer generated.'}</ReactMarkdown>
            </div>

            {/* Confidence bar */}
            {typeof response.confidence === 'number' && (
              <ConfidenceBar value={response.confidence} />
            )}

            {/* Citations */}
            {response.citations?.length > 0 && (
              <div className="citations-section" style={{ marginTop: 16 }}>
                <div className="citations-header">📚 Sources</div>
                {response.citations.map((cit, i) => (
                  <div key={i} className="citation-card">
                    <span className="citation-icon">{cit.doc_type === 'pdf' ? '📄' : '🔗'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="citation-name">{cit.source_name}</div>
                      {cit.source_url && (
                        <a className="citation-link" href={cit.source_url} target="_blank" rel="noreferrer">
                          ↗ View source
                        </a>
                      )}
                      {cit.relevant_excerpt && (
                        <div className="citation-excerpt">"{cit.relevant_excerpt}"</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reasoning trace (outside bubble) */}
          {response.reasoning_trace && (
            <ReasoningTrace trace={response.reasoning_trace} totalMs={response.total_time_ms} />
          )}

          {/* Timestamp */}
          {timestamp && (
            <div className="message-meta">
              <span>🤖 Knowledge Assistant</span>
              <span>·</span>
              <span>{new Date(timestamp).toLocaleTimeString()}</span>
              {response.total_time_ms && <><span>·</span><span>{response.total_time_ms}ms</span></>}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div className="confidence-bar" style={{ marginTop: 14 }}>
      <span className="confidence-label">Confidence</span>
      <div className="confidence-track">
        <div className="confidence-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="confidence-pct" style={{ color }}>{pct}%</span>
    </div>
  )
}
