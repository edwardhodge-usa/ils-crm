import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

test('renders children', () => {
  render(<Badge>Proposal Sent</Badge>)
  expect(screen.getByText('Proposal Sent')).toBeInTheDocument()
})

test('applies proposal variant styles', () => {
  const { container } = render(<Badge variant="proposal">Proposal Sent</Badge>)
  expect(container.firstChild).toHaveStyle({
    color: 'var(--stage-proposal)',
    background: 'var(--stage-proposal-bg)',
  })
})

test('applies default variant styles when no variant given', () => {
  const { container } = render(<Badge>No variant</Badge>)
  expect(container.firstChild).toHaveStyle({
    color: 'var(--text-secondary)',
    background: 'var(--bg-tertiary)',
  })
})
