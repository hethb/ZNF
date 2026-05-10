import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
})

let authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('pathiq.access_token') : null

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

export function setAuthToken(token) {
  authToken = token || null
  if (typeof localStorage === 'undefined') return
  if (token) localStorage.setItem('pathiq.access_token', token)
  else localStorage.removeItem('pathiq.access_token')
}

export const analyzeImage = async (
  file,
  {
    uncertaintyStdThreshold = 0.14,
    entropyNormThreshold = 0.62,
    mcRuns = 3,
    includeGradcam = true
  } = {}
) => {
  const form = new FormData()
  form.append('image', file)
  form.append('uncertainty_std_threshold', String(uncertaintyStdThreshold))
  form.append('entropy_norm_threshold', String(entropyNormThreshold))
  form.append('mc_runs', String(mcRuns))
  form.append('include_gradcam', includeGradcam ? 'true' : 'false')
  const { data } = await api.post('/analyze', form)
  return data
}

export const analyzeBatch = async (
  file,
  { uncertaintyStdThreshold = 0.14, entropyNormThreshold = 0.62, mcRuns = 3 } = {}
) => {
  const form = new FormData()
  form.append('zip_file', file)
  form.append('uncertainty_std_threshold', String(uncertaintyStdThreshold))
  form.append('entropy_norm_threshold', String(entropyNormThreshold))
  form.append('mc_runs', String(mcRuns))
  const { data } = await api.post('/batch', form)
  return data
}

export const analyzeCase = async (
  files,
  { caseId = '', uncertaintyStdThreshold = 0.14, entropyNormThreshold = 0.62, mcRuns = 3 } = {}
) => {
  const form = new FormData()
  for (const f of files) form.append('files', f)
  form.append('case_id', caseId)
  form.append('uncertainty_std_threshold', String(uncertaintyStdThreshold))
  form.append('entropy_norm_threshold', String(entropyNormThreshold))
  form.append('mc_runs', String(mcRuns))
  const { data } = await api.post('/case', form)
  return data
}

export const runBenchmark = async (
  zipFile,
  labelsCsvFile,
  { uncertaintyStdThreshold = 0.14, entropyNormThreshold = 0.62, mcRuns = 3 } = {}
) => {
  const form = new FormData()
  form.append('zip_file', zipFile)
  if (labelsCsvFile) form.append('labels_csv', labelsCsvFile)
  form.append('uncertainty_std_threshold', String(uncertaintyStdThreshold))
  form.append('entropy_norm_threshold', String(entropyNormThreshold))
  form.append('mc_runs', String(mcRuns))
  const { data } = await api.post('/benchmark', form)
  return data
}

export const health = async () => {
  const { data } = await api.get('/health')
  return data
}

export const submitFeedback = async (payload) => {
  const { data } = await api.post('/feedback', payload)
  return data
}

export const runWorkflowAnalysis = async ({ caseId, files, includeGradcam = true }) => {
  if (!files?.length) return null

  if (files.length === 1) {
    const single = await analyzeImage(files[0], { includeGradcam, mcRuns: 3 })
    return { mode: 'single', result: single }
  }

  const group = await analyzeCase(files, { caseId, mcRuns: 3 })
  return { mode: 'multi', result: group }
}

/** --- Workflow API (JWT) --- */

export const workflowLogin = async (username, password) => {
  const { data } = await api.post('/workflow/auth/login', { username, password })
  return data
}

export const workflowSignup = async ({ username, password, displayName, role }) => {
  const { data } = await api.post('/workflow/auth/signup', {
    username,
    password,
    displayName,
    role
  })
  return data
}

export const workflowAuthConfig = async () => {
  const { data } = await api.get('/workflow/auth/config')
  return data
}

export const workflowMe = async () => {
  const { data } = await api.get('/workflow/auth/me')
  return data
}

export const workflowMyStats = async () => {
  const { data } = await api.get('/workflow/me/stats')
  return data
}

export const workflowRbacRoutes = async () => {
  const { data } = await api.get('/workflow/rbac/routes')
  return data
}

export const listWorkflowCases = async () => {
  const { data } = await api.get('/workflow/cases')
  return data
}

export const upsertWorkflowCase = async (caseObj) => {
  const { data } = await api.post('/workflow/cases', { case: caseObj })
  return data
}

export const patchWorkflowCase = async (caseId, partial) => {
  const { data } = await api.patch(`/workflow/cases/${encodeURIComponent(caseId)}`, { case: partial })
  return data
}

export const deleteWorkflowCase = async (caseId) => {
  const { data } = await api.delete(`/workflow/cases/${encodeURIComponent(caseId)}`)
  return data
}

export const downloadWorkflowPdf = async ({ case: caseObj, labName, template }) => {
  const { data } = await api.post(
    '/workflow/reports/pdf',
    { case: caseObj, lab_name: labName, template },
    { responseType: 'blob' }
  )
  return data
}

export const downloadComplianceAuditCsv = async () => {
  const { data } = await api.get('/workflow/compliance/audit-log.csv', { responseType: 'blob' })
  return data
}
