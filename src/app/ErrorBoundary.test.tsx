import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('chunk failed');
}

test('a render error shows a recovery message with a reload button instead of a blank page', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
  expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
});
