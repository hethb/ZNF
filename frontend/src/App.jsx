import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import CursorGlow from './components/CursorGlow'
import LandingPage from './pages/LandingPage'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'
import BatchPage from './pages/BatchPage'
import CasePage from './pages/CasePage'
import BenchmarkPage from './pages/BenchmarkPage'
import AboutPage from './pages/AboutPage'
import DemoPage from './pages/DemoPage'

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Global mouse-tracking glow — eye candy layer */}
      <CursorGlow />

      {/* Content above cursor glow */}
      <div className="relative z-10">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/analyze" element={<UploadPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/batch" element={<BatchPage />} />
            <Route path="/case" element={<CasePage />} />
            <Route path="/benchmark" element={<BenchmarkPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
