import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

const NEW_ROUTES: Record<string, string> = {
  '/contacts': '/contacts/new',
  '/companies': '/companies/new',
  '/pipeline': '/pipeline/new',
  '/tasks': '/tasks/new',
  '/proposals': '/proposals/new',
  '/projects': '/projects/new',
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+N — new record (context-aware)
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
    <div className="flex h-screen bg-[#1C1C1E] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
