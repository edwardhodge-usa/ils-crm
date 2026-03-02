interface RatingDotsProps {
  value: number
  max?: number
  size?: number
}

export function RatingDots({ value, max = 5, size = 6 }: RatingDotsProps) {
  return (
    <div className="flex gap-0.5 items-center flex-shrink-0" aria-label={`Rating: ${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          style={{ width: size, height: size }}
          className={`rounded-full flex-shrink-0 ${
            i < value
              ? 'bg-[var(--color-accent)]'
              : 'bg-[var(--separator-strong)]'
          }`}
        />
      ))}
    </div>
  )
}
