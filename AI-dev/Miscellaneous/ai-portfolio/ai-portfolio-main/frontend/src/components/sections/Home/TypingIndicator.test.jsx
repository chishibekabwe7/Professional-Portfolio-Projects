import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { TypingIndicator } from './TypingIndicator';
import React from 'react';
import '../../../test/mocks';
import { renderWithConfig } from '../../../test/testUtils';

// Mock the Lucide React icons
vi.mock('lucide-react', () => ({
  Bot: () => React.createElement('div', { 'data-testid': 'bot-icon' })
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => (
      <div data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('TypingIndicator', () => {
  it('renders the full typing indicator with avatar when inline=false', () => {
    const { container } = renderWithConfig(<TypingIndicator />);
    
    // Check that the component renders
    expect(screen.getByTestId('ai-typing-indicator')).toBeInTheDocument();
    
    // Check that the bot icon is displayed
    expect(screen.getByTestId('bot-icon')).toBeInTheDocument();
    
    // Check for the animation dots
    const animationDots = container.querySelectorAll('.animate-bounce');
    expect(animationDots.length).toBe(3);
    
    // Check for the purple styling on the dots
    const purpleDots = container.querySelectorAll('.bg-purple-400');
    expect(purpleDots.length).toBe(3);
    
    // Check for the message bubble styling
    const messageBubble = container.querySelector('.bg-gray-800\\/80');
    expect(messageBubble).toBeInTheDocument();
  });
  
  it('renders just the dots when inline=true', () => {
    const { container } = renderWithConfig(<TypingIndicator inline />);
    
    // Check that the inline component renders
    expect(screen.getByTestId('typing-indicator-inline')).toBeInTheDocument();
    
    // Check that the bot icon is NOT displayed
    expect(screen.queryByTestId('bot-icon')).not.toBeInTheDocument();
    
    // Check for the animation dots
    const animationDots = container.querySelectorAll('.animate-bounce');
    expect(animationDots.length).toBe(3);
    
    // Check for the white styling on the dots (inline uses white)
    const whiteDots = container.querySelectorAll('.bg-white');
    expect(whiteDots.length).toBe(3);
    
    // Check that the message bubble is NOT present
    const messageBubble = container.querySelector('.bg-gray-800\\/80');
    expect(messageBubble).not.toBeInTheDocument();
  });
  
  it('applies correct animation delays to the dots', () => {
    const { container } = renderWithConfig(<TypingIndicator />);
    
    // Get all the dots
    const dots = container.querySelectorAll('.animate-bounce');
    
    // Check that each dot has a different animation delay
    expect(dots[0].style.animationDelay).toBe('0s');
    expect(dots[1].style.animationDelay).toBe('0.15s');
    expect(dots[2].style.animationDelay).toBe('0.3s');
  });
}); 