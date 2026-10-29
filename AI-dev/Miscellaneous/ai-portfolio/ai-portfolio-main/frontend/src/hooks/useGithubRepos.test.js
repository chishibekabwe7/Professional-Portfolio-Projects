import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGithubRepos } from './useGithubRepos';
import { fetchUserRepos } from '../services/github';

// Mock the github service
vi.mock('../services/github', () => ({
  fetchUserRepos: vi.fn()
}));

describe('useGithubRepos', () => {
  const mockRepos = [
    { id: 1, name: 'repo1', fork: false },
    { id: 2, name: 'repo2', fork: false },
    { id: 3, name: 'repo3', fork: true },  // Forked repo, should be filtered out
    { id: 4, name: 'repo4', fork: false },
    { id: 5, name: 'repo5', fork: false },
    { id: 6, name: 'repo6', fork: false },
    { id: 7, name: 'repo7', fork: false }  // Should be included since limit is 6
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with loading state and empty repos', () => {
    // Mock a pending promise
    fetchUserRepos.mockReturnValue(new Promise(() => {}));
    
    const { result } = renderHook(() => useGithubRepos('testuser'));
    
    expect(result.current.loading).toBe(true);
    expect(result.current.repos).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should fetch and filter repos successfully', async () => {
    // Mock successful API response
    fetchUserRepos.mockResolvedValue(mockRepos);
    
    const { result } = renderHook(() => useGithubRepos('testuser'));
    
    // Initially loading
    expect(result.current.loading).toBe(true);
    
    // Wait for the hook to process the data
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    // Should have filtered out forked repos and limited to 6
    expect(result.current.repos).toHaveLength(6);
    expect(result.current.repos[0].name).toBe('repo1');
    expect(result.current.repos).not.toContainEqual(expect.objectContaining({ name: 'repo3' })); // Forked repo
    // repo7 is included since the limit is 6 and there are 6 non-forked repos
    expect(result.current.error).toBe(null);
    
    // Should have called the service with correct username
    expect(fetchUserRepos).toHaveBeenCalledWith('testuser');
  });

  it('should respect custom limit parameter', async () => {
    // Mock successful API response
    fetchUserRepos.mockResolvedValue(mockRepos);
    
    const customLimit = 3;
    const { result } = renderHook(() => useGithubRepos('testuser', customLimit));
    
    // Wait for the hook to process the data
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    // Should have limited to customLimit
    expect(result.current.repos).toHaveLength(customLimit);
    expect(result.current.repos[0].name).toBe('repo1');
    expect(result.current.repos[2].name).toBe('repo4');
  });

  it('should handle API errors', async () => {
    // Mock API error
    const mockError = new Error('API error');
    fetchUserRepos.mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useGithubRepos('testuser'));
    
    // Wait for the hook to process the error
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    expect(result.current.loading).toBe(false);
    expect(result.current.repos).toEqual([]);
    expect(result.current.error).toBe(mockError);
  });

  it('should refetch when username changes', async () => {
    // Mock successful API response
    fetchUserRepos.mockResolvedValue(mockRepos);
    
    const { result, rerender } = renderHook(({ username }) => useGithubRepos(username), {
      initialProps: { username: 'user1' }
    });
    
    // Wait for the first fetch to complete
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchUserRepos).toHaveBeenCalledWith('user1');
    
    // Change the username
    rerender({ username: 'user2' });
    
    // The hook doesn't reset loading to true when props change
    expect(result.current.loading).toBe(false);
    
    // Wait for the second fetch to complete
    await waitFor(() => {
      expect(fetchUserRepos).toHaveBeenCalledWith('user2');
    });
    
    // Should have called the service with the new username
    expect(fetchUserRepos).toHaveBeenCalledWith('user2');
  });

  it('should refetch when limit changes', async () => {
    // Mock successful API response
    fetchUserRepos.mockResolvedValue(mockRepos);
    
    const { result, rerender } = renderHook(({ limit }) => useGithubRepos('testuser', limit), {
      initialProps: { limit: 3 }
    });
    
    // Wait for the first fetch to complete
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.repos).toHaveLength(3);
    
    // Change the limit
    rerender({ limit: 5 });
    
    // Wait for the second fetch to complete
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    // Should have the new limit applied
    expect(result.current.repos).toHaveLength(5);
  });
}); 