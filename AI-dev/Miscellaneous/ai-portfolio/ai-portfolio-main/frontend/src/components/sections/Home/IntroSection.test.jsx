import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { IntroSection } from './IntroSection';
import React from 'react';
import '../../../test/mocks';
import { renderWithConfig } from '../../../test/testUtils';

// Mock the Lucide React icons
vi.mock('lucide-react', () => ({
  Brain: () => React.createElement('div', { 'data-testid': 'brain-icon' }),
  BookOpen: () => React.createElement('div', { 'data-testid': 'book-open-icon' }),
  MessageSquareText: () => React.createElement('div', { 'data-testid': 'message-square-text-icon' })
}));

describe('IntroSection', () => {
  it('renders the section with all feature cards', () => {
    renderWithConfig(<IntroSection />);
    
    // Check that all three cards are rendered
    expect(screen.getByText('Years of Growth')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Collection')).toBeInTheDocument();
    expect(screen.getByText('AI Conversations')).toBeInTheDocument();
    
    // Check that all descriptions are rendered
    expect(screen.getByText('Documenting my journey from 2.5 years of therapy')).toBeInTheDocument();
    expect(screen.getByText('My insights from books, podcasts, blogs and social media posts')).toBeInTheDocument();
    expect(screen.getByText('Based on my real experince and content')).toBeInTheDocument();
    
    // Check that all icons are rendered
    expect(screen.getByTestId('brain-icon')).toBeInTheDocument();
    expect(screen.getByTestId('book-open-icon')).toBeInTheDocument();
    expect(screen.getByTestId('message-square-text-icon')).toBeInTheDocument();
  });
  
  it('renders the content section with paragraphs', () => {
    renderWithConfig(<IntroSection />);
    
    // Check that the content paragraphs are rendered
    expect(screen.getByText("Test paragraph")).toBeInTheDocument();
    expect(screen.getByText("Test paragraph 2")).toBeInTheDocument();
  });
}); 