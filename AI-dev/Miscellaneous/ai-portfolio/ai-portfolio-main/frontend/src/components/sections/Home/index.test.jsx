import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { HomeSection } from './index';
import React from 'react';
import '../../../test/mocks';
import { renderWithConfig } from '../../../test/testUtils';

// Mock the child components
vi.mock('./ChatBox', () => ({
  ChatBox: () => React.createElement('div', { 'data-testid': 'chat-box' })
}));

vi.mock('./IntroSection', () => ({
  IntroSection: () => React.createElement('div', { 'data-testid': 'intro-section' })
}));

// Mock the Lucide React icon
vi.mock('lucide-react', () => ({
  Terminal: () => React.createElement('div', { 'data-testid': 'terminal-icon' })
}));

describe('HomeSection', () => {
  it('renders the profile image and name', () => {
    renderWithConfig(<HomeSection />);
    
    // Check that the profile image is rendered
    const profileImage = screen.getByAltText('Test User');
    expect(profileImage).toBeInTheDocument();
    expect(profileImage.tagName).toBe('IMG');
    expect(profileImage).toHaveAttribute('src', '/profile.jpg');
    
    // Check that the name is rendered
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
  
  it('renders the Terminal icon', () => {
    renderWithConfig(<HomeSection />);
    
    // Check that the Terminal icon is rendered
    expect(screen.getByTestId('terminal-icon')).toBeInTheDocument();
  });
  
  it('renders the IntroSection component', () => {
    renderWithConfig(<HomeSection />);
    
    // Check that the IntroSection component is rendered
    expect(screen.getByTestId('intro-section')).toBeInTheDocument();
  });
  
  it('renders the ChatBox component', () => {
    renderWithConfig(<HomeSection />);
    
    // Check that the ChatBox component is rendered
    expect(screen.getByTestId('chat-box')).toBeInTheDocument();
  });
}); 