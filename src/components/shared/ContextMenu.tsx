import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ContextMenuItem {
  label: string
  onClick: () => void
  destructive?: boolean
}

interface ContextMenuProps {
  position: { x: number; y: number } | null
  onClose: () => void
  items: ContextMenuItem[]
}

export function ContextMenu({ position, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!position) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown, true)
    }
  }, [position, onClose])

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!position || !menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const el = menuRef.current

    if (rect.right > window.innerWidth) {
      el.style.left = `${window.innerWidth - rect.width - 4}px`
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${window.innerHeight - rect.height - 4}px`
    }
  }, [position])

  if (!position) return null

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        minWidth: 160,
        background: 'var(--bg-sheet)',
        borderRadius: 6,
        boxShadow: 'var(--shadow-menu)',
        border: '1px solid var(--separator)',
        padding: '4px 0',
        overflow: 'hidden',
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          onClick={() => { item.onClick(); onClose() }}
          className="cursor-default"
          style={{
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 400,
            color: item.destructive ? 'var(--color-red)' : 'var(--text-primary)',
            lineHeight: '28px',
            transition: 'background 100ms, color 100ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = item.destructive
              ? 'var(--color-red)'
              : 'var(--color-accent)'
            e.currentTarget.style.color = 'var(--text-on-accent)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = ''
            e.currentTarget.style.color = item.destructive
              ? 'var(--color-red)'
              : 'var(--text-primary)'
          }}
        >
          {item.label}
        </div>
      ))}
    </div>,
    document.body
  )
}
