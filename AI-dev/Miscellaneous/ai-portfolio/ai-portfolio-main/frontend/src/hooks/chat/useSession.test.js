import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from './useSession';
import { createLocalStorageMock } from '../../test/testUtils.jsx'; // Import from testUtils.jsx
import '../../test/mocks'; // Import global mocks which includes uuid mock

// Mock uuid module - must be before any imports that use uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}));

describe('useSession', () => {
  // Use the common localStorage mock utility
  const localStorageMock = createLocalStorageMock();
  
  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    localStorageMock.clear();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Cleanup
    vi.restoreAllMocks();
  });
  
  it('initializes with a new session ID if none exists in localStorage', () => {
    // Ensure localStorage is empty
    expect(localStorageMock.getItem('chatSessionId')).toBeNull();
    
    // Render the hook
    const { result } = renderHook(() => useSession());
    
    // Check that a new session ID was generated
    expect(result.current.sessionId).toBe('test-uuid-1234');
    
    // Check that the session ID was stored in localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('chatSessionId', 'test-uuid-1234');
  });
  
  it('uses existing session ID from localStorage if available', () => {
    // Set a session ID in localStorage
    localStorageMock.setItem('chatSessionId', 'existing-session-id');
    
    // Render the hook
    const { result } = renderHook(() => useSession());
    
    // Check that the existing session ID was used
    expect(result.current.sessionId).toBe('existing-session-id');
  });
  
  it('starts a new session when startNewSession is called', () => {
    // Set an existing session ID
    localStorageMock.setItem('chatSessionId', 'existing-session-id');
    
    // Render the hook
    const { result } = renderHook(() => useSession());
    
    // Initially should use the existing session ID
    expect(result.current.sessionId).toBe('existing-session-id');
    
    // Call startNewSession
    let newSessionId;
    act(() => {
      newSessionId = result.current.startNewSession();
    });
    
    // Check that the session ID was updated
    expect(result.current.sessionId).toBe('test-uuid-1234');
    
    // Check that the new session ID was stored in localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('chatSessionId', 'test-uuid-1234');
    
    // Check that the function returns the new session ID
    expect(newSessionId).toBe('test-uuid-1234');
  });
}); 