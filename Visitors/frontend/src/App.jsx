import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AdminPage from './pages/AdminPage'
import RegisterPage from './pages/RegisterPage'
import ReportsPage from './pages/ReportsPage'
import ScanPage from './pages/ScanPage'
import StatusPage from './pages/StatusPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/register" replace />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="status" element={<StatusPage />} />
        <Route path="status/:id" element={<StatusPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="scan" element={<ScanPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  )
}
