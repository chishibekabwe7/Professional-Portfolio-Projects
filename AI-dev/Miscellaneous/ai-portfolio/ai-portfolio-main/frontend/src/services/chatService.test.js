import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatService } from './chatService';

describe('ChatService', () => {
  // Mock fetch
  global.fetch = vi.fn();
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Cleanup
    vi.restoreAllMocks();
  });
  
  describe('sendMessage', () => {
    it('sends a message to the API with correct parameters', async () => {
      // Mock successful response
      const mockResponse = new Response(JSON.stringify({ success: true }));
      global.fetch.mockResolvedValue(mockResponse);
      
      // Create a chat request with messages
      const chatRequest = {
        sessionId: 'test-session-id',
        messages: [
          { role: 'user', content: 'Test message' },
          { role: 'assistant', content: 'Test response' }
        ]
      };
      
      // Call the method
      const result = await ChatService.sendMessage(chatRequest);
      
      // Check that fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'test-session-id',
          messages: [
            { role: 'user', content: 'Test message' },
            { role: 'assistant', content: 'Test response' }
          ]
        })
      });
      
      // Check that the response was returned
      expect(result).toBe(mockResponse);
    });
    
    it('handles network errors', async () => {
      // Mock network error
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      // Create a chat request with messages
      const chatRequest = {
        sessionId: 'test-session-id',
        messages: [
          { role: 'user', content: 'Test message' }
        ]
      };
      
      // Call the method and expect it to throw
      await expect(ChatService.sendMessage(chatRequest)).rejects.toThrow('Network error');
    });
  });
  
  describe('handleStreamingResponse', () => {
    it('processes a streaming response and calls callbacks', async () => {
      // Mock ReadableStream
      const mockReader = {
        read: vi.fn(),
        cancel: vi.fn().mockResolvedValue(undefined)
      };
      
      // Setup the reader to return chunks and then done
      mockReader.read
        .mockResolvedValueOnce({ 
          value: new TextEncoder().encode('0:{"chunk":"Hello"}'), 
          done: false 
        })
        .mockResolvedValueOnce({ 
          value: new TextEncoder().encode('0:{"chunk":" World"}'), 
          done: false 
        })
        .mockResolvedValueOnce({ done: true });
      
      // Mock response with getReader
      const mockResponse = {
        body: {
          getReader: () => mockReader
        }
      };
      
      // Mock callbacks
      const callbacks = {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        shouldStop: vi.fn().mockReturnValue(false)
      };
      
      // Call the method
      await ChatService.handleStreamingResponse(mockResponse, callbacks);
      
      // Check that the reader was read until done
      expect(mockReader.read).toHaveBeenCalledTimes(3);
      
      // Check that onChunk was called for each chunk
      expect(callbacks.onChunk).toHaveBeenCalledTimes(2);
      
      // Check that onComplete was called once at the end
      expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    });
    
    it('handles errors during streaming', async () => {
      // Mock ReadableStream with error
      const mockReader = {
        read: vi.fn().mockRejectedValue(new Error('Stream error')),
        cancel: vi.fn().mockResolvedValue(undefined)
      };
      
      // Mock response with getReader
      const mockResponse = {
        body: {
          getReader: () => mockReader
        }
      };
      
      // Mock callbacks
      const callbacks = {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        shouldStop: vi.fn().mockReturnValue(false)
      };
      
      // Call the method and expect it to throw
      await expect(ChatService.handleStreamingResponse(mockResponse, callbacks))
        .rejects.toThrow('Error processing response stream');
      
      // Check that onComplete was not called
      expect(callbacks.onComplete).not.toHaveBeenCalled();
    });
  });
  
  describe('handleError', () => {
    it('handles rate limit errors', async () => {
      // Mock rate limit response
      const mockResponse = new Response(
        JSON.stringify({ 
          friendly_message: "You've reached the rate limit. Please wait before sending more messages.",
          retry_after: 10 
        }),
        { status: 429 }
      );
      
      // Call the method
      const result = await ChatService.handleError(mockResponse);
      
      // Check the result
      expect(result).toEqual({
        isRateLimit: true,
        message: "You've reached the rate limit. Please wait before sending more messages.",
        retryAfter: 10
      });
    });
    
    it('handles general errors', async () => {
      // Mock general error response
      const mockResponse = new Response(
        JSON.stringify({ detail: 'Server error occurred' }),
        { status: 500 }
      );
      
      // Call the method and expect it to throw
      await expect(ChatService.handleError(mockResponse)).rejects.toThrow('Server error occurred');
    });
    
    it('handles non-JSON responses', async () => {
      // Mock non-JSON response
      const mockResponse = new Response(
        'Internal Server Error',
        { status: 500 }
      );
      
      // Mock response.json to throw
      mockResponse.json = vi.fn().mockRejectedValue(new SyntaxError('Unexpected token'));
      
      // Call the method and expect it to throw with the correct message
      await expect(ChatService.handleError(mockResponse)).rejects.toThrow('Unexpected token');
    });
  });
}); 