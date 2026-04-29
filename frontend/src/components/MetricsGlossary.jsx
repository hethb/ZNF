/**
 * Shared copy for heatmap + metric definitions (Analyze + Results pages).
 */
const SECTIONS = [
  {
    title: 'Grad-CAM heatmap',
    body: (
      <>
        A red overlay highlights regions the model weighted most when forming its call for the predicted
        intensity class. Use it to see whether signal concentrates in expected tissue areas versus artifact,
        edge, or background—and to discuss cases with colleagues.
      </>
    )
  },
  {
    title: 'Predicted intensity (0 / 1+ / 2+ / 3+)',
    body: (
      <>
        The discrete IHC score with the highest support from the model for this patch. It matches common
        manual grading buckets so you can compare to glass or digital reads side by side.
      </>
    )
  },
  {
    title: 'Stain burden (0–100)',
    body: (
      <>
        A single continuous index derived from class probabilities: stronger staining and higher class mass
        push the number up. It is useful for trends, QC, and biomarker-agnostic lab analytics where a scalar
        is easier to plot than four categories alone.
      </>
    )
  },
  {
    title: 'Class distribution (MC mean)',
    body: (
      <>
        Bars show the average softmax probability for each intensity bin across several stochastic forward
        passes. A sharp peak on one bin means the model is concentrated; mass spread across bins suggests the
        patch is inherently ambiguous or heterogeneous at this resolution.
      </>
    )
  },
  {
    title: 'Top-class confidence',
    body: (
      <>
        The model’s estimated probability for the winning 0–3+ label after averaging those passes. Higher
        values mean the assigned bucket is relatively firm; low values mean several bins remain competitive.
      </>
    )
  },
  {
    title: 'Entropy and uncertainty (combined)',
    body: (
      <>
        <span className="font-medium" style={{ color: '#e8d4c4' }}>Entropy</span> summarizes how spread the
        probability mass is across all four scores (high when the model is unsure). The{' '}
        <span className="font-medium" style={{ color: '#e8d4c4' }}>combined</span> uncertainty bar takes the
        larger of that normalized entropy and variability on the top class from Monte Carlo dropout, so you
        still see a meaningful spread when dropout variance is tiny. Use it alongside the review flag to
        prioritize manual double-checks.
      </>
    )
  }
]

export default function MetricsGlossary({
  eyebrow = 'Metric reference',
  title = 'What the heatmap and metrics mean',
  lead,
  headingId = 'metrics-glossary-heading',
  className = ''
}) {
  return (
    <section
      className={`glass-card space-y-6 p-6 md:p-8 ${className}`.trim()}
      aria-labelledby={headingId}
    >
      <div>
        <p className="section-label mb-2 block">{eyebrow}</p>
        <h2 id={headingId} className="display-heading text-2xl md:text-3xl">
          {title}
        </h2>
        {lead && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: '#a08060' }}>
            {lead}
          </p>
        )}
      </div>

      <div className="space-y-5 text-sm leading-relaxed" style={{ color: '#c4ad92' }}>
        {SECTIONS.map((s, i) => (
          <div
            key={s.title}
            style={
              i > 0
                ? { borderTop: '1px solid rgba(212,178,140,0.08)', paddingTop: '1.25rem' }
                : undefined
            }
          >
            <h3 className="mb-1.5 text-base font-semibold" style={{ color: '#f4ece0' }}>
              {s.title}
            </h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
