export function confidenceLabel(confidence) {
  if (confidence >= 90) return 'High Confidence'
  if (confidence >= 80) return 'Moderate Confidence'
  return 'Needs Review'
}

export default function ConfidenceBadge({ confidence }) {
  const label = confidenceLabel(confidence)
  const cls =
    label === 'High Confidence'
      ? 'badge-conf-high'
      : label === 'Moderate Confidence'
        ? 'badge-conf-mod'
        : 'badge-conf-low'
  return (
    <span className={`badge ${cls}`}>
      {label} ({Math.round(confidence)}%)
    </span>
  )
}
