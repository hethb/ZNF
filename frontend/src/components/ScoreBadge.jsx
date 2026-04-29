const colors = {
  0: 'bg-gray-100 text-gray-800',
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-orange-100 text-orange-800',
  3: 'bg-red-100 text-red-800'
}

export default function ScoreBadge({ score, label }) {
  if (score === null || score === undefined) {
    return <div className="rounded-none bg-slate-100 px-4 py-2 text-slate-700">Not Scored</div>
  }
  return (
    <div className={`rounded-none px-4 py-2 text-2xl font-bold ${colors[score] || 'bg-slate-100 text-slate-900'}`}>
      {label}
    </div>
  )
}
