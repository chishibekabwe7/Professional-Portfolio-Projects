import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStreamingChat } from './useStreamingChat';
import { ChatService } from '../services/chatService';
import { useMessages } from './chat/useMessages';
import { useSession } from './chat/useSession';
import '../test/mocks'; // Import global mocks

// Create mock functions
const mockAddMessage = vi.fn();
const mockUpdateLastMessage = vi.fn();
const mockResetMessages = vi.fn();
const mockStartNewSession = vi.fn(() => 'new-test-session-id');

// Mock the dependencies
vi.mock('./chat/useMessages', () => ({
  useMessages: vi.fn(() => ({
    messages: [{ id: 'initial', role: 'assistant', content: 'Hello! How can I help you today?' }],
    addMessage: mockAddMessage,
    updateLastMessage: mockUpdateLastMessage,
    resetMessages: mockResetMessages
  }))
}));

vi.mock('./chat/useSession', () => ({
  useSession: vi.fn(() => ({
    sessionId: 'test-session-id',
    startNewSession: mockStartNewSession
  }))
}));

vi.mock('../services/chatService', () => ({
  ChatService: {
    sendMessage: vi.fn(),
    handleStreamingResponse: vi.fn(),
    handleError: vi.fn()
  }
}));

describe('useStreamingChat', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup fake timers
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
  });
  
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useStreamingChat());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.sessionId).toBe('test-session-id');
    expect(result.current.messages).toEqual([
      { id: 'initial', role: 'assistant', content: 'Hello! How can I help you today?' }
    ]);
  });
  
  it('sends a message and handles successful response', async () => {
    // Mock successful response
    const mockResponse = new Response('{"success": true}', { status: 200 });
    ChatService.sendMessage.mockResolvedValue(mockResponse);
    
    // Mock streaming handler to call the onChunk callback
    ChatService.handleStreamingResponse.mockImplementation((response, callbacks) => {
      callbacks.onChunk('Streaming response chunk');
      callbacks.onComplete('Streaming response chunk');
      return Promise.resolve();
    });
    
    const { result } = renderHook(() => useStreamingChat());
    
    // Send a message
    await act(async () => {
      await result.current.sendMessage({ 
        message: 'Test message',
        session_id: 'test-session-id'
      });
    });
    
    // Check that the message was sent
    expect(ChatService.sendMessage).toHaveBeenCalled();
    
    // Check that the user message was added
    expect(mockAddMessage).toHaveBeenCalledWith({
      role: 'user',
      content: 'Test message'
    });
    
    // Check that loading state was updated correctly
    expect(result.current.isLoading).toBe(false);
    
    // Check that the assistant message was updated
    expect(mockUpdateLastMessage).toHaveBeenCalledWith('Streaming response chunk', false);
  });
  
  it('handles rate limit errors', async () => {
    // Mock rate limit response
    const rateLimitResponse = {
      isRateLimit: true,
      message: "You've reached the rate limit. Please wait before sending more messages.",
      retryAfter: 10
    };
    
    ChatService.sendMessage.mockResolvedValue(rateLimitResponse);
    
    const { result } = renderHook(() => useStreamingChat());
    
    // Send a message
    await act(async () => {
      await result.current.sendMessage({
        message: 'Test message'
      });
    });
    
    // Check that the error message was added
    expect(mockAddMessage).toHaveBeenCalledWith({
      role: 'assistant',
      content: "You've reached the rate limit. Please wait before sending more messages.",
      isError: true,
      retryAfter: 10
    });
  });
  
  it('handles general errors', async () => {
    // Mock error
    ChatService.sendMessage.mockRejectedValue(new Error('Server error'));
    
    const { result } = renderHook(() => useStreamingChat());
    
    // Send a message
    await act(async () => {
      await result.current.sendMessage({
        message: 'Test message'
      });
    });
    
    // Check that the error was set
    expect(result.current.error).toBe('Server error');
  });
  
  it('starts a new chat session', () => {
    const { result } = renderHook(() => useStreamingChat());
    
    // Start a new chat
    act(() => {
      result.current.startNewChat();
    });
    
    // Check that messages were reset
    expect(mockResetMessages).toHaveBeenCalled();
    
    // Check that a new session was started
    expect(mockStartNewSession).toHaveBeenCalled();
  });
}); 