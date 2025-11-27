import { useState, useEffect } from 'react'

export function useAccessControl() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 检查 localStorage 中是否有访问权限
    const accessGranted = localStorage.getItem('access_granted')
    setIsAuthenticated(accessGranted === 'true')
    setIsLoading(false)
  }, [])

  const grantAccess = () => {
    localStorage.setItem('access_granted', 'true')
    setIsAuthenticated(true)
  }

  const revokeAccess = () => {
    localStorage.removeItem('access_granted')
    setIsAuthenticated(false)
  }

  return {
    isAuthenticated,
    isLoading,
    grantAccess,
    revokeAccess
  }
}