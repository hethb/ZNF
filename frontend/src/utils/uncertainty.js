/** Combined uncertainty is ~0–1 (higher = less confident). Triage for pathologists. */
const LOW_MAX = 0.35
const MED_MAX = 0.55

export function triageFromUncertainty(uncertaintyCombined) {
  const u = Number(uncertaintyCombined)
  if (Number.isNaN(u) || u < 0) {
    return { tier: 'unknown', label: 'No signal', color: '#64748b', bg: 'rgba(100,116,139,0.12)', sortKey: 0 }
  }
  if (u <= LOW_MAX) {
    return {
      tier: 'high_confidence',
      label: 'High confidence',
      color: '#8a9962',
      bg: 'rgba(138,153,98,0.14)',
      border: 'rgba(138,153,98,0.35)',
      sortKey: 1 - u
    }
  }
  if (u <= MED_MAX) {
    return {
      tier: 'review_soon',
      label: 'Medium uncertainty — review when queue allows',
      color: '#d4a020',
      bg: 'rgba(212,160,32,0.12)',
      border: 'rgba(212,160,32,0.35)',
      sortKey: 2 - u
    }
  }
  return {
    tier: 'needs_review',
    label: 'Needs review — model spread / entropy high',
    color: '#c23c28',
    bg: 'rgba(194,60,40,0.12)',
    border: 'rgba(194,60,40,0.3)',
    sortKey: 3
  }
}

export function triageDotStyle(uncertaintyCombined) {
  const t = triageFromUncertainty(uncertaintyCombined)
  return { background: t.color, boxShadow: `0 0 0 2px ${t.border || 'transparent'}` }
}
