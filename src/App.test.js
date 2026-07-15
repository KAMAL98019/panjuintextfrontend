import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page by default when logged out', () => {
  render(<App />);
  const heading = screen.getByText(/Super Admin Login/i);
  expect(heading).toBeInTheDocument();
});
