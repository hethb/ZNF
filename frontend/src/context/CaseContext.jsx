import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { mockCases } from '../data/mockCases'
import { generateMockAIAnalysis } from '../utils/mockAI'
import { listWorkflowCases, runWorkflowAnalysis, submitFeedback, upsertWorkflowCase } from '../services/api'
import { useAppState } from './AppStateContext'

const CaseContext = createContext(null)
const STORAGE_KEY = 'pathiq.workflow.cases.v1'

function makeAuditEvent(actor, action, details = '') {
  return { id: crypto.randomUUID(), timestamp: new Date().toISOString(), actor, action, details }
}

function parseStoredCases() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function clampPercent(raw) {
  const value = Number(raw)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function shouldRequireReview({ confidence, flags, threshold, requireManualReview }) {
  if (!requireManualReview) return false
  if (confidence < threshold) return true
  return (flags || []).some((flag) => flag.type === 'Manual Review Recommended')
}

function normalizeDistribution(probabilities = []) {
  const p0 = clampPercent((probabilities[0] || 0) * 100)
  const p1 = clampPercent((probabilities[1] || 0) * 100)
  const p2 = clampPercent((probabilities[2] || 0) * 100)
  const p3 = Math.max(0, 100 - p0 - p1 - p2)
  return { zero: p0, onePlus: p1, twoPlus: p2, threePlus: p3 }
}

function aiFromSingleAnalysis(result) {
  const confidencePct = clampPercent((result?.confidence || 0) * 100)
  const flags = []

  if (result?.needs_review) {
    flags.push({
      type: 'Manual Review Recommended',
      severity: 'Medium',
      description: 'Uncertainty threshold exceeded; manual review recommended.'
    })
  }

  if (result?.uncertainty_combined >= 0.2) {
    flags.push({
      type: 'Low Confidence',
      severity: 'Medium',
      description: 'The model detected low-confidence regions in the slide.'
    })
  }

  return {
    suggestedScore: result?.intensity_label || '0',
    confidence: confidencePct,
    intensityDistribution: normalizeDistribution(result?.intensity_probabilities || []),
    flags,
    uncertaintySummary:
      result?.needs_review
        ? `AI pre-score is ${result?.intensity_label || '0'} with elevated uncertainty. Manual review recommended.`
        : `AI pre-score is ${result?.intensity_label || '0'} with stable confidence for triage.`,
    analyzedAt: new Date().toISOString(),
    heatmapUrl: result?.heatmap_base64 ? `data:image/png;base64,${result.heatmap_base64}` : undefined
  }
}

function aiFromCaseAnalysis(result) {
  const summary = result?.summary || {}
  const dist = summary.patch_score_distribution_pct
  const distribution = Array.isArray(dist)
    ? dist
    : {
        zero: dist?.['0'] ?? dist?.zero ?? 0,
        onePlus: dist?.['1+'] ?? dist?.onePlus ?? 0,
        twoPlus: dist?.['2+'] ?? dist?.twoPlus ?? 0,
        threePlus: dist?.['3+'] ?? dist?.threePlus ?? 0
      }

  const suggestedScore = summary.suggested_final_label || summary.suggested_intensity_label || '0'
  const nOk = Math.max(1, Number(summary.n_analyzed_ok) || 1)
  const nRev = Number(summary.needs_review_count) || 0
  const confidencePct = clampPercent(Math.round((1 - Math.min(1, nRev / nOk) * 0.45) * 100))

  const flags = []
  if (summary.any_region_needs_review || nRev > 0) {
    flags.push({
      type: 'Manual Review Recommended',
      severity: nRev / nOk > 0.25 ? 'High' : 'Medium',
      description: `${nRev} of ${nOk} analyzed regions flagged for review.`
    })
  }

  const intensityDistribution = Array.isArray(distribution)
    ? {
        zero: clampPercent(distribution[0]),
        onePlus: clampPercent(distribution[1]),
        twoPlus: clampPercent(distribution[2]),
        threePlus: clampPercent(distribution[3])
      }
    : {
        zero: clampPercent(distribution.zero),
        onePlus: clampPercent(distribution.onePlus),
        twoPlus: clampPercent(distribution.twoPlus),
        threePlus: clampPercent(distribution.threePlus)
      }

  return {
    suggestedScore,
    confidence: confidencePct,
    intensityDistribution,
    flags,
    uncertaintySummary:
      nRev > 0
        ? `${Math.round((nRev / nOk) * 100)}% of analyzed regions exceeded review thresholds.`
        : 'All analyzed regions were within confidence thresholds.',
    analyzedAt: new Date().toISOString()
  }
}

export function CaseProvider({ children }) {
  const [cases, setCases] = useState(() => parseStoredCases() || mockCases)
  const [isSyncing, setIsSyncing] = useState(false)
  const { settings, user, accessToken, authMode } = useAppState()

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
  }, [cases])

  useEffect(() => {
    if (authMode !== 'server' || !accessToken) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const remote = await listWorkflowCases()
        if (cancelled || !remote?.length) return
        setCases(remote)
      } catch {
        /* keep local cache */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [accessToken, authMode])

  const updateCase = (id, updater) => {
    setCases((prev) => prev.map((item) => (item.id === id ? updater(item) : item)))
  }

  const persistRemote = async (caseObj) => {
    if (authMode !== 'server' || !accessToken) return
    try {
      await upsertWorkflowCase(caseObj)
    } catch {
      /* offline tolerance */
    }
  }

  const createCase = async ({ payload, files = [] }) => {
    const now = new Date().toISOString()
    const baseCase = {
      id: crypto.randomUUID(),
      ...payload,
      uploadedAt: now,
      updatedAt: now,
      status: 'Uploaded',
      aiAnalysis: null,
      finalReview: null,
      auditTrail: [makeAuditEvent(user?.role || 'Technician', 'Case Uploaded', 'Slide uploaded with metadata.')]
    }

    let aiAnalysis = generateMockAIAnalysis()
    let source = 'mock'

    if (!settings.mockModelMode && files?.length) {
      setIsSyncing(true)
      try {
        const backend = await runWorkflowAnalysis({ caseId: payload.caseId, files })
        if (backend?.mode === 'single') aiAnalysis = aiFromSingleAnalysis(backend.result)
        if (backend?.mode === 'multi') aiAnalysis = aiFromCaseAnalysis(backend.result)
        source = backend?.mode || 'mock'
      } catch {
        source = 'mock'
      } finally {
        setIsSyncing(false)
      }
    }

    const status = shouldRequireReview({
      confidence: aiAnalysis.confidence,
      flags: aiAnalysis.flags,
      threshold: Number(settings.confidenceThreshold) || 80,
      requireManualReview: settings.requireManualReview
    })
      ? 'Needs Review'
      : 'AI Analyzed'

    const newCase = {
      ...baseCase,
      status,
      aiAnalysis,
      auditTrail: [
        makeAuditEvent('PathIQ AI', 'AI Analysis Completed', `Source: ${source}. Suggested score ${aiAnalysis.suggestedScore}, confidence ${aiAnalysis.confidence}%.`),
        ...baseCase.auditTrail
      ]
    }

    setCases((prev) => [newCase, ...prev])
    await persistRemote(newCase)
    return newCase
  }

  const saveReviewDraft = async ({ id, finalScore, reviewer, overrideReason, reviewerNotes }) => {
    const selected = cases.find((item) => item.id === id)
    if (!selected) return

    const now = new Date().toISOString()
    const actor = reviewer || user?.name || 'Pathologist'
    const merged = {
      ...selected,
      updatedAt: now,
      reviewDraft: {
        finalScore,
        overrideReason,
        reviewerNotes,
        savedAt: now
      },
      auditTrail: [makeAuditEvent(actor, 'Review Draft Saved', `Draft score ${finalScore} saved. Notes updated.`), ...selected.auditTrail]
    }

    updateCase(id, () => merged)
    await persistRemote(merged)
  }

  const finalizeCase = async ({ id, finalScore, reviewer, overrideReason, reviewerNotes }) => {
    const selected = cases.find((item) => item.id === id)
    if (!selected?.aiAnalysis) return

    const now = new Date().toISOString()
    const aiAccepted = selected.aiAnalysis.suggestedScore === finalScore

    const merged = {
      ...selected,
      status: 'Finalized',
      updatedAt: now,
      finalReview: {
        finalScore,
        reviewer,
        reviewedAt: now,
        aiAccepted,
        overrideReason,
        reviewerNotes
      },
      auditTrail: [
        makeAuditEvent(reviewer || user?.name || 'Pathologist', 'Score Edited', `Final score set to ${finalScore}.`),
        makeAuditEvent(reviewer || user?.name || 'Pathologist', 'Case Finalized', aiAccepted ? 'AI score accepted after review.' : 'Manual override applied.'),
        ...selected.auditTrail
      ]
    }

    updateCase(id, () => merged)
    await persistRemote(merged)

    if (settings.mockModelMode) return

    try {
      const predicted = Number.parseInt(String(selected.aiAnalysis.suggestedScore).replace('+', ''), 10) || 0
      const corrected = Number.parseInt(String(finalScore).replace('+', ''), 10) || 0
      await submitFeedback({
        predicted_intensity_score: predicted,
        corrected_intensity_score: corrected,
        confidence: Number((selected.aiAnalysis.confidence / 100).toFixed(4)),
        uncertainty_combined: selected.aiAnalysis.confidence < (Number(settings.confidenceThreshold) || 80) ? 0.2 : 0.08,
        tissue_type: selected.tissueType || '',
        note: reviewerNotes || overrideReason || '',
        source: 'workflow-review',
        image_name: selected.imageUrl || '',
        case_id: selected.caseId || '',
        reviewed_by: reviewer || user?.name || '',
        final_review: true
      })
    } catch {
      /* preserve UX */
    }
  }

  const exportCaseReport = async (id, actor = user?.name || 'Pathologist') => {
    const now = new Date().toISOString()
    let mergedOut = null

    setCases((prev) => {
      const selected = prev.find((c) => c.id === id)
      if (!selected) return prev
      mergedOut = {
        ...selected,
        status: 'Exported',
        updatedAt: now,
        auditTrail: [makeAuditEvent(actor, 'Report Exported', 'Case report exported to local format.'), ...selected.auditTrail]
      }
      return prev.map((c) => (c.id === id ? mergedOut : c))
    })

    if (mergedOut) await persistRemote(mergedOut)
  }

  const value = useMemo(
    () => ({ cases, createCase, saveReviewDraft, finalizeCase, exportCaseReport, isSyncing }),
    [cases, isSyncing]
  )

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>
}

export function useCases() {
  const ctx = useContext(CaseContext)
  if (!ctx) throw new Error('useCases must be used within CaseProvider')
  return ctx
}
