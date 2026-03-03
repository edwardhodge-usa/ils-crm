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
  render(<DealCard deal={mockDeal} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('Broadway Capital Group')).toBeInTheDocument()
})

test('renders deal name', () => {
  render(<DealCard deal={mockDeal} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('Times Square Renovation')).toBeInTheDocument()
})

test('renders formatted value', () => {
  render(<DealCard deal={mockDeal} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('$480,000')).toBeInTheDocument()
})

test('renders probability', () => {
  render(<DealCard deal={mockDeal} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('65%')).toBeInTheDocument()
})

test('applies selected class when selected', () => {
  const { container } = render(<DealCard deal={mockDeal} isSelected={true} onClick={() => {}} />)
  expect(container.firstChild).toHaveClass('deal-card--selected')
})
