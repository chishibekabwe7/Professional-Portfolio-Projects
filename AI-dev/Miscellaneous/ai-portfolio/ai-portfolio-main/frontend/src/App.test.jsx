import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import App from './App';
import React from 'react';
import './test/mocks';
import { renderWithConfig } from './test/testUtils';

// Mock the components
vi.mock('./components/layout/MainLayout', () => ({
  MainLayout: ({ children }) => <div data-testid="main-layout">{children}</div>
}));

vi.mock('./components/sections/Home', () => ({
  HomeSection: () => <div data-testid="home-section">Home Section</div>
}));

vi.mock('./components/sections/About', () => ({
  AboutSection: () => <div data-testid="about-section">About Section</div>
}));

vi.mock('./components/sections/Projects', () => ({
  ProjectsSection: () => <div data-testid="projects-section">Projects Section</div>
}));

vi.mock('./components/sections/Blog', () => ({
  BlogSection: () => <div data-testid="blog-section">Blog Section</div>
}));

// Mock useNavigate for testing routes
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

describe('App', () => {
  it('renders the main layout', () => {
    renderWithConfig(<App />);
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });
  
  it('renders the home section by default', () => {
    renderWithConfig(<App />);
    expect(screen.getByTestId('home-section')).toBeInTheDocument();
  });
  
  // Note: Testing route changes would require more complex setup with MemoryRouter
  // and is typically done in integration tests rather than unit tests
}); 