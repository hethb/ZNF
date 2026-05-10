import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCases } from '../context/CaseContext'
import { useAppState } from '../context/AppStateContext'
import ReportPreview from '../components/ReportPreview'
import FullWrittenReportFrame from '../components/FullWrittenReportFrame'
import { formatCaseSummary } from '../utils/reportUtils'
import { buildFullLaboratoryReportHtml, downloadHtmlFile } from '../utils/fullLaboratoryReport'
import { confusionMatrix, validationCases } from '../data/mockValidation'
import { downloadWorkflowPdf } from '../services/api'

export const REPORTS_FULL_LAB_QUERY = 'view'
export const REPORTS_FULL_LAB_VALUE = 'full'

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const fullLabView = searchParams.get(REPORTS_FULL_LAB_QUERY) === REPORTS_FULL_LAB_VALUE

  const setTabExports = () => setSearchParams({}, { replace: true })
  const setTabFullLab = () => setSearchParams({ [REPORTS_FULL_LAB_QUERY]: REPORTS_FULL_LAB_VALUE }, { replace: true })

  const { cases, exportCaseReport } = useCases()
  const { settings, accessToken, authMode } = useAppState()

  const reportCases = useMemo(() => cases.filter((item) => item.finalReview || item.status === 'Exported'), [cases])
  const [selectedId, setSelectedId] = useState(reportCases[0]?.id || cases[0]?.id)

  const selectedCase = useMemo(() => cases.find((item) => item.id === selectedId) || cases[0], [cases, selectedId])

  const printableSummary = useMemo(() => (selectedCase ? formatCaseSummary(selectedCase, settings) : ''), [selectedCase, settings])

  const fullReportHtml = useMemo(
    () =>
      buildFullLaboratoryReportHtml({
        cases,
        settings,
        focusCase: selectedCase,
        validationCases,
        confusionMatrix
      }),
    [cases, settings, selectedCase]
  )

  const onExportCsv = () => {
    if (!selectedCase) return
    const line = [
      settings.anonymizeCaseIds ? `ANON-${selectedCase.id.slice(0, 8)}` : selectedCase.caseId,
      selectedCase.sampleId,
      selectedCase.tissueType,
      selectedCase.stainType,
      selectedCase.aiAnalysis?.suggestedScore || '',
      selectedCase.finalReview?.finalScore || '',
      selectedCase.aiAnalysis?.confidence || '',
      selectedCase.finalReview?.reviewer || selectedCase.assignedReviewer || ''
    ]

    const header = ['Case ID', 'Sample ID', 'Tissue Type', 'Stain', 'AI Suggested Score', 'Final Score', 'Confidence', 'Reviewer']
    const csv = `${header.join(',')}\n${line.join(',')}`
    downloadFile(`${selectedCase.caseId || 'pathiq-report'}.csv`, csv, 'text/csv;charset=utf-8')
  }

  const onExportPdf = async () => {
    if (!selectedCase) return
    if (authMode === 'server' && accessToken) {
      try {
        const blob = await downloadWorkflowPdf({
          case: selectedCase,
          labName: settings.labName,
          template: settings.reportTemplate
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pathiq_report_${selectedCase.caseId || 'export'}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        return
      } catch {
        /* fall through to client print */
      }
    }
    const win = window.open('', '_blank', 'width=900,height=800')
    if (!win) return
    const escaped = printableSummary.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    win.document.write(
      `<!doctype html><html><head><title>PathIQ Report</title><style>body{font-family:Plus Jakarta Sans,system-ui;padding:28px;background:#121110;color:#f3ebe3}pre{white-space:pre-wrap;font-size:14px;line-height:1.45;color:#a89f94}</style></head><body><h1 style="color:#e8dcc8">PathIQ Report</h1><pre>${escaped}</pre></body></html>`
    )
    win.document.close()
    win.focus()
    win.print()
  }

  const onCopySummary = async () => {
    if (!selectedCase) return
    await navigator.clipboard.writeText(printableSummary)
  }

  const onDownloadFullHtml = () => {
    const name = `pathiq_mla_integrated_report_${selectedCase?.caseId || 'export'}.html`.replace(/\s+/g, '_')
    downloadHtmlFile(name, fullReportHtml)
  }

  const onPrintFullReport = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(fullReportHtml)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 350)
  }

  const tabBtnStyle = (active) => ({
    flex: 1,
    padding: '0.65rem 1rem',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
    background: active ? 'linear-gradient(180deg, rgba(194,98,26,0.25), rgba(20,16,12,0.95))' : 'rgba(255,255,255,0.03)',
    color: active ? 'var(--cream)' : 'var(--text-muted)',
    fontWeight: 700,
    fontSize: '0.82rem',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s'
  })

  return (
    <div style={{ display: 'grid', gap: '1.15rem' }}>
      <header>
        <div className="micro-label">Exports</div>
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">
          Case-level exports and the integrated <strong>full laboratory report</strong> (MLA-style document with figures, tables, and Works Cited) are always available from the tabs below or from the sidebar.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Report views"
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          padding: '0.35rem',
          borderRadius: '14px',
          border: '1px solid var(--border-subtle)',
          background: 'rgba(0,0,0,0.2)'
        }}
      >
        <button type="button" role="tab" aria-selected={!fullLabView} style={tabBtnStyle(!fullLabView)} onClick={setTabExports}>
          Case exports
        </button>
        <button type="button" role="tab" aria-selected={fullLabView} style={tabBtnStyle(fullLabView)} onClick={setTabFullLab}>
          Full laboratory report (MLA)
        </button>
      </div>

      {!fullLabView ? (
        <>
          <section className="grid-2">
            <div className="card" style={{ display: 'grid', gap: '0.65rem', alignContent: 'start' }}>
              <div>
                <div className="micro-label">Selection</div>
                <h3 style={{ fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cream)' }}>Primary case</h3>
              </div>
              <label className="label">Case (also drives the MLA report’s detailed sections)</label>
              <select className="select" value={selectedCase?.id || ''} onChange={(e) => setSelectedId(e.target.value)}>
                {cases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.caseId} — {item.stainType}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                <button className="btn btn-primary" type="button" onClick={onExportPdf}>
                  Export case PDF
                </button>
                <button className="btn btn-outline" type="button" onClick={onExportCsv}>
                  Export case CSV
                </button>
                <button className="btn btn-secondary" type="button" onClick={onCopySummary}>
                  Copy short summary
                </button>
                <button className="btn btn-outline" type="button" onClick={() => exportCaseReport(selectedCase.id)}>
                  Mark exported
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', marginTop: '0.25rem' }}>
                <p className="footer-note" style={{ margin: 0 }}>
                  Need the cohort + QA + validation write-up? Switch to <strong>Full laboratory report (MLA)</strong> or use the sidebar link <strong>Full lab report (MLA)</strong>.
                </p>
                <button className="btn btn-primary" type="button" style={{ marginTop: '0.65rem' }} onClick={setTabFullLab}>
                  Open full laboratory report (MLA)
                </button>
              </div>
            </div>

            {selectedCase ? <ReportPreview currentCase={selectedCase} /> : null}
          </section>
        </>
      ) : (
        <>
          <div className="card" style={{ display: 'grid', gap: '0.65rem' }}>
            <div className="micro-label">MLA integrated document</div>
            <h3 style={{ fontWeight: 700, margin: 0, color: 'var(--cream)', fontSize: '1rem' }}>Download or print</h3>
            <p className="footer-note" style={{ margin: 0 }}>
              Double-spaced Times New Roman, 1″ margins, running head, and a <strong>Works Cited</strong> page. Each figure includes a titled heading and a full explanatory caption. Primary case for Sections 3.2–3.2.1:
            </p>
            <select className="select" value={selectedCase?.id || ''} onChange={(e) => setSelectedId(e.target.value)} aria-label="Primary case for MLA report">
              {cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.caseId} — {item.stainType}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="button" onClick={onDownloadFullHtml}>
                Download report (.html)
              </button>
              <button className="btn btn-outline" type="button" onClick={onPrintFullReport}>
                Print / Save as PDF…
              </button>
            </div>
            <p className="footer-note" style={{ margin: 0 }}>
              Server-side single-case PDF (ReportLab) remains under <strong>Case exports</strong> when signed in.
            </p>
          </div>

          <FullWrittenReportFrame html={fullReportHtml} title="Full laboratory report — MLA preview" />
        </>
      )}
    </div>
  )
}
