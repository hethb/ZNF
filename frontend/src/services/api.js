import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
})

export const analyzeImage = async (
  file,
  { uncertaintyStdThreshold = 0.14, entropyNormThreshold = 0.62, mcRuns = 5 } = {}
) => {
  const form = new FormData()
  form.append('image', file)
  form.append('uncertainty_std_threshold', String(uncertaintyStdThreshold))
  form.append('entropy_norm_threshold', String(entropyNormThreshold))
  form.append('mc_runs', String(mcRuns))
  const { data } = await api.post('/analyze', form)
  return data
}

export const analyzeBatch = async (
  file,
  { uncertaintyStdThreshold = 0.14, entropyNormThreshold = 0.62, mcRuns = 5 } = {}
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
  { caseId = '', uncertaintyStdThreshold = 0.14, entropyNormThreshold = 0.62, mcRuns = 5 } = {}
) => {
  const form = new FormData()
  for (const f of files) {
    form.append('files', f)
  }
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
  { uncertaintyStdThreshold = 0.14, entropyNormThreshold = 0.62, mcRuns = 5 } = {}
) => {
  const form = new FormData()
  form.append('zip_file', zipFile)
  if (labelsCsvFile) {
    form.append('labels_csv', labelsCsvFile)
  }
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
