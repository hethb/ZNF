/**
 * Generates a single integrated HTML laboratory report in MLA-style document design
 * (cohort + primary case + QA analytics + validation), suitable for print/PDF.
 */

function escapeHtml(s) {
  if (s == null || s === '') return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatMlaDate(d = new Date()) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function runningHeadFromLab(labName) {
  const w = String(labName || 'PathIQ')
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-zA-Z0-9]/g, '')
  return (w || 'PathIQ').slice(0, 20)
}

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function cohortStats(cases) {
  const reviewed = cases.filter((c) => c.finalReview)
  const accepted = reviewed.filter((c) => c.finalReview.aiAccepted).length
  const overrides = reviewed.length - accepted
  const manualRequired = cases.filter((c) => c.status === 'Needs Review').length
  const totalFlags = cases.flatMap((c) => c.aiAnalysis?.flags || [])
  const byFlag = countBy(totalFlags, (f) => f.type)
  const byScore = countBy(cases, (c) => c.finalReview?.finalScore || c.aiAnalysis?.suggestedScore || '—')
  const byReviewer = countBy(cases, (c) => c.assignedReviewer || 'Unassigned')
  const avgConfidence = Math.round(cases.reduce((sum, c) => sum + (c.aiAnalysis?.confidence || 0), 0) / Math.max(cases.length, 1))
  const flaggedPct = Math.round((cases.filter((c) => (c.aiAnalysis?.flags?.length || 0) > 0).length / Math.max(cases.length, 1)) * 100)
  const agreementRate = reviewed.length ? Math.round((accepted / reviewed.length) * 100) : 0
  const volumeData = [
    { day: 'Mon', n: 8 },
    { day: 'Tue', n: 11 },
    { day: 'Wed', n: 14 },
    { day: 'Thu', n: 9 },
    { day: 'Fri', n: 16 }
  ]
  return {
    reviewed,
    accepted,
    overrides,
    manualRequired,
    byFlag,
    byScore,
    byReviewer,
    avgConfidence,
    flaggedPct,
    agreementRate,
    volumeData
  }
}

function barChartSvg({ labels, values, w = 520, h = 220, color = '#1a5270' }) {
  const max = Math.max(1, ...values, 1)
  const pad = 48
  const bw = (w - pad * 2) / Math.max(labels.length, 1)
  const bars = labels
    .map((lab, i) => {
      const v = values[i] || 0
      const bh = ((h - pad - 28) * v) / max
      const x = pad + i * bw + bw * 0.15
      const y = h - pad - bh
      const width = bw * 0.7
      return `<rect x="${x}" y="${y}" width="${width}" height="${bh}" fill="${color}" rx="3"/><text x="${x + width / 2}" y="${h - pad + 16}" text-anchor="middle" font-size="11" font-family='Times New Roman,Times,serif' fill="#000">${escapeHtml(lab)}</text><text x="${x + width / 2}" y="${y - 6}" text-anchor="middle" font-size="11" font-family='Times New Roman,Times,serif' fill="#000">${v}</text>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img">${bars}<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#333" stroke-width="0.75"/></svg>`
}

function lineChartSvg({ points, w = 520, h = 200, color = '#6b4423' }) {
  const max = Math.max(1, ...points.map((p) => p.n))
  const pad = 40
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const step = innerW / Math.max(points.length - 1, 1)
  const pts = points
    .map((p, i) => {
      const x = pad + i * step
      const y = pad + innerH - (p.n / max) * innerH
      return `${x},${y}`
    })
    .join(' ')
  const poly = `<polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}"/>`
  const dots = points
    .map((p, i) => {
      const x = pad + i * step
      const y = pad + innerH - (p.n / max) * innerH
      return `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/><text x="${x}" y="${h - 10}" text-anchor="middle" font-size="10" font-family='Times New Roman,Times,serif' fill="#000">${escapeHtml(p.day)}</text>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img">${poly}${dots}</svg>`
}

function hBarChartSvg({ rows, w = 520, h = 200, color = '#2d5a4a' }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  const rowH = Math.min(32, (h - 40) / Math.max(rows.length, 1))
  const blocks = rows
    .map((r, i) => {
      const y = 28 + i * rowH
      const barW = ((w - 160) * r.count) / max
      return `<text x="8" y="${y + rowH * 0.65}" font-size="11" font-family='Times New Roman,Times,serif' fill="#000">${escapeHtml(r.label)}</text><rect x="140" y="${y + 4}" width="${barW}" height="${rowH - 8}" fill="${color}" rx="2"/><text x="${148 + barW}" y="${y + rowH * 0.65}" font-size="11" font-family='Times New Roman,Times,serif' fill="#000">${r.count}</text>`
    })
    .join('')
  const totalH = Math.max(h, 40 + rows.length * rowH)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${totalH}" role="img">${blocks}</svg>`
}

function placeholderSvg(message, w = 520, h = 100) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="#fafafa" stroke="#999" stroke-width="1"/><text x="24" y="${h / 2 + 4}" font-size="12" font-family='Times New Roman,Times,serif' fill="#000">${escapeHtml(message)}</text></svg>`
}

/**
 * MLA-style figure: bold figure title line, graphic, then full-sentence caption (label + prose).
 */
function mlaFigure(figNum, heading, description, svgMarkup) {
  return `<figure class="fig">
  <p class="fig-head"><strong>Fig. ${figNum}. ${escapeHtml(heading)}</strong></p>
  <div class="fig-svg">${svgMarkup}</div>
  <figcaption class="fig-cap"><span class="fig-num">Fig. ${figNum}.</span> ${escapeHtml(description)}</figcaption>
</figure>`
}

function confusionTable(matrix) {
  const labs = ['0', '1+', '2+', '3+']
  const head = `<tr><th scope="col">Human \\ AI</th>${labs.map((c) => `<th scope="col">${c}</th>`).join('')}</tr>`
  const body = labs
    .map(
      (r) =>
        `<tr><th scope="row">${r}</th>${labs.map((c) => `<td class="num">${matrix[r]?.[c] ?? 0}</td>`).join('')}</tr>`
    )
    .join('')
  return `<table class="tbl" aria-label="Confusion matrix"><thead>${head}</thead><tbody>${body}</tbody></table>`
}

function caseIdForReport(c, settings) {
  if (settings?.anonymizeCaseIds) return `ANON-${c.id.slice(0, 8)}`
  return c.caseId
}

/**
 * @param {object} opts
 * @param {Array} opts.cases
 * @param {object} opts.settings
 * @param {object} opts.focusCase — primary case for narrative
 * @param {Array} opts.validationCases
 * @param {object} opts.confusionMatrix
 */
export function buildFullLaboratoryReportHtml({ cases, settings, focusCase, validationCases, confusionMatrix }) {
  const lab = settings?.labName || 'PathIQ Demo Laboratory'
  const labEsc = escapeHtml(lab)
  const template = escapeHtml(settings?.reportTemplate || 'Integrated laboratory report')
  const generatedUtc = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
  const mlaDate = formatMlaDate(new Date())
  const rh = runningHeadFromLab(lab)

  const st = cohortStats(cases)
  const scoreLabels = ['0', '1+', '2+', '3+']
  const scoreVals = scoreLabels.map((s) => st.byScore[s] || 0)
  const flagRows = Object.entries(st.byFlag).map(([label, count]) => ({ label, count }))
  const reviewerRows = Object.entries(st.byReviewer).map(([label, count]) => ({ label, count }))
  const valMatches = validationCases.filter((v) => v.referenceScore === v.aiScore).length
  const valN = validationCases.length
  const valAcc = valN ? Math.round((valMatches / valN) * 100) : 0

  const fc = focusCase || cases[0]
  const cid = fc ? caseIdForReport(fc, settings) : '—'
  const ai = fc?.aiAnalysis
  const fr = fc?.finalReview

  const cohortRows = cases
    .map(
      (c) =>
        `<tr><td>${escapeHtml(caseIdForReport(c, settings))}</td><td>${escapeHtml(c.sampleId)}</td><td>${escapeHtml(c.tissueType)}</td><td>${escapeHtml(c.stainType)}</td><td>${escapeHtml(c.status)}</td><td>${escapeHtml(c.aiAnalysis?.suggestedScore || '—')}</td><td>${escapeHtml(c.finalReview?.finalScore || '—')}</td><td>${c.aiAnalysis?.confidence != null ? Math.round(c.aiAnalysis.confidence) : '—'}</td><td>${(c.aiAnalysis?.flags || []).length}</td></tr>`
    )
    .join('')

  const auditLines = (fc?.auditTrail || [])
    .slice()
    .reverse()
    .map((e) => `<tr><td>${escapeHtml(e.timestamp)}</td><td>${escapeHtml(e.actor)}</td><td>${escapeHtml(e.action)}</td><td>${escapeHtml(e.details || '')}</td></tr>`)
    .join('')

  const abstractText = `This report summarizes immunohistochemistry (IHC) scoring workflow activity for ${cases.length} cases under human-in-the-loop review. Artificial intelligence (AI) supplied slide- or patch-level pre-scores with confidence estimates and uncertainty flags; licensed pathologists retained final sign-out authority. Crude agreement between AI pre-score and final human score was ${st.agreementRate}% across ${st.reviewed.length} completed reviews. A demonstration validation panel of ${valN} reference-labeled comparisons yielded ${valAcc}% exact class concordance. The document is intended for internal quality assurance and pilot documentation, not as a stand-alone diagnostic instrument.`

  const fig1Desc = `This bar chart counts cases in each semi-quantitative intensity class (0, 1+, 2+, 3+), using the final pathologist score when documented and otherwise the AI-suggested score. The tallest category indicates where the cohort concentrates after review; uneven distributions may signal prevalence, triage rules, or rubric drift. Current counts are 0: ${scoreVals[0]}, 1+: ${scoreVals[1]}, 2+: ${scoreVals[2]}, 3+: ${scoreVals[3]}.`

  const fig2Desc = `The line graph plots an illustrative Monday–Friday case volume series (same series as the QA analytics throughput chart) so staffing and instrument load can be read at a glance. Peaks and troughs are not patient-level forecasts; they are operational placeholders unless your deployment binds this series to a live LIMS feed. Values by day are ${st.volumeData.map((p) => `${p.day} ${p.n}`).join('; ')}.`

  const fig3Desc = `These bars partition the cohort into three workflow outcomes: pathologists who accepted the AI pre-score (${st.accepted}), documented overrides (${st.overrides}), and cases still queued for manual review (${st.manualRequired}). The balance summarizes how often the model’s suggestion survived governance versus how often human judgment superseded it.`

  const fig4Desc = flagRows.length
    ? `Each bar totals AI-generated flag events of a given category across all cases (one case may contribute multiple flags). High counts for borderline or artifact-related flags may predict longer review times even when final scores agree with the model. Categories shown: ${flagRows.map((r) => `${r.label} (${r.count})`).join('; ')}.`
    : `No AI flag events were recorded on this export, so the chart is omitted and this note substitutes for the graphic. Empty flag tallies can indicate either a genuinely uneventful cohort slice or a configuration in which flagging rules were disabled; confirm against your instrumented review logs before drawing operational conclusions.`

  const fig5Desc = reviewerRows.length
    ? `Horizontal bars show how many cases are assigned to each reviewer label in the cockpit, highlighting workload concentration for supervision and turnaround planning. The longest bar identifies the busiest assignee bucket in this snapshot. Counts by assignee: ${reviewerRows.map((r) => `${r.label}: ${r.count}`).join('; ')}.`
    : `No reviewer assignments were present in the exported cohort metadata, so workload cannot be visualized here. When your site populates assignedReviewer fields, this figure will mirror the QA analytics reviewer chart and support equity checks across sign-out paths.`

  const fig4Svg = flagRows.length
    ? barChartSvg({ labels: flagRows.map((r) => r.label), values: flagRows.map((r) => r.count), color: '#7a5230' })
    : placeholderSvg('No flag events in this export — see caption.', 520, 110)

  const fig5Svg = reviewerRows.length
    ? hBarChartSvg({ rows: reviewerRows.map((r) => ({ label: r.label, count: r.count })) })
    : placeholderSvg('No reviewer assignments in this export — see caption.', 520, 110)

  const fig1 = mlaFigure(1, 'Cohort Score Distribution', fig1Desc, barChartSvg({ labels: scoreLabels, values: scoreVals, color: '#1a5270' }))
  const fig2 = mlaFigure(2, 'Illustrative Weekly Case Volume', fig2Desc, lineChartSvg({ points: st.volumeData, color: '#6b4423' }))
  const fig3 = mlaFigure(
    3,
    'AI–Human Disposition',
    fig3Desc,
    barChartSvg({
      labels: ['Accepted AI', 'Override', 'In MR queue'],
      values: [st.accepted, st.overrides, st.manualRequired],
      color: '#4a6741'
    })
  )
  const fig4 = mlaFigure(4, 'AI Flags by Category', fig4Desc, fig4Svg)
  const fig5 = mlaFigure(5, 'Cases Assigned by Reviewer', fig5Desc, fig5Svg)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(rh)} — Integrated IHC Workflow Report</title>
  <style>
    @page { size: letter; margin: 1in; }
    html { font-size: 12pt; }
    body {
      font-family: "Times New Roman", Times, serif;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
      line-height: 2;
      text-align: left;
    }
    .print-running {
      display: none;
      font-size: 12pt;
      line-height: 1;
      font-family: "Times New Roman", Times, serif;
    }
    @media print {
      .print-running {
        display: block;
        position: fixed;
        top: 0.5in;
        right: 1in;
      }
    }
    .wrap {
      box-sizing: border-box;
      max-width: 6.5in;
      margin: 0 auto;
      padding: 48px 12px 72px;
      background: #fff;
    }
    @media print {
      .wrap { max-width: 100%; padding: 0 0 0.5in; }
      body { background: #fff; }
    }
    .mla-heading-block {
      margin: 0 0 1rem 0;
      line-height: 2;
      text-indent: 0;
    }
    .mla-heading-block p { margin: 0; text-indent: 0; }
    .paper-title {
      text-align: center;
      font-size: 12pt;
      font-weight: normal;
      margin: 0 0 1rem 0;
      line-height: 2;
      text-indent: 0;
    }
    h1.paper-title { font-size: 12pt; }
    h2.section {
      font-size: 12pt;
      font-weight: bold;
      margin: 1.5rem 0 0.5rem 0;
      text-indent: 0;
      line-height: 2;
      border: none;
      text-align: left;
    }
    h3.subsection {
      font-size: 12pt;
      font-weight: bold;
      font-style: italic;
      margin: 1rem 0 0.35rem 0;
      text-indent: 0;
      line-height: 2;
    }
    p {
      margin: 0 0 0.5rem 0;
      text-indent: 0.5in;
      line-height: 2;
      text-align: left;
    }
    p.no-indent, .mla-heading-block p, .paper-title, .fig-head, .fig-cap, .table-block > p, .note p, .hang p, .abstract-block p, .keywords { text-indent: 0; }
    .abstract-block { margin: 1rem 0; }
    .abstract-block h2 { font-size: 12pt; font-weight: bold; margin: 0 0 0.25rem 0; text-indent: 0; }
    .keywords { font-size: 12pt; margin-top: 0.5rem; line-height: 2; }
    .meta-note {
      font-size: 12pt;
      line-height: 2;
      margin: 0 0 1rem 0;
      text-indent: 0;
    }
    .tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 11pt;
      line-height: 1.35;
      margin: 0.25rem 0 1rem 0;
    }
    .tbl th, .tbl td {
      border: 1px solid #000;
      padding: 6px 8px;
      vertical-align: top;
    }
    .tbl th { font-weight: bold; text-align: center; }
    .tbl td.num { text-align: center; }
    .table-block { margin: 1rem 0; page-break-inside: avoid; }
    .table-block > p { margin: 0 0 0.35rem 0; font-size: 12pt; line-height: 2; }
    .fig {
      margin: 1.25rem 0;
      page-break-inside: avoid;
    }
    .fig-head {
      margin: 0 0 0.35rem 0;
      font-size: 12pt;
      line-height: 2;
      text-align: left;
    }
    .fig-svg {
      text-align: center;
      margin: 0.25rem 0 0.5rem 0;
    }
    .fig-cap {
      font-size: 12pt;
      line-height: 2;
      margin: 0 0 1rem 0;
      text-align: left;
    }
    .fig-num { font-weight: bold; }
    .works-cited {
      page-break-before: always;
      margin-top: 2rem;
    }
    .works-cited h2 {
      text-align: center;
      font-size: 12pt;
      font-weight: normal;
      margin: 0 0 1rem 0;
      text-indent: 0;
    }
    .hang p {
      margin: 0 0 0.65rem 0;
      padding-left: 0.5in;
      text-indent: -0.5in;
      line-height: 2;
      font-size: 12pt;
    }
    .note {
      margin-top: 1.5rem;
      font-size: 12pt;
      line-height: 2;
      border-top: 1px solid #000;
      padding-top: 0.75rem;
    }
    em { font-style: italic; }
  </style>
</head>
<body>
  <div class="print-running">${escapeHtml(rh)}</div>
  <div class="wrap">
    <div class="mla-heading-block">
      <p>${labEsc}</p>
      <p>${template}</p>
      <p>PathIQ workflow documentation</p>
      <p>${escapeHtml(mlaDate)}</p>
    </div>

    <h1 class="paper-title">Integrated Laboratory Report: IHC Scoring Workflow, Quality Analytics, and Validation Summary</h1>

    <p class="meta-note no-indent"><strong>System timestamp (UTC):</strong> ${escapeHtml(generatedUtc)}. <strong>Primary case for detailed results:</strong> ${escapeHtml(cid)}. <strong>Disclaimer:</strong> PathIQ supports workflow and documentation; it does not replace qualified pathologist review or establish a medical diagnosis.</p>

    <div class="abstract-block">
      <h2>Abstract</h2>
      <p class="no-indent">${escapeHtml(abstractText)}</p>
      <p class="keywords"><strong>Keywords:</strong> immunohistochemistry; digital pathology; quality assurance; concordance; human-in-the-loop; biomarker scoring</p>
    </div>

    <h2 class="section">Introduction</h2>
    <p>Immunohistochemistry anchors many oncology biomarker algorithms. Semi-quantitative scoring remains cognitively demanding and can vary between observers. Computational assistants can surface candidate classes, confidence, and structured uncertainty while preserving professional sign-out, provided validation and governance are explicit. This report follows MLA-style student manuscript conventions for typography and source documentation while retaining IMRaD-style headings appropriate to an internal laboratory memorandum.</p>

    <h2 class="section">Materials and Methods</h2>
    <h3 class="subsection">Cohort and workflow</h3>
    <p>The export includes every case record visible in the active PathIQ instance (${cases.length} rows). Workflow states span intake through export. AI-derived fields include suggested intensity class, confidence on a 0–100 scale, field-level intensity histograms where configured, and machine-generated flags. Final scores, acceptance of AI output, override rationale, and reviewer prose are captured at sign-out.</p>
    <h3 class="subsection">Quality analytics and figures</h3>
    <p>Section 3.3 reproduces QA analytics as static SVG graphics. Each figure is introduced by a titled heading (<strong>Fig. <em>n</em>.</strong>) and followed by a full caption that states how to read the axes, what population the counts represent, and how the magnitudes relate to dashboard monitoring.</p>
    <h3 class="subsection">Validation subset</h3>
    <p>Reference-standard scores were compared to AI scores on a demonstration panel of ${valN} rows. A four-class confusion matrix summarizes cross-tabulation; exact-match accuracy on the panel is ${valAcc}%.</p>

    <h2 class="section">Results</h2>
    <h3 class="subsection">Cohort characteristics</h3>
    <div class="table-block">
      <p><strong>Table 1.</strong> Cohort roster with identifiers (respecting anonymization), tissue and stain context, workflow status, AI suggestion, final human score when present, model confidence, and count of AI flags per case.</p>
      <table class="tbl" aria-label="Cohort table">
        <thead><tr><th>Case ID</th><th>Sample ID</th><th>Tissue</th><th>Stain</th><th>Status</th><th>AI score</th><th>Final score</th><th>Conf. %</th><th># Flags</th></tr></thead>
        <tbody>${cohortRows || '<tr><td colspan="9">No cases in cohort.</td></tr>'}</tbody>
      </table>
    </div>

    <h3 class="subsection">Primary case (${escapeHtml(cid)})</h3>
    <p><strong>Tissue and biomarker:</strong> ${escapeHtml(fc?.tissueType || '—')} / ${escapeHtml(fc?.stainType || '—')}. <strong>AI suggested score:</strong> ${escapeHtml(ai?.suggestedScore || '—')} at <strong>${ai?.confidence != null ? Math.round(ai.confidence) : '—'}%</strong> confidence. <strong>Final pathologist score:</strong> ${escapeHtml(fr?.finalScore || '—')} (${fr?.aiAccepted ? 'AI score accepted' : 'override documented'}). ${escapeHtml(fr?.overrideReason || '')}</p>
    <p><strong>Model-estimated intensity field fractions:</strong> 0: ${ai?.intensityDistribution?.zero ?? '—'}%; 1+: ${ai?.intensityDistribution?.onePlus ?? '—'}%; 2+: ${ai?.intensityDistribution?.twoPlus ?? '—'}%; 3+: ${ai?.intensityDistribution?.threePlus ?? '—'}%.</p>
    <p><strong>Uncertainty summary:</strong> ${escapeHtml(ai?.uncertaintySummary || 'Not recorded.')}</p>
    <p><strong>Reviewer notes:</strong> ${escapeHtml(fr?.reviewerNotes || 'None.')}</p>

    <h3 class="subsection">Audit trail (selected case)</h3>
    <div class="table-block">
      <p><strong>Table 4.</strong> Chronological audit entries for the selected primary case, newest first, mirroring the cockpit audit panel.</p>
      <table class="tbl"><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead><tbody>${auditLines || '<tr><td colspan="4">No audit events.</td></tr>'}</tbody></table>
    </div>

    <h3 class="subsection">Laboratory QA metrics and figures</h3>
    <p>Among ${st.reviewed.length} finalized reviews, exact AI–human class agreement was <strong>${st.agreementRate}%</strong>. Overrides totaled ${st.overrides}. Cases still in manual review: ${st.manualRequired}. Mean cohort model confidence was <strong>${st.avgConfidence}%</strong>. Cases with at least one AI flag: <strong>${st.flaggedPct}%</strong>.</p>
    ${fig1}
    ${fig2}
    ${fig3}
    ${fig4}
    ${fig5}

    <h3 class="subsection">Validation panel and confusion matrix</h3>
    <div class="table-block">
      <p><strong>Table 2.</strong> Row-level validation comparisons listing demonstration identifiers, reference and AI classes, binary concordance, reported confidence, and free-text notes aligned with the Validation tab.</p>
      <table class="tbl">
        <thead><tr><th>Validation ID</th><th>Reference</th><th>AI</th><th>Match</th><th>Conf. %</th><th>Notes</th></tr></thead>
        <tbody>
          ${validationCases
            .map(
              (v) =>
                `<tr><td>${escapeHtml(v.caseId)}</td><td>${escapeHtml(v.referenceScore)}</td><td>${escapeHtml(v.aiScore)}</td><td>${v.referenceScore === v.aiScore ? 'Yes' : 'No'}</td><td>${v.confidence}</td><td>${escapeHtml(v.notes)}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <div class="table-block">
      <p><strong>Table 3.</strong> Confusion matrix for the demonstration validation set. Rows index the reference pathologist class; columns index the AI-assigned class. Diagonal mass indicates concordant calls; off-diagonal cells quantify systematic under- or over-calls by class pair.</p>
      ${confusionTable(confusionMatrix)}
    </div>

    <h2 class="section">Discussion</h2>
    <p>Linking tabular cohort data, case-level traceability, QA graphics, and validation matrices in one narrative supports study monitors and laboratory directors who must explain both throughput and clinical governance. Agreement percentages should be interpreted alongside prevalence, antibody lot, scanner profile, and scoring rubric version. Moderate confidence or frequent borderline flags can increase pathologist workload even when aggregate concordance appears favorable.</p>

    <h2 class="section">Limitations</h2>
    <p>This document is generated from live or demonstration application state rather than from a locked analytic database extract. Weekly volume is illustrative unless integrated with LIMS. Software and model versions should be archived with any formal validation package.</p>

    <div class="works-cited">
      <h2>Works Cited</h2>
      <div class="hang">
        <p>Bogen, Stephen A., et al. &ldquo;Regulating Laboratory-Developed Tests: Balancing Patient Safety and Innovation in Companion Diagnostics.&rdquo; <em>Archives of Pathology &amp; Laboratory Medicine</em>, vol. 140, no. 3, 2016, pp. 247&ndash;54.</p>
        <p>Clinical and Laboratory Standards Institute. <em>Quality Control for Molecular Diagnostic Methods; Approved Guideline</em>. 2nd ed., CLSI document MM3-A2, CLSI, 2012.</p>
        <p>Fitzgibbons, Patrick L., et al. &ldquo;College of American Pathologists Pathology and Laboratory Quality Center Guideline for Documenting Biomarker Testing in Pathology Reports.&rdquo; <em>Archives of Pathology &amp; Laboratory Medicine</em>, vol. 144, no. 7, 2020, pp. 816&ndash;34.</p>
        <p>Torlakovic, Emina E., et al. &ldquo;International Immunohistochemistry Quality Control Study (IQCP Path): Principles Relevant to Design and Interpretation of Interlaboratory Trials in IHC.&rdquo; <em>Applied Immunohistochemistry &amp; Molecular Morphology</em>, vol. 23, no. 10, 2015, pp. 693&ndash;702.</p>
        <p>Wolff, Allison C., et al. &ldquo;Human Epidermal Growth Factor Receptor 2 Testing in Breast Cancer: American Society of Clinical Oncology/College of American Pathologists Clinical Practice Guideline Focused Update.&rdquo; <em>Archives of Pathology &amp; Laboratory Medicine</em>, vol. 142, no. 11, 2018, pp. 1364&ndash;82.</p>
      </div>
    </div>

    <div class="note">
      <p class="no-indent"><strong>Controlled copy and signatures:</strong> Print this HTML to PDF locally, then route the PDF through your quality management system if formal sign-off is required. The running head at the upper right repeats on printed pages in supporting browsers.</p>
    </div>
  </div>
</body>
</html>`

  return html
}

export function downloadHtmlFile(filename, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
