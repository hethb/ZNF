import { Navigate, Route, Routes } from 'react-router-dom'
import { AppStateProvider, useAppState } from './context/AppStateContext'
import { CaseProvider } from './context/CaseContext'
import Sidebar from './components/Sidebar'
import RoleGate from './components/RoleGate'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import CaseReviewPage from './pages/CaseReviewPage'
import ReportsPage from './pages/ReportsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ValidationPage from './pages/ValidationPage'
import SettingsPage from './pages/SettingsPage'

function ProtectedLayout() {
  const { user } = useAppState()

  if (!user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">
        <RoleGate>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/review-queue" element={<DashboardPage reviewQueueOnly />} />
            <Route path="/cases/:id" element={<CaseReviewPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/validation" element={<ValidationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </RoleGate>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      <CaseProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </CaseProvider>
    </AppStateProvider>
  )
}
