import { useState } from 'react'
import { useAppState } from '../context/AppStateContext'
import { downloadComplianceAuditCsv } from '../services/api'

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function SettingsPage() {
  const { settings, updateSettings, accessToken, authMode } = useAppState()
  const [complianceMsg, setComplianceMsg] = useState('')

  const onExportCompliance = async () => {
    setComplianceMsg('')
    if (authMode !== 'server' || !accessToken) {
      setComplianceMsg('Sign in with the API to download the server compliance audit log.')
      return
    }
    try {
      const blob = await downloadComplianceAuditCsv()
      downloadBlob('pathiq_compliance_audit.csv', blob)
      setComplianceMsg('Download started.')
    } catch {
      setComplianceMsg('Could not download audit log.')
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1.15rem' }}>
      <header>
        <div className="micro-label">Administration</div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Roles, thresholds, model behavior, and data controls for your pilot deployment.</p>
      </header>

      <section className="grid-2">
        <div className="card" style={{ display: 'grid', gap: '0.7rem' }}>
          <div>
            <div className="micro-label">Access</div>
            <h3 style={{ fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cream)' }}>Role management</h3>
          </div>
          <p className="page-subtitle" style={{ margin: 0, fontSize: '0.86rem' }}>
            Server-seeded demo users (SQLite): <code>admin</code>/<code>admin123</code>, <code>pathologist</code>/<code>demo123</code>,{' '}
            <code>director</code>/<code>demo123</code>, <code>tech</code>/<code>demo123</code>, <code>research</code>/<code>demo123</code>.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Scope</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>admin</td>
                  <td>Admin</td>
                  <td>Full access</td>
                </tr>
                <tr>
                  <td>director</td>
                  <td>Lab director</td>
                  <td>QA + settings</td>
                </tr>
                <tr>
                  <td>pathologist</td>
                  <td>Pathologist</td>
                  <td>Review + reports</td>
                </tr>
                <tr>
                  <td>tech</td>
                  <td>Technician</td>
                  <td>Upload + queue</td>
                </tr>
                <tr>
                  <td>research</td>
                  <td>Researcher</td>
                  <td>Validation-heavy</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ display: 'grid', gap: '0.7rem' }}>
          <div>
            <div className="micro-label">Laboratory</div>
            <h3 style={{ fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cream)' }}>Lab settings</h3>
          </div>
          <label className="label">Lab name</label>
          <input className="input" value={settings.labName} onChange={(e) => updateSettings({ labName: e.target.value })} />
          <label className="label">Review confidence threshold</label>
          <input
            className="input"
            type="number"
            min={50}
            max={99}
            value={settings.confidenceThreshold}
            onChange={(e) => updateSettings({ confidenceThreshold: Number(e.target.value) || 80 })}
          />
          <label className="label">Report template</label>
          <select className="select" value={settings.reportTemplate} onChange={(e) => updateSettings({ reportTemplate: e.target.value })}>
            <option>Default Clinical Draft</option>
            <option>Validation-Focused Summary</option>
          </select>
        </div>
      </section>

      <section className="grid-2">
        <div className="card" style={{ display: 'grid', gap: '0.7rem' }}>
          <div>
            <div className="micro-label">Inference</div>
            <h3 style={{ fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cream)' }}>Model settings</h3>
          </div>
          <label className="check-row">
            <input type="checkbox" checked={settings.requireManualReview} onChange={(e) => updateSettings({ requireManualReview: e.target.checked })} />
            Require manual review below confidence threshold
          </label>
          <label className="check-row">
            <input type="checkbox" checked={settings.mockModelMode} onChange={(e) => updateSettings({ mockModelMode: e.target.checked })} />
            Enable mock model mode (disable backend analysis)
          </label>
        </div>

        <div className="card" style={{ display: 'grid', gap: '0.7rem' }}>
          <div>
            <div className="micro-label">Compliance</div>
            <h3 style={{ fontWeight: 700, margin: '0.2rem 0 0', color: 'var(--cream)' }}>Data settings</h3>
          </div>
          <label className="check-row">
            <input type="checkbox" checked={settings.anonymizeCaseIds} onChange={(e) => updateSettings({ anonymizeCaseIds: e.target.checked })} />
            Anonymize case IDs in exports
          </label>
          <p className="page-subtitle" style={{ fontSize: '0.85rem', margin: 0 }}>
            Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) are applied on API responses. Production deployments should add TLS termination, WAF, centralized logging, and formal BAA / DPA where applicable.
          </p>
          <label className="label">Data retention (placeholder)</label>
          <select className="select" defaultValue="90d">
            <option value="30d">30 days (demo)</option>
            <option value="90d">90 days (pilot)</option>
            <option value="custom">Custom policy (configure in LIMS)</option>
          </select>
          <button className="btn btn-outline" type="button" onClick={onExportCompliance}>
            Export server compliance audit log (CSV)
          </button>
          {complianceMsg ? <p className="footer-note" style={{ margin: 0 }}>{complianceMsg}</p> : null}
          <button className="btn btn-ghost" type="button">
            Delete case (placeholder)
          </button>
        </div>
      </section>

      <p className="footer-note" style={{ margin: 0 }}>
        PathIQ is intended as a research and workflow-support tool. It is not intended to independently diagnose disease or replace review by a qualified pathologist.
      </p>
    </div>
  )
}
