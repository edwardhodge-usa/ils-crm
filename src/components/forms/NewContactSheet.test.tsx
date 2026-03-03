import { render, screen } from '@testing-library/react'
import { NewContactSheet } from './NewContactSheet'

test('renders all required fields', () => {
  render(<NewContactSheet isOpen onClose={() => {}} onSave={() => Promise.resolve()} />)
  expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/categorization/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/event.*where/i)).toBeInTheDocument()
})
