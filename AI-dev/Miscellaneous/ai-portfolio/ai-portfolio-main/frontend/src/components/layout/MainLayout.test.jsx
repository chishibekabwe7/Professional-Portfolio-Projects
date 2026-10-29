import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MainLayout } from './MainLayout';
import React from 'react';
import '../../test/mocks';
import { renderWithConfig } from '../../test/testUtils';

// Mock the NavBar component
vi.mock('./NavBar', () => ({
  NavBar: () => <div data-testid="navbar-mock">Navbar Mock</div>
}));

describe('MainLayout', () => {
  it('renders the NavBar component', () => {
    renderWithConfig(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );
    
    expect(screen.getByTestId('navbar-mock')).toBeInTheDocument();
  });
  
  it('renders the children content', () => {
    renderWithConfig(
      <MainLayout>
        <div data-testid="test-content">Test Content</div>
      </MainLayout>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
  
  it('applies the correct styling classes', () => {
    renderWithConfig(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );
    
    // Check for the main container with the correct classes
    const mainContainer = screen.getByText('Test Content').closest('.min-h-screen');
    expect(mainContainer).toHaveClass('min-h-screen');
    expect(mainContainer).toHaveClass('bg-black');
    expect(mainContainer).toHaveClass('text-white');
    
    // Check for the main content area
    const mainContent = screen.getByText('Test Content').closest('main');
    expect(mainContent).toHaveClass('pt-24');
    expect(mainContent).toHaveClass('px-6');
    expect(mainContent).toHaveClass('max-w-7xl');
    expect(mainContent).toHaveClass('mx-auto');
  });
}); 