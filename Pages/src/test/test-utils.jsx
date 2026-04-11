import { render } from '@testing-library/react';
import { ThemeProvider } from '../contexts/ThemeContext';

const customRender = (ui, options = {}) => render(ui, {
  wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
  ...options,
});

export * from '@testing-library/react';
export { customRender as render };