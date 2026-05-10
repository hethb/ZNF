function maybeAnonymizedCaseId(currentCase, settings) {
  if (!settings?.anonymizeCaseIds) return currentCase.caseId
  return `ANON-${currentCase.id.slice(0, 8)}`
}

export function formatCaseSummary(currentCase, settings = {}) {
  const ai = currentCase.aiAnalysis
  const review = currentCase.finalReview
  const caseId = maybeAnonymizedCaseId(currentCase, settings)

  return [
    'PathIQ IHC Scoring Report',
    '',
    `Lab: ${settings.labName || 'PathIQ Demo Lab'}`,
    `Template: ${settings.reportTemplate || 'Default Clinical Draft'}`,
    `Case ID: ${caseId}`,
    `Sample ID: ${currentCase.sampleId}`,
    `Tissue Type: ${currentCase.tissueType}`,
    `Stain: ${currentCase.stainType}`,
    `AI Suggested Score: ${ai?.suggestedScore ?? '--'}`,
    `Final Pathologist Score: ${review?.finalScore ?? '--'}`,
    `Confidence: ${ai?.confidence ? `${Math.round(ai.confidence)}%` : '--'}`,
    '',
    'Intensity Distribution:',
    `0: ${ai?.intensityDistribution?.zero ?? 0}%`,
    `1+: ${ai?.intensityDistribution?.onePlus ?? 0}%`,
    `2+: ${ai?.intensityDistribution?.twoPlus ?? 0}%`,
    `3+: ${ai?.intensityDistribution?.threePlus ?? 0}%`,
    '',
    'Flags:',
    ...(ai?.flags?.length ? ai.flags.map((flag) => `- ${flag.type}`) : ['- None']),
    '',
    'Reviewer Notes:',
    review?.reviewerNotes || 'No additional notes.'
  ].join('\n')
}
