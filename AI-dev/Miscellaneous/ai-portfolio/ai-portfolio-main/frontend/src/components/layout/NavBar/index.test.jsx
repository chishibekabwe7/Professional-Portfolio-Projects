import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { NavBar } from './index';
import React from 'react';
import '../../../test/mocks';
import { renderWithRouterAndConfig } from '../../../test/testUtils';

// Mock the child components
vi.mock('./DesktopNav', () => ({
  DesktopNav: () => <div data-testid="desktop-nav-mock">Desktop Nav Mock</div>
}));

vi.mock('./MobileNav', () => ({
  MobileNav: ({ isMenuOpen, setIsMenuOpen }) => (
    <div data-testid="mobile-nav-mock">
      Mobile Nav Mock
      <button 
        data-testid="toggle-menu-button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        Toggle Menu
      </button>
      <div data-testid="menu-state">{isMenuOpen ? 'Open' : 'Closed'}</div>
    </div>
  )
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: ({ to, children, className }) => (
    <a href={to} className={className} data-testid="router-link">
      {children}
    </a>
  )
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Terminal: () => <div data-testid="terminal-icon">Terminal Icon</div>,
  Menu: () => <div data-testid="menu-icon">Menu Icon</div>,
  X: () => <div data-testid="x-icon">X Icon</div>
}));

describe('NavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the logo and site name', () => {
    renderWithRouterAndConfig(<NavBar />);
    
    expect(screen.getByTestId('terminal-icon')).toBeInTheDocument();
    expect(screen.getByText('Alon.dev')).toBeInTheDocument();
  });
  
  it('renders the desktop navigation', () => {
    renderWithRouterAndConfig(<NavBar />);
    
    expect(screen.getByTestId('desktop-nav-mock')).toBeInTheDocument();
  });
  
  it('renders the mobile navigation', () => {
    renderWithRouterAndConfig(<NavBar />);
    
    expect(screen.getByTestId('mobile-nav-mock')).toBeInTheDocument();
  });
  
  it('toggles the mobile menu when the menu button is clicked', () => {
    renderWithRouterAndConfig(<NavBar />);
    
    // Initially the menu should be closed
    expect(screen.getByTestId('menu-state')).toHaveTextContent('Closed');
    
    // Click the menu button
    const menuButton = screen.getByRole('button', { name: /toggle menu/i });
    fireEvent.click(menuButton);
    
    // Now the menu should be open
    expect(screen.getByTestId('menu-state')).toHaveTextContent('Open');
    
    // Click the menu button again
    fireEvent.click(menuButton);
    
    // Now the menu should be closed again
    expect(screen.getByTestId('menu-state')).toHaveTextContent('Closed');
  });
  
  it('renders the menu icon when menu is closed', () => {
    renderWithRouterAndConfig(<NavBar />);
    
    // Initially the menu should be closed and the menu icon should be visible
    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
  });
  
  it('has a link to the home page', () => {
    renderWithRouterAndConfig(<NavBar />);
    
    const homeLink = screen.getByTestId('router-link');
    expect(homeLink).toHaveAttribute('href', '/');
  });
}); 