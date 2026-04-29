/**
 * Score badge — dark-themed colored chips for IHC intensity scores 0–3.
 * All text is light-on-dark for correct contrast.
 */
const configs = {
  0: {
    bg: 'rgba(100,116,139,0.2)',
    border: 'rgba(100,116,139,0.35)',
    color: '#cbd5e1',
    label: 'Negative'
  },
  1: {
    bg: 'rgba(234,179,8,0.15)',
    border: 'rgba(234,179,8,0.35)',
    color: '#fde68a',
    label: 'Weak'
  },
  2: {
    bg: 'rgba(249,115,22,0.15)',
    border: 'rgba(249,115,22,0.35)',
    color: '#fdba74',
    label: 'Moderate'
  },
  3: {
    bg: 'rgba(239,68,68,0.18)',
    border: 'rgba(239,68,68,0.4)',
    color: '#fca5a5',
    label: 'Strong'
  }
}

export default function ScoreBadge({ score, label }) {
  if (score === null || score === undefined) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
        style={{
          background: 'rgba(100,116,139,0.15)',
          border: '1px solid rgba(100,116,139,0.3)',
          color: '#94a3b8'
        }}
      >
        Not Scored
      </div>
    )
  }

  const cfg = configs[score] || configs[0]
  const displayLabel = label || cfg.label

  return (
    <div
      className="inline-flex items-center gap-3 rounded-lg px-4 py-2.5"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 20px ${cfg.bg}`
      }}
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }}
      />
      <span className="text-xl font-bold" style={{ color: cfg.color }}>
        {displayLabel}
      </span>
      <span
        className="rounded px-1.5 py-0.5 text-xs font-semibold"
        style={{
          background: 'rgba(255,255,255,0.08)',
          color: cfg.color,
          border: `1px solid ${cfg.border}`
        }}
      >
        {score}+
      </span>
    </div>
  )
}
