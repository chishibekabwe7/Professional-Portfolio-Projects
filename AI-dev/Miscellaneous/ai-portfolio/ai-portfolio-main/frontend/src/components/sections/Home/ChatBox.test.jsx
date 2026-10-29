import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, act } from '@testing-library/react';
import { ChatBox } from './ChatBox';
import React from 'react';
import '../../../test/mocks';
import { useStreamingChat } from '../../../hooks/useStreamingChat';
import { renderWithConfig } from '../../../test/testUtils';

// Mock the hooks
vi.mock('../../../hooks/useStreamingChat', () => ({
  useStreamingChat: vi.fn(() => ({
    isLoading: false,
    error: null,
    sendMessage: vi.fn(async (chatRequest) => {
      // Mock successful message sending
      return { success: true };
    }),
    startNewChat: vi.fn(),
    stopAnswering: vi.fn(),
    messages: [{ role: 'assistant', content: 'Hello! How can I help you today?' }],
    sessionId: 'default-session'
  }))
}));

// Mock the ChatInput component
vi.mock('./ChatInput', () => ({
  ChatInput: ({ onSubmit, isLoading, onStop }) => (
    <form data-testid="chat-input-form" onSubmit={(e) => {
      e.preventDefault();
      onSubmit('Test message');
    }}>
      <button type="submit" disabled={isLoading} data-testid="submit-button">
        Send
      </button>
      {isLoading && (
        <button type="button" onClick={onStop} data-testid="stop-button">
          Stop
        </button>
      )}
    </form>
  )
}));

// Mock the ChatMessage component
vi.mock('./ChatMessage', () => ({
  ChatMessage: ({ message }) => (
    <div data-testid="chat-message" className={message.role}>
      {message.content}
      {message.isError && <div data-testid="error-message">{message.content}</div>}
      {message.isTyping && <div data-testid="typing-indicator-inline">Typing...</div>}
      {message.isError && message.retryAfter > 0 && (
        <div data-testid="rate-limit-countdown">
          Try again in {message.retryAfter} seconds
        </div>
      )}
    </div>
  )
}));

// Mock the TypingIndicator component
vi.mock('./TypingIndicator', () => ({
  TypingIndicator: ({ inline }) => (
    <div data-testid={inline ? "typing-indicator-inline" : "ai-typing-indicator"}>
      {inline ? "Typing..." : "AI is typing..."}
    </div>
  )
}));

// Mock the RateLimitCountdown component
vi.mock('./RateLimitCountdown', () => ({
  RateLimitCountdown: vi.fn(({ seconds }) => (
    <div data-testid="rate-limit-countdown">
      Try again in {seconds} seconds
    </div>
  ))
}));

// Mock Element.scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('ChatBox', () => {
  let mockUseStreamingChat;
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup the mock implementation for useStreamingChat
    mockUseStreamingChat = {
      isLoading: false,
      error: null,
      sendMessage: vi.fn(async (chatRequest) => ({ success: true })),
      startNewChat: vi.fn(),
      stopAnswering: vi.fn(),
      messages: [{ role: 'assistant', content: 'Hello! How can I help you today?' }],
      sessionId: 'default-session'
    };
    
    vi.mocked(useStreamingChat).mockReturnValue(mockUseStreamingChat);
    
    // Setup fake timers
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
  });
  
  it('renders the chat box with initial welcome message', () => {
    renderWithConfig(<ChatBox />);
    
    // Check for the welcome message
    expect(screen.getByTestId('chat-message')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input-form')).toBeInTheDocument();
  });
  
  it('adds user message and calls sendMessage when form is submitted', async () => {
    // Mock timestamp to make it predictable
    const mockTimestamp = 1740919919.768;
    vi.spyOn(Date, 'now').mockImplementation(() => mockTimestamp * 1000);
    
    renderWithConfig(<ChatBox />);
    
    // Submit a message
    fireEvent.submit(screen.getByTestId('chat-input-form'));
    
    // Check that sendMessage was called with the correct parameters
    expect(mockUseStreamingChat.sendMessage).toHaveBeenCalledWith({
      message: 'Test message',
      messages: [{ role: 'assistant', content: 'Hello! How can I help you today?' }],
      session_id: 'default-session',
      timestamp: mockTimestamp
    });
  });
  
  it('shows loading state when sending a message', async () => {
    // Set loading to true
    mockUseStreamingChat.isLoading = true;
    
    renderWithConfig(<ChatBox />);
    
    // Check that the submit button is disabled
    expect(screen.getByTestId('submit-button')).toBeDisabled();
    
    // Check that the typing indicator is displayed
    expect(screen.getByTestId('ai-typing-indicator')).toBeInTheDocument();
  });
  
  it('shows typing indicator inline when message is being streamed', () => {
    // Add a typing message
    mockUseStreamingChat.messages = [
      { role: 'assistant', content: 'Hello! How can I help you today?' },
      { role: 'user', content: 'Test message' },
      { role: 'assistant', content: 'I am typing a response', isTyping: true }
    ];
    
    renderWithConfig(<ChatBox />);
    
    // Check for the inline typing indicator
    expect(screen.getByTestId('typing-indicator-inline')).toBeInTheDocument();
  });
  
  it('shows rate limit countdown when rate limited', () => {
    // Add a rate limited message
    mockUseStreamingChat.messages = [
      { role: 'assistant', content: 'Hello! How can I help you today?' },
      { 
        role: 'assistant', 
        content: 'Rate limit exceeded', 
        isError: true, 
        retryAfter: 10 
      }
    ];
    
    // Render the component
    renderWithConfig(<ChatBox />);
    
    // Check for error message
    expect(screen.getByTestId('error-message')).toHaveTextContent('Rate limit exceeded');
    
    // Check for the rate limit countdown
    expect(screen.getByTestId('rate-limit-countdown')).toBeInTheDocument();
    expect(screen.getByTestId('rate-limit-countdown')).toHaveTextContent('Try again in 10 seconds');
  });
  
  it('scrolls to bottom when new messages are added', async () => {
    // Create a spy for scrollIntoView
    const scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewSpy;
    
    // Render with initial messages
    const { rerender } = renderWithConfig(<ChatBox />);
    
    // Simulate user engagement by submitting a message
    fireEvent.submit(screen.getByTestId('chat-input-form'));
    
    // Clear the spy to ensure we only count calls after message updates
    scrollIntoViewSpy.mockClear();
    
    // Update the messages to trigger a re-render and scrollToBottom
    mockUseStreamingChat.messages = [
      { role: 'assistant', content: 'Hello! How can I help you today?' },
      { role: 'user', content: 'Test message' },
      { role: 'assistant', content: 'Test response' }
    ];
    
    // Force a re-render with the updated messages
    rerender(<ChatBox />);
    
    // Advance timers to allow any async effects to complete
    act(() => {
      vi.runAllTimers();
    });
    
    // Check that scrollIntoView was called (this is the behavior we want to test)
    expect(scrollIntoViewSpy).toHaveBeenCalled();
  });
  
  it('handles errors when sending messages', async () => {
    // Setup error scenario
    mockUseStreamingChat.error = 'Test error';
    
    renderWithConfig(<ChatBox />);
    
    // Check for error message
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
}); 