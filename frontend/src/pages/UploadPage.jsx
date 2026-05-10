import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCases } from '../context/CaseContext'
import { REVIEWERS, STAIN_OPTIONS, TISSUE_OPTIONS } from '../types/case'

const defaultForm = {
  caseId: '',
  sampleId: '',
  tissueType: TISSUE_OPTIONS[0],
  stainType: STAIN_OPTIONS[0],
  scannerType: 'Aperio',
  magnification: '20x',
  assignedReviewer: REVIEWERS[0],
  priority: 'Normal',
  notes: ''
}

export default function UploadPage() {
  const navigate = useNavigate()
  const { createCase, isSyncing } = useCases()
  const [files, setFiles] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState('')

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const firstPreview = previews[0]?.url || '/demo/slide1.png'
      const payload = {
        ...form,
        caseId: form.caseId || `CASE-${Math.floor(1000 + Math.random() * 9000)}`,
        sampleId: form.sampleId || `SMP-${Math.floor(1000 + Math.random() * 9000)}`,
        imageUrl: firstPreview
      }

      const newCase = await createCase({ payload, files })
      navigate(`/cases/${newCase.id}`)
    } catch {
      setError('Failed to create case. Please try again.')
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1.15rem' }}>
      <header>
        <div className="micro-label">Intake</div>
        <h1 className="page-title">Slide upload & case intake</h1>
        <p className="page-subtitle">Register specimens with structured metadata, then route slides into AI-assisted pre-scoring.</p>
      </header>

      <form onSubmit={onSubmit} className="grid-2">
        <section className="card card-glow" style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <div className="micro-label">Specimens</div>
            <h2 style={{ fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cream)' }}>Whole slide upload</h2>
          </div>
          <p className="page-subtitle" style={{ margin: 0, fontSize: '0.86rem' }}>
            Drag files into the zone or tap to browse. PNG/JPEG supported for pilot; production connects to your scanner pipeline.
          </p>

          <div className="drag-zone">
            <input type="file" accept=".png,.jpg,.jpeg" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            <div style={{ fontWeight: 700, color: 'var(--cream)', marginBottom: 6 }}>Drop slides here</div>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>or click to select from disk</div>
          </div>

          <div style={{ display: 'grid', gap: '0.45rem' }}>
            {previews.length ? (
              previews.map((p, index) => (
                <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <img src={p.url} alt={p.file.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border-subtle)' }} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{p.file.name}</div>
                </div>
              ))
            ) : (
              <p className="page-subtitle" style={{ margin: 0, fontSize: '0.86rem' }}>
                No files selected — a demo fallback image will be used if you continue empty.
              </p>
            )}
          </div>
          {isSyncing ? <p className="page-subtitle" style={{ margin: 0 }}>Running backend analysis and syncing case…</p> : null}
        </section>

        <section className="card" style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <div className="micro-label">LIS context</div>
            <h2 style={{ fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cream)' }}>Case metadata</h2>
          </div>
          <div className="grid-2">
            <div>
              <label className="label">Case ID</label>
              <input className="input" value={form.caseId} onChange={(e) => setForm({ ...form, caseId: e.target.value })} />
            </div>
            <div>
              <label className="label">Sample ID</label>
              <input className="input" value={form.sampleId} onChange={(e) => setForm({ ...form, sampleId: e.target.value })} />
            </div>
            <div>
              <label className="label">Tissue type</label>
              <select className="select" value={form.tissueType} onChange={(e) => setForm({ ...form, tissueType: e.target.value })}>
                {TISSUE_OPTIONS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Stain / biomarker</label>
              <select className="select" value={form.stainType} onChange={(e) => setForm({ ...form, stainType: e.target.value })}>
                {STAIN_OPTIONS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Scanner type</label>
              <input className="input" value={form.scannerType} onChange={(e) => setForm({ ...form, scannerType: e.target.value })} />
            </div>
            <div>
              <label className="label">Magnification</label>
              <input className="input" value={form.magnification} onChange={(e) => setForm({ ...form, magnification: e.target.value })} />
            </div>
            <div>
              <label className="label">Assigned reviewer</label>
              <select className="select" value={form.assignedReviewer} onChange={(e) => setForm({ ...form, assignedReviewer: e.target.value })}>
                {REVIEWERS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option>Low</option>
                <option>Normal</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {error ? <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0 }}>{error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={isSyncing}>
            {isSyncing ? 'Analyzing…' : 'Create case & run analysis'}
          </button>
        </section>
      </form>
    </div>
  )
}
