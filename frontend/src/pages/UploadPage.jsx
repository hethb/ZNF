import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MetricsGlossary from '../components/MetricsGlossary'
import { analyzeBatch, analyzeImage } from '../services/api'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  const isZip = file?.name?.toLowerCase().endsWith('.zip')

  const onSubmit = async () => {
    if (!file) return
    setError('')
    setLoading(true)
    try {
      if (isZip) {
        const data = await analyzeBatch(file)
        navigate('/batch', {
          state: { preloadResults: data.results || [], preloadCsvBase64: data.csv_base64 || '' }
        })
      } else {
        const result = await analyzeImage(file)
        navigate('/results', { state: { result, preview } })
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onFileChange = (nextFile) => {
    if (!nextFile) return
    const lower = nextFile.name.toLowerCase()
    const valid =
      lower.endsWith('.jpg') || lower.endsWith('.jpeg') ||
      lower.endsWith('.png') || lower.endsWith('.zip')
    if (!valid) {
      setError('Please upload JPG/PNG for single analysis or ZIP for batch analysis.')
      return
    }
    setError('')
    setFile(nextFile)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-28">
      <div className="mb-8">
        <p className="section-label mb-2 block">Analysis</p>
        <h1 className="display-heading text-4xl">Analyze IHC Slides</h1>
        <p className="mt-2 text-sm" style={{ color: '#a08060' }}>
          Upload a single slide image or a ZIP batch for AI-assisted scoring.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        {/* Upload panel */}
        <section className="glass-card p-6">
          <label
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              onFileChange(e.dataTransfer.files?.[0] || null)
            }}
            className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200"
            style={{
              borderColor: isDragging ? 'rgba(194,98,26,0.65)' : 'rgba(212,178,140,0.14)',
              background: isDragging ? 'rgba(194,98,26,0.07)' : 'rgba(212,178,140,0.02)'
            }}
          >
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.zip"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />
            {/* Upload icon */}
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                background: 'rgba(194,98,26,0.12)',
                border: '1px solid rgba(194,98,26,0.28)'
              }}
            >
              <svg
                className="h-6 w-6"
                style={{ color: '#d9834a' }}
                fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-base font-semibold" style={{ color: '#f4ece0' }}>Drag and drop image or ZIP</p>
            <p className="mt-1.5 text-sm" style={{ color: '#7a6b59' }}>JPG, PNG, ZIP supported</p>
            {file && (
              <span
                className="mt-4 inline-block rounded-lg px-3 py-1 text-xs font-medium"
                style={{
                  background: 'rgba(194,98,26,0.12)',
                  border: '1px solid rgba(194,98,26,0.26)',
                  color: '#d9834a'
                }}
              >
                {file.name}
              </span>
            )}
          </label>

          <button onClick={onSubmit} disabled={!file || loading} className="btn-primary mt-5 w-full py-3">
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing…
              </>
            ) : isZip ? 'Analyze Batch' : 'Analyze Slide'}
          </button>

          {error && (
            <div
              className="mt-4 rounded-lg px-4 py-3 text-sm"
              style={{
                background: 'rgba(194,60,40,0.1)',
                border: '1px solid rgba(194,60,40,0.25)',
                color: '#f0a090'
              }}
            >
              {error}
            </div>
          )}
        </section>

        {/* Preview panel */}
        <section className="glass-card flex items-center justify-center p-4">
          {preview && !isZip ? (
            <img
              src={preview}
              alt="Slide preview"
              className="max-h-80 w-full rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: 'rgba(212,178,140,0.04)', border: '1px solid rgba(212,178,140,0.09)' }}
              >
                <svg
                  className="h-6 w-6"
                  style={{ color: '#7a6b59' }}
                  fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18M21 15.75V5.625A2.625 2.625 0 0018.375 3H5.625A2.625 2.625 0 003 5.625v10.125" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: '#7a6b59' }}>
                {isZip
                  ? 'ZIP selected — results will open in Batch view.'
                  : 'Preview appears here after upload.'}
              </p>
            </div>
          )}
        </section>
      </div>

      <MetricsGlossary
        className="mt-8"
        eyebrow="After you analyze"
        headingId="analyze-metrics-heading"
        lead="Results open on the next screen. Here is how to read each part—everything is decision-support for the pathologist, not a standalone diagnosis."
      />
    </div>
  )
}
