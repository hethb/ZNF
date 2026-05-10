import { useEffect, useMemo, useState } from 'react'
import { useCases } from '../context/CaseContext'
import { useAppState } from '../context/AppStateContext'
import { workflowMyStats } from '../services/api'
import MetricCard from '../components/MetricCard'
import CaseTable from '../components/CaseTable'

function formatRelativeTime(iso) {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return '—'
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`
  return `${Math.round(diffSec / 86400)}d ago`
}

function getAgreementRate(cases) {
  const reviewed = cases.filter((item) => item.finalReview)
  if (!reviewed.length) return 0
  const accepted = reviewed.filter((item) => item.finalReview.aiAccepted).length
  return Math.round((accepted / reviewed.length) * 100)
}

export default function DashboardPage({ reviewQueueOnly = false }) {
  const { cases } = useCases()
  const { authMode, user } = useAppState()
  const [myStats, setMyStats] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    tissueType: '',
    stainType: '',
    reviewer: '',
    confidence: '',
    flaggedOnly: false
  })
  const [sortBy, setSortBy] = useState('Most recent')

  const visibleCases = useMemo(() => {
    let next = [...cases]
    if (reviewQueueOnly) {
      next = next.filter((item) => item.status === 'Needs Review' || item.status === 'AI Analyzed')
    }
    if (filters.status) next = next.filter((item) => item.status === filters.status)
    if (filters.tissueType) next = next.filter((item) => item.tissueType === filters.tissueType)
    if (filters.stainType) next = next.filter((item) => item.stainType === filters.stainType)
    if (filters.reviewer) next = next.filter((item) => item.assignedReviewer === filters.reviewer)
    if (filters.flaggedOnly) next = next.filter((item) => (item.aiAnalysis?.flags?.length || 0) > 0)
    if (filters.confidence === 'high') next = next.filter((item) => (item.aiAnalysis?.confidence || 0) >= 90)
    if (filters.confidence === 'moderate') {
      next = next.filter((item) => (item.aiAnalysis?.confidence || 0) >= 80 && (item.aiAnalysis?.confidence || 0) < 90)
    }
    if (filters.confidence === 'low') next = next.filter((item) => (item.aiAnalysis?.confidence || 0) < 80)

    if (sortBy === 'Most recent') next.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    if (sortBy === 'Highest uncertainty') next.sort((a, b) => (a.aiAnalysis?.confidence || 0) - (b.aiAnalysis?.confidence || 0))
    if (sortBy === 'Needs review first') {
      next.sort((a, b) => (a.status === 'Needs Review' ? -1 : 1) - (b.status === 'Needs Review' ? -1 : 1))
    }
    if (sortBy === 'Case ID') next.sort((a, b) => a.caseId.localeCompare(b.caseId))
    if (sortBy === 'Reviewer') next.sort((a, b) => (a.assignedReviewer || '').localeCompare(b.assignedReviewer || ''))
    if (sortBy === 'Final score') {
      next.sort((a, b) => (a.finalReview?.finalScore || '').localeCompare(b.finalReview?.finalScore || ''))
    }
    return next
  }, [cases, filters, sortBy, reviewQueueOnly])

  const metrics = useMemo(() => {
    const pendingReview = cases.filter((item) => item.status === 'Needs Review' || item.status === 'AI Analyzed').length
    const flagged = cases.filter((item) => (item.aiAnalysis?.flags?.length || 0) > 0).length
    const avgConfidence = Math.round(
      cases.reduce((sum, item) => sum + (item.aiAnalysis?.confidence || 0), 0) / Math.max(cases.length, 1)
    )
    return {
      total: cases.length,
      pendingReview,
      flagged,
      agreement: `${getAgreementRate(cases)}%`,
      avgConfidence: `${avgConfidence}%`,
      timeSaved: '31 min / case'
    }
  }, [cases])

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    if (authMode !== 'server' || !user?.username) {
      setMyStats(null)
      return undefined
    }
    let cancelled = false
    workflowMyStats()
      .then((data) => {
        if (!cancelled) setMyStats(data)
      })
      .catch(() => {
        if (!cancelled) setMyStats(null)
      })
    return () => {
      cancelled = true
    }
  }, [authMode, user?.username, cases.length])

  return (
    <div style={{ display: 'grid', gap: '1.15rem' }}>
      <header>
        <div className="micro-label">{reviewQueueOnly ? 'Triage' : 'Command center'}</div>
        <h1 className="page-title">{reviewQueueOnly ? 'Review queue' : 'Case dashboard'}</h1>
        <p className="page-subtitle">
          Monitor IHC intake, AI pre-scores, and pathologist throughput from upload through export.
        </p>
      </header>

      <section className="grid-metrics-6">
        <MetricCard title="Total cases" value={metrics.total} hint="All-time in this workspace" />
        <MetricCard title="Pending review" value={metrics.pendingReview} hint="Uploaded + AI analyzed awaiting sign-out" />
        <MetricCard title="Flagged cases" value={metrics.flagged} hint="Cases with model or QC flags" />
        <MetricCard title="AI–human agreement" value={metrics.agreement} hint="Accepted AI score vs override" />
        <MetricCard title="Average confidence" value={metrics.avgConfidence} hint="Across AI pre-scores" />
        <MetricCard title="Time saved" value={metrics.timeSaved} hint="Estimated review acceleration" />
      </section>

      {myStats ? (
        <section className="card" style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div className="micro-label">Your activity</div>
              <div style={{ fontWeight: 700, color: 'var(--cream)' }}>
                {user?.name || user?.username}
                <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem' }}>
                  · {user?.role}
                </span>
              </div>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Last active {formatRelativeTime(myStats.lastActive)}
            </div>
          </div>
          <div className="grid-metrics-6">
            <MetricCard title="Sign-ins" value={myStats.logins} hint="Includes initial sign-up" />
            <MetricCard title="Cases created" value={myStats.casesCreated} hint="Saves you initiated" />
            <MetricCard title="Cases edited" value={myStats.casesEdited} hint="Patches applied" />
            <MetricCard title="Cases deleted" value={myStats.casesDeleted} hint="Admin / Lab Director only" />
            <MetricCard title="Total actions" value={myStats.totalActions} hint="Across the audit log" />
            <MetricCard title="Recent" value={myStats.recent?.length || 0} hint="Last 10 audit rows" />
          </div>
          {myStats.recent?.length ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              {myStats.recent.slice(0, 5).map((row, idx) => (
                <li key={`${row.ts}-${idx}`} style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: 'var(--cream)', minWidth: 110 }}>{row.action}</span>
                  <span style={{ flex: 1 }}>{row.details || '—'}</span>
                  <span>{formatRelativeTime(row.ts)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="card" style={{ display: 'grid', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div className="micro-label">Filters</div>
            <div style={{ fontWeight: 700, color: 'var(--cream)' }}>Queue controls</div>
          </div>
        </div>
        <div className="grid-4">
          <select className="select" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            <option>Uploaded</option>
            <option>AI Analyzed</option>
            <option>Needs Review</option>
            <option>Finalized</option>
            <option>Exported</option>
          </select>
          <input className="input" placeholder="Tissue type" value={filters.tissueType} onChange={(e) => setFilter('tissueType', e.target.value)} />
          <input className="input" placeholder="Stain / biomarker" value={filters.stainType} onChange={(e) => setFilter('stainType', e.target.value)} />
          <input className="input" placeholder="Reviewer" value={filters.reviewer} onChange={(e) => setFilter('reviewer', e.target.value)} />
          <select className="select" value={filters.confidence} onChange={(e) => setFilter('confidence', e.target.value)}>
            <option value="">Any confidence</option>
            <option value="high">High confidence</option>
            <option value="moderate">Moderate confidence</option>
            <option value="low">Needs review</option>
          </select>
          <label className="check-row">
            <input type="checkbox" checked={filters.flaggedOnly} onChange={(e) => setFilter('flaggedOnly', e.target.checked)} />
            Flagged only
          </label>
          <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option>Most recent</option>
            <option>Highest uncertainty</option>
            <option>Needs review first</option>
            <option>Case ID</option>
            <option>Reviewer</option>
            <option>Final score</option>
          </select>
        </div>
      </section>

      <CaseTable cases={visibleCases} />
    </div>
  )
}
