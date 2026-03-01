import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { NEW_ROUTES } from '../../config/routes'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()

  // Cmd+N — new record (context-aware)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'n' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const basePath = '/' + location.pathname.split('/')[1]
        const newRoute = NEW_ROUTES[basePath]
        if (newRoute) {
          e.preventDefault()
          navigate(newRoute)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [location.pathname, navigate])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-window)]">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
