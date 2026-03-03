import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

test('renders children', () => {
  render(<Badge>Proposal Sent</Badge>)
  expect(screen.getByText('Proposal Sent')).toBeInTheDocument()
})

test('applies proposal variant class', () => {
  const { container } = render(<Badge variant="proposal">Proposal Sent</Badge>)
  expect(container.firstChild).toHaveClass('badge--proposal')
})

test('applies default variant when no variant given', () => {
  const { container } = render(<Badge>No variant</Badge>)
  expect(container.firstChild).toHaveClass('badge--default')
})
