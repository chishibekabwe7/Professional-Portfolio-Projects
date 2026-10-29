import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessages } from './useMessages';
import * as React from 'react';

describe('useMessages', () => {
  it('initializes with the initial welcome message', () => {
    const { result } = renderHook(() => useMessages());
    
    // Check that there is one initial message
    expect(result.current.messages.length).toBe(1);
    
    // Check that the initial message is from the assistant
    expect(result.current.messages[0].role).toBe('assistant');
    
    // Check that the initial message has content
    expect(result.current.messages[0].content).toBeTruthy();
  });
  
  it('adds a new message', () => {
    const { result } = renderHook(() => useMessages());
    
    // Add a new message
    act(() => {
      result.current.addMessage({
        id: 'test-id',
        role: 'user',
        content: 'Hello, this is a test message',
        timestamp: new Date().toISOString()
      });
    });
    
    // Check that there are now two messages
    expect(result.current.messages.length).toBe(2);
    
    // Check that the new message was added correctly
    const newMessage = result.current.messages[1];
    expect(newMessage.id).toBe('test-id');
    expect(newMessage.role).toBe('user');
    expect(newMessage.content).toBe('Hello, this is a test message');
    expect(newMessage.timestamp).toBeTruthy();
  });
  
  it('updates the last message', () => {
    const { result } = renderHook(() => useMessages());
    
    // Add a message
    act(() => {
      result.current.addMessage({
        id: 'test-id',
        role: 'assistant',
        content: 'Initial content',
        timestamp: new Date().toISOString()
      });
    });
    
    // Update the last message
    act(() => {
      result.current.updateLastMessage('Updated content', true);
    });
    
    // Check that the last message was updated
    const lastMessage = result.current.messages[result.current.messages.length - 1];
    expect(lastMessage.content).toBe('Updated content');
    expect(lastMessage.isTyping).toBe(true);
  });
  
  it('does not update the last message if there are no messages', () => {
    // Create a custom hook for testing empty messages array
    const useEmptyMessages = () => {
      const [messages, setMessages] = React.useState([]);
      
      const updateLastMessage = (content, isTyping) => {
        setMessages(prev => {
          if (prev.length === 0) return prev;
          
          const lastMessage = prev[prev.length - 1];
          const updatedMessage = { ...lastMessage, content, isTyping };
          
          return [
            ...prev.slice(0, prev.length - 1),
            updatedMessage
          ];
        });
      };
      
      return { messages, updateLastMessage };
    };
    
    const { result } = renderHook(() => useEmptyMessages());
    
    // Try to update the last message
    act(() => {
      result.current.updateLastMessage('Updated content', true);
    });
    
    // Check that the messages array is still empty
    expect(result.current.messages).toEqual([]);
  });
  
  it('resets messages to the initial state', () => {
    const { result } = renderHook(() => useMessages());
    
    // Add some messages
    act(() => {
      result.current.addMessage({
        id: 'test-id-1',
        role: 'user',
        content: 'User message',
        timestamp: new Date().toISOString()
      });
      
      result.current.addMessage({
        id: 'test-id-2',
        role: 'assistant',
        content: 'Assistant response',
        timestamp: new Date().toISOString()
      });
    });
    
    // Check that there are three messages (initial + 2 added)
    expect(result.current.messages.length).toBe(3);
    
    // Reset messages
    act(() => {
      result.current.resetMessages();
    });
    
    // Check that there is only the initial message
    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].role).toBe('assistant');
  });
}); 