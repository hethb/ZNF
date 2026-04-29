import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
})

export const analyzeImage = async (
  file,
  { uncertaintyStdThreshold = 0.14, entropyNormThreshold = 0.62 } = {}
) => {
  const form = new FormData()
  form.append('image', file)
  form.append('uncertainty_std_threshold', String(uncertaintyStdThreshold))
  form.append('entropy_norm_threshold', String(entropyNormThreshold))
  const { data } = await api.post('/analyze', form)
  return data
}

export const analyzeBatch = async (
  file,
  { uncertaintyStdThreshold = 0.14, entropyNormThreshold = 0.62 } = {}
) => {
  const form = new FormData()
  form.append('zip_file', file)
  form.append('uncertainty_std_threshold', String(uncertaintyStdThreshold))
  form.append('entropy_norm_threshold', String(entropyNormThreshold))
  const { data } = await api.post('/batch', form)
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
