import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeBatch, analyzeImage } from '../services/api'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  const onSubmit = async () => {
    if (!file) return
    setError('')
    setLoading(true)
    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        const data = await analyzeBatch(file)
        navigate('/batch', { state: { preloadResults: data.results || [], preloadCsvBase64: data.csv_base64 || '' } })
      } else {
        const result = await analyzeImage(file)
        navigate('/results', { state: { result, preview } })
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  const onFileChange = (nextFile) => {
    if (!nextFile) return
    const lower = nextFile.name.toLowerCase()
    const valid = lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.zip')
    if (!valid) {
      setError('Please upload JPG/PNG for single analysis or ZIP for batch analysis.')
      return
    }
    setError('')
    setFile(nextFile)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Analyze IHC Slides</h1>
        <p className="mt-2 text-sm text-slate-200">Upload a single slide or a ZIP batch for AI-assisted scoring.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section className="rounded-none border border-white/60 bg-white/80 p-6 shadow-soft backdrop-blur">
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              onFileChange(e.dataTransfer.files?.[0] || null)
            }}
            className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-none border-2 border-dashed px-6 py-8 text-center transition ${
              isDragging ? 'border-brand bg-brand/5' : 'border-slate-300 hover:border-brand'
            }`}
          >
            <input type="file" accept=".jpg,.jpeg,.png,.zip" className="hidden" onChange={(e) => onFileChange(e.target.files?.[0] || null)} />
            <p className="text-base font-semibold text-navy">Drag and drop image or ZIP</p>
            <p className="mt-2 text-sm text-slate-500">JPG, PNG, ZIP supported</p>
            {file && <p className="mt-5 rounded-none bg-slate-100 px-3 py-1 text-sm text-slate-700">{file.name}</p>}
          </label>

          <button
            onClick={onSubmit}
            disabled={!file || loading}
            className="mt-5 rounded-none bg-gradient-to-r from-brand to-violet px-6 py-2.5 text-sm font-semibold text-slate-100 shadow-glow disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Analyzing...' : file?.name?.toLowerCase().endsWith('.zip') ? 'Analyze Batch' : 'Analyze Slide'}
          </button>

          {error && <p className="mt-4 rounded-none border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </section>

        <section className="rounded-none border border-white/60 bg-white/80 p-4 shadow-soft backdrop-blur">
          {preview && !file?.name?.toLowerCase().endsWith('.zip') ? (
            <img src={preview} alt="preview" className="h-[380px] w-full rounded-none object-contain" />
          ) : (
            <div className="flex h-[380px] items-center justify-center rounded-none border border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
              {file?.name?.toLowerCase().endsWith('.zip')
                ? 'ZIP selected. Results will open in Batch.'
                : 'Preview appears here before analysis.'}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
