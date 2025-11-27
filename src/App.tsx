import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from 'sonner'
import ProjectList from './pages/ProjectList'
import ProjectDetail from './pages/ProjectDetail'
import AccessGate from './components/AccessGate'
import { useAccessControl } from './hooks/useAccessControl'

export default function App() {
  const { isAuthenticated, isLoading, grantAccess } = useAccessControl()

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // 如果未通过验证，显示访问密码页面
  if (!isAuthenticated) {
    return <AccessGate onAccessGranted={grantAccess} />
  }

  // 已通过验证，显示正常的应用内容
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<ProjectList />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          {/* 重定向旧的项目ID到首页 */}
          <Route path="/projects/demo-1" element={<Navigate to="/" replace />} />
          <Route path="/projects/demo-2" element={<Navigate to="/" replace />} />
          <Route path="/projects/f47ac10b-58cc-4372-a567-0e02b2c3d479" element={<Navigate to="/" replace />} />
          <Route path="/projects/1764147489577" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </>
  )
}
