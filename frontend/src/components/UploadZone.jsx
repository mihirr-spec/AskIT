import { useRef, useState } from 'react'

export default function UploadZone({ onFilesSelected }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])

  const handleFiles = (files) => {
    const pdfs = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (pdfs.length === 0) return
    setSelectedFiles(pdfs)
    onFilesSelected(pdfs)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <div
        className={`upload-zone ${dragging ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf" multiple onChange={e => handleFiles(e.target.files)} />
        <div className="upload-icon">📄</div>
        <div className="upload-text">Drop PDFs here or click to browse</div>
        <div className="upload-subtext">Supports multiple PDF files</div>
      </div>
      {selectedFiles.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {selectedFiles.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--success-dim)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
              <span>✅</span>
              <span style={{ fontWeight: 600 }}>{f.name}</span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }}>{(f.size / 1024).toFixed(1)} KB</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
