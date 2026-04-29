import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'
import BatchPage from './pages/BatchPage'
import AboutPage from './pages/AboutPage'

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent">
      <div className="relative z-10">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/analyze" element={<UploadPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/batch" element={<BatchPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
