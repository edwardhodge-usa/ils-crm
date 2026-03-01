import { render, screen } from '@testing-library/react'
import { ContactRow } from './ContactRow'
import type { ContactListItem } from '@/types'

const mockContact: ContactListItem = {
  id: '1',
  firstName: 'Eric',
  lastName: 'Gutierrez',
  jobTitle: 'SVP Production',
  companyName: 'Broadway Capital',
  qualityRating: 3,
  specialtyNames: ['Broadway Producer'],
  specialtyColors: ['indigo'],
  daysSinceContact: 8,
}

test('renders name', () => {
  render(<ContactRow contact={mockContact} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('Eric Gutierrez')).toBeInTheDocument()
})

test('renders title and company', () => {
  render(<ContactRow contact={mockContact} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText(/SVP Production/)).toBeInTheDocument()
  expect(screen.getByText(/Broadway Capital/)).toBeInTheDocument()
})

test('renders specialty tag', () => {
  render(<ContactRow contact={mockContact} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('Broadway Producer')).toBeInTheDocument()
})

test('renders days since contact badge', () => {
  render(<ContactRow contact={mockContact} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('8d')).toBeInTheDocument()
})

test('applies selected styles when isSelected is true', () => {
  const { container } = render(
    <ContactRow contact={mockContact} isSelected={true} onClick={() => {}} />
  )
  expect(container.firstChild).toHaveClass('contact-row--selected')
})
