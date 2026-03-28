import { render, screen } from '@testing-library/react'
import { DealCard } from './DealCard'

const mockDeal = {
  id: '1',
  dealName: 'Times Square Renovation',
  companyName: 'Broadway Capital Group',
  value: 480000,
  probability: 65,
  stage: 'Proposal Sent' as const,
  daysInStage: 8,
}

test('renders company name', () => {
  render(<DealCard id={mockDeal.id} deal={mockDeal} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('Broadway Capital Group')).toBeInTheDocument()
})

test('renders deal name', () => {
  render(<DealCard id={mockDeal.id} deal={mockDeal} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('Times Square Renovation')).toBeInTheDocument()
})

test('renders formatted value', () => {
  render(<DealCard id={mockDeal.id} deal={mockDeal} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('$480,000')).toBeInTheDocument()
})

test('renders probability', () => {
  render(<DealCard id={mockDeal.id} deal={mockDeal} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('65%')).toBeInTheDocument()
})

test('applies selected border when selected', () => {
  const { container } = render(<DealCard id={mockDeal.id} deal={mockDeal} isSelected={true} onClick={() => {}} />)
  const el = container.firstChild as HTMLElement
  expect(el.style.border).toBe('1px solid var(--color-accent)')
})
