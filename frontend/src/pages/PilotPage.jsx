import { Link } from 'react-router-dom'

const milestones = [
  {
    label: 'Week 0',
    title: 'Scope the retrospective set',
    text: 'Pick one marker and one specimen class, collect 200-500 de-identified patches or ROIs, and lock the pathologist reference read format before training claims.'
  },
  {
    label: 'Weeks 1-2',
    title: 'Measure agreement and review burden',
    text: 'Run PathIQ against held-out reads, report exact accuracy, within-one accuracy, Cohen kappa, uncertainty review rate, and failure modes by tissue bucket.'
  },
  {
    label: 'Weeks 3-4',
    title: 'Shadow sign-out workflow',
    text: 'Use the case queue beside normal review. Track minutes saved per case, how often uncertainty flags matter, and whether heatmaps help adjudication.'
  },
  {
    label: 'Week 5',
    title: 'Decide expansion',
    text: 'Convert only if the lab sees measurable turnaround or QA lift. Next scope is another marker, more sites, or a VPC deployment review.'
  }
]

const proofPoints = [
  ['Buyer', 'Lab director or pathology group lead with a quantified IHC backlog.'],
  ['User', 'Pathologist or fellow reviewing stains, uncertainty flags, and heatmaps.'],
  ['Integration', 'CSV export first; LIS/LIMS integration after pilot signal.'],
  ['Compliance', 'Decision-support labeling, retrospective validation, and counsel review before clinical claims.']
]

export default function PilotPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-28">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <p className="section-label mb-2 block">Design partner pilot</p>
          <h1 className="display-heading max-w-3xl text-4xl md:text-5xl">
            Prove PathIQ on one painful IHC workflow before broad automation.
          </h1>
          <p className="type-pull mt-6 max-w-2xl border-l border-[rgba(194,98,26,0.35)] pl-5">
            YC-ready does not mean promising every biomarker. It means one lab, one workflow, one measurable
            improvement: faster review of IHC scoring with uncertainty, tissue context, and pathologist override.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/demo" className="btn-primary">
              Run demo
            </Link>
            <Link to="/benchmark" className="btn-ghost">
              Validate labels
            </Link>
            <Link to="/case" className="btn-ghost">
              Case workflow
            </Link>
          </div>
        </div>

        <aside className="surface-editorial p-6">
          <p className="section-label mb-4 block">Pilot success metrics</p>
          <div className="grid gap-3">
            <Metric value="< 15%" label="regions routed to manual review after calibration" />
            <Metric value=">= 0.75" label="weighted kappa target against reference reads" />
            <Metric value="30%" label="target reduction in repetitive scoring time" />
            <Metric value="0" label="standalone diagnostic claims before regulatory review" />
          </div>
        </aside>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-4">
        {proofPoints.map(([label, text]) => (
          <article key={label} className="glass-card p-5">
            <p className="section-label mb-2 block">{label}</p>
            <p className="text-sm leading-relaxed" style={{ color: '#c4ad92' }}>
              {text}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-label mb-2 block">Pilot sequence</p>
            <h2 className="display-heading text-3xl">Five weeks to a fundable signal</h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed md:text-right" style={{ color: '#7a6b59' }}>
            The goal is a credible design-partner readout: not revenue theater, not research-only metrics.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {milestones.map((item) => (
            <article key={item.label} className="glass-card glass-card-hover p-6">
              <p className="section-label mb-2 block">{item.label}</p>
              <h3 className="font-['Syne',sans-serif] text-lg font-semibold" style={{ color: '#f4ece0' }}>
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: '#a08060' }}>
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function Metric({ value, label }) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'rgba(212,178,140,0.06)', border: '1px solid rgba(212,178,140,0.1)' }}>
      <p className="font-['Syne',sans-serif] text-2xl font-bold tabular-nums" style={{ color: '#f4ece0' }}>
        {value}
      </p>
      <p className="mt-1 text-sm leading-snug" style={{ color: '#a08060' }}>
        {label}
      </p>
    </div>
  )
}
