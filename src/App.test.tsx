import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from './App';

test('renders the Bramble heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /bramble/i })).toBeInTheDocument();
});
