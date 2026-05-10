const STATUS_CLASS = {
  Uploaded: 'badge-status-uploaded',
  'AI Analyzed': 'badge-status-ai',
  'Needs Review': 'badge-status-review',
  Finalized: 'badge-status-final',
  Exported: 'badge-status-exported'
}

export default function StatusBadge({ status }) {
  const cls = STATUS_CLASS[status] || STATUS_CLASS.Uploaded
  return (
    <span className={`badge ${cls}`}>{status}</span>
  )
}
