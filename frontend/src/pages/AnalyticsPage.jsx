import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts'
import { useCases } from '../context/CaseContext'
import MetricCard from '../components/MetricCard'

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

const GRID = 'rgba(232, 220, 200, 0.08)'
const AXIS = '#7a7268'
const PIE_COLORS = ['#d46b3b', '#c4875a', '#6b8f71']
const LINE_COLOR = '#d4a574'
const BAR_SCORE = '#c45c2a'
const BAR_FLAG = '#d4a574'
const BAR_REVIEWER = '#8b7355'

export default function AnalyticsPage() {
  const { cases } = useCases()

  const stats = useMemo(() => {
    const reviewed = cases.filter((item) => item.finalReview)
    const accepted = reviewed.filter((item) => item.finalReview.aiAccepted).length
    const overrides = reviewed.length - accepted
    const manualRequired = cases.filter((item) => item.status === 'Needs Review').length

    const totalFlags = cases.flatMap((item) => item.aiAnalysis?.flags || [])
    const byFlag = countBy(totalFlags, (flag) => flag.type)
    const byScore = countBy(cases, (item) => item.finalReview?.finalScore || item.aiAnalysis?.suggestedScore || '0')
    const byReviewer = countBy(cases, (item) => item.assignedReviewer || 'Unassigned')
    const avgConfidence = Math.round(cases.reduce((sum, item) => sum + (item.aiAnalysis?.confidence || 0), 0) / Math.max(cases.length, 1))

    return { reviewed, accepted, overrides, manualRequired, byFlag, byScore, byReviewer, avgConfidence }
  }, [cases])

  const agreementRate = stats.reviewed.length ? Math.round((stats.accepted / stats.reviewed.length) * 100) : 0

  const scoreData = ['0', '1+', '2+', '3+'].map((score) => ({ score, count: stats.byScore[score] || 0 }))
  const flagData = Object.entries(stats.byFlag).map(([name, count]) => ({ name, count }))
  const reviewerData = Object.entries(stats.byReviewer).map(([reviewer, count]) => ({ reviewer, count }))
  const agreementData = [
    { name: 'Accepted AI score', value: stats.accepted },
    { name: 'Human override', value: stats.overrides },
    { name: 'Manual review required', value: stats.manualRequired }
  ]

  const volumeData = [
    { day: 'Mon', cases: 8 },
    { day: 'Tue', cases: 11 },
    { day: 'Wed', cases: 14 },
    { day: 'Thu', cases: 9 },
    { day: 'Fri', cases: 16 }
  ]

  const chartCard = (title, children) => (
    <div className="card">
      <div className="micro-label" style={{ marginBottom: '0.35rem' }}>
        Analytics
      </div>
      <h3 style={{ fontWeight: 700, margin: '0 0 0.65rem', fontSize: '1rem', color: 'var(--cream)' }}>{title}</h3>
      {children}
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: '1.15rem' }}>
      <header>
        <div className="micro-label">Quality operations</div>
        <h1 className="page-title">QA analytics</h1>
        <p className="page-subtitle">Operational metrics for reviewer consistency, throughput, and control-chart signals.</p>
      </header>

      <section className="grid-4">
        <MetricCard title="Total cases analyzed" value={cases.length} />
        <MetricCard title="Average review time" value="7.4 min" />
        <MetricCard title="Estimated time saved" value="31 min / case" />
        <MetricCard title="AI–human agreement" value={`${agreementRate}%`} />
        <MetricCard title="Overrides" value={stats.overrides} />
        <MetricCard
          title="Flagged case rate"
          value={`${Math.round((cases.filter((c) => (c.aiAnalysis?.flags?.length || 0) > 0).length / Math.max(cases.length, 1)) * 100)}%`}
        />
        <MetricCard title="Average confidence" value={`${stats.avgConfidence}%`} />
        <MetricCard title="Top override driver" value="Borderline intensity" hint="From pilot annotations" />
      </section>

      <section className="grid-2">
        {chartCard(
          'Case volume over time',
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="day" stroke={AXIS} tick={{ fill: '#a89f94', fontSize: 12 }} />
                <YAxis allowDecimals={false} stroke={AXIS} tick={{ fill: '#a89f94', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#161412', border: '1px solid rgba(212,165,116,0.2)' }} />
                <Line type="monotone" dataKey="cases" stroke={LINE_COLOR} strokeWidth={2} dot={{ fill: LINE_COLOR, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartCard(
          'Score distribution',
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="score" stroke={AXIS} tick={{ fill: '#a89f94', fontSize: 12 }} />
                <YAxis allowDecimals={false} stroke={AXIS} tick={{ fill: '#a89f94', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#161412', border: '1px solid rgba(212,165,116,0.2)' }} />
                <Bar dataKey="count" fill={BAR_SCORE} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="grid-2">
        {chartCard(
          'AI vs human agreement',
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={agreementData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                  {agreementData.map((entry, idx) => (
                    <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#161412', border: '1px solid rgba(212,165,116,0.2)' }} />
                <Legend wrapperStyle={{ color: '#a89f94', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartCard(
          'Flags by type',
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={flagData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="name" interval={0} angle={-12} textAnchor="end" height={70} stroke={AXIS} tick={{ fill: '#a89f94', fontSize: 11 }} />
                <YAxis allowDecimals={false} stroke={AXIS} tick={{ fill: '#a89f94', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#161412', border: '1px solid rgba(212,165,116,0.2)' }} />
                <Bar dataKey="count" fill={BAR_FLAG} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {chartCard(
        'Reviewer variability',
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={reviewerData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis type="number" allowDecimals={false} stroke={AXIS} tick={{ fill: '#a89f94', fontSize: 12 }} />
              <YAxis type="category" dataKey="reviewer" width={120} stroke={AXIS} tick={{ fill: '#a89f94', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#161412', border: '1px solid rgba(212,165,116,0.2)' }} />
              <Bar dataKey="count" fill={BAR_REVIEWER} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
