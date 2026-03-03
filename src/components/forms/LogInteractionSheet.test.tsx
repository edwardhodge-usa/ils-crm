import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogInteractionSheet } from './LogInteractionSheet'

test('shows follow-up fields only when toggle is checked', async () => {
  render(
    <LogInteractionSheet
      isOpen
      onClose={() => {}}
      onSave={() => Promise.resolve()}
    />
  )

  // Follow-up fields should NOT be visible initially
  expect(screen.queryByLabelText(/task name/i)).not.toBeInTheDocument()

  // Check the toggle
  await userEvent.click(screen.getByRole('checkbox', { name: /follow-up/i }))

  // Now follow-up fields should appear
  expect(screen.getByLabelText(/task name/i)).toBeInTheDocument()
})
