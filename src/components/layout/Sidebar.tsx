import { useLocation, useNavigate } from 'react-router-dom'
import { NAV_SECTIONS, SETTINGS_ROUTE } from '../../config/routes'

// SVG icon components keyed by icon id from routes config
const iconMap: Record<string, (props: { className?: string }) => JSX.Element> = {
  grid: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  person: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  building: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </svg>
  ),
  'chart-bar': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="18" rx="1" /><rect x="10" y="3" width="5" height="12" rx="1" /><rect x="17" y="3" width="5" height="15" rx="1" />
    </svg>
  ),
  list: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  folder: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /><path d="M8 10v4" /><path d="M12 10v2" /><path d="M16 10v6" />
    </svg>
  ),
  'doc-check': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><polyline points="9 13 11 15 15 11" />
    </svg>
  ),
  clock: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  checkbox: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  bubble: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  inbox: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  lock: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  settings: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
}

function NavButton({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string
  icon: string
  isActive: boolean
  onClick: () => void
}) {
  const Icon = iconMap[icon]
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center transition-[background] duration-150 ${
        isActive
          ? ''
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
      }`}
      style={{
        fontSize: '13px',
        fontWeight: 500,
        minHeight: '28px',
        borderRadius: '8px',
        margin: '0 8px',
        padding: '6px 14px',
        gap: '8px',
        width: 'calc(100% - 16px)',
        ...(isActive ? { background: 'var(--color-accent)', color: 'var(--text-on-accent)' } : {}),
      }}
    >
      {Icon && (
        <span
          className="flex-shrink-0"
          style={{
            width: '18px',
            height: '18px',
            color: isActive ? 'var(--text-on-accent)' : 'var(--color-accent)',
            display: 'flex',
          }}
        >
          <Icon className="w-[18px] h-[18px]" />
        </span>
      )}
      <span className="truncate">{label}</span>
    </button>
  )
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  function isItemActive(path: string) {
    if (path === '/') return location.pathname === '/'
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="h-full flex-shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--separator)] flex flex-col overflow-hidden" style={{ width: '220px' }}>
      {/* Titlebar clearance for macOS traffic lights */}
      <div className="flex-shrink-0 window-drag" style={{ height: '52px' }} />

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-3' : ''}>
            {/* Section label */}
            {section.label && (
              <div
                className="select-none"
                style={{
                  padding: '16px 22px 4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-secondary)',
                }}
              >
                {section.label}
              </div>
            )}

            {/* Section items */}
            <div className="flex flex-col gap-0.5">
              {section.items.map(item => (
                <NavButton
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  isActive={isItemActive(item.path)}
                  onClick={() => navigate(item.path)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings — pinned to bottom */}
      <div className="flex-shrink-0 border-t border-[var(--separator)] py-2">
        <NavButton
          label={SETTINGS_ROUTE.label}
          icon={SETTINGS_ROUTE.icon}
          isActive={location.pathname === SETTINGS_ROUTE.path}
          onClick={() => navigate(SETTINGS_ROUTE.path)}
        />
      </div>
    </div>
  )
}
