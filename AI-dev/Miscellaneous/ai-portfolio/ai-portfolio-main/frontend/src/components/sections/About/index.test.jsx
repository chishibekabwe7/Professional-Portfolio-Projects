import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { AboutSection } from './index';
import React from 'react';
import '../../../test/mocks';
import { useTypingEffect } from '../../../hooks/useTypingEffect';
import { renderWithConfig } from '../../../test/testUtils';

// Mock the useTypingEffect hook
vi.mock('../../../hooks/useTypingEffect', () => ({
  useTypingEffect: vi.fn((content) => ({
    displayedContent: content ? content.substring(0, 10) : '',
    isTyping: true,
    setIsTyping: vi.fn(),
    setDisplayedContent: vi.fn()
  }))
}));

// Mock fetch
global.fetch = vi.fn();

describe('AboutSection', () => {
  const mockAboutContent = '# About Me\n\nThis is my about page content.';
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Mock successful fetch response
    global.fetch.mockResolvedValue({
      text: vi.fn().mockResolvedValue(mockAboutContent)
    });
    
    // Setup fake timers
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
  });
  
  it('renders the about section with terminal window', () => {
    renderWithConfig(<AboutSection />);
    
    // Check for terminal window elements
    expect(screen.getByText('~/about-me')).toBeInTheDocument();
    expect(screen.getByText('cat about-me.md')).toBeInTheDocument();
  });
  
  it('fetches and displays about content', async () => {
    // Use real timers for async tests
    vi.useRealTimers();
    
    renderWithConfig(<AboutSection />);
    
    // Check that fetch was called with the correct URL
    expect(global.fetch).toHaveBeenCalledWith('/about-me.md');
    
    // Wait for content to be fetched and displayed with a longer timeout
    await waitFor(() => {
      expect(useTypingEffect).toHaveBeenCalled();
    }, { timeout: 10000 });
    
    // Verify the hook was called with the content
    const hookCalls = vi.mocked(useTypingEffect).mock.calls;
    const lastCall = hookCalls[hookCalls.length - 1];
    expect(lastCall[0]).toBe(mockAboutContent);
  }, 10000); // Increase test timeout
  
  it('shows skip button after delay', async () => {
    // Mock useTypingEffect to simulate typing in progress
    vi.mocked(useTypingEffect).mockReturnValue({
      displayedContent: mockAboutContent.substring(0, 10),
      isTyping: true,
      setIsTyping: vi.fn(),
      setDisplayedContent: vi.fn()
    });
    
    renderWithConfig(<AboutSection />);
    
    // Skip button should not be visible initially
    expect(screen.queryByRole('button', { name: /skip typing/i })).not.toBeInTheDocument();
    
    // Advance timers to show skip button
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    
    // Skip button should now be visible
    // Note: We need to use a more flexible query since the button might contain both text and an icon
    const skipButton = screen.getByRole('button', { name: /skip typing/i });
    expect(skipButton).toBeInTheDocument();
  });
  
  it('handles skip button click', async () => {
    // Mock useTypingEffect to simulate typing in progress
    const setIsTypingMock = vi.fn();
    const setDisplayedContentMock = vi.fn();
    
    vi.mocked(useTypingEffect).mockReturnValue({
      displayedContent: mockAboutContent.substring(0, 10),
      isTyping: true,
      setIsTyping: setIsTypingMock,
      setDisplayedContent: setDisplayedContentMock
    });
    
    renderWithConfig(<AboutSection />);
    
    // Advance timers to show skip button
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    
    // Click skip button
    const skipButton = screen.getByRole('button', { name: /skip typing/i });
    skipButton.click();
    
    // Check that setIsTyping and setDisplayedContent were called
    expect(setIsTypingMock).toHaveBeenCalledWith(false);
    expect(setDisplayedContentMock).toHaveBeenCalled();
  });
  
  it('handles fetch error', async () => {
    // Use real timers for async tests
    vi.useRealTimers();
    
    // Mock fetch error
    global.fetch.mockRejectedValue(new Error('Failed to fetch'));
    
    // Spy on console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithConfig(<AboutSection />);
    
    // Wait for error to be logged with a longer timeout
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    }, { timeout: 10000 });
    
    // Check that error content is set
    await waitFor(() => {
      const hookCalls = vi.mocked(useTypingEffect).mock.calls;
      const lastCall = hookCalls[hookCalls.length - 1];
      expect(lastCall[0]).toBe('Error loading content...');
    }, { timeout: 10000 });
    
    // Restore console.error
    consoleSpy.mockRestore();
  }, 10000); // Increase test timeout
}); 