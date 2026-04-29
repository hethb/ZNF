import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
})

export const analyzeImage = async (file) => {
  const form = new FormData()
  form.append('image', file)
  const { data } = await api.post('/analyze', form)
  return data
}

export const analyzeBatch = async (file) => {
  const form = new FormData()
  form.append('zip_file', file)
  const { data } = await api.post('/batch', form)
  return data
}

export const health = async () => {
  const { data } = await api.get('/health')
  return data
}
