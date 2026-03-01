function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface AvatarProps {
  name: string
  size?: number
}

export function Avatar({ name, size = 28 }: AvatarProps) {
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className="rounded-full bg-[var(--color-accent-translucent)] text-[var(--color-accent)] font-semibold flex items-center justify-center flex-shrink-0 select-none"
    >
      {getInitials(name)}
    </div>
  )
}
