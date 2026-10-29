import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchUserRepos } from './github';

describe('GitHub Service', () => {
  // Store the original fetch
  const originalFetch = global.fetch;
  
  beforeEach(() => {
    // Mock fetch before each test
    global.fetch = vi.fn();
  });
  
  afterEach(() => {
    // Restore fetch after each test
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });
  
  describe('fetchUserRepos', () => {
    it('should fetch repos from the GitHub API with correct URL', async () => {
      // Mock successful response
      const mockRepos = [
        { id: 1, name: 'repo1' },
        { id: 2, name: 'repo2' }
      ];
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockRepos)
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      // Call the function
      const result = await fetchUserRepos('testuser');
      
      // Verify fetch was called with the correct URL
      expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/users/testuser/repos');
      
      // Verify the response was processed correctly
      expect(result).toEqual(mockRepos);
      expect(mockResponse.json).toHaveBeenCalled();
    });
    
    it('should throw an error when the response is not ok', async () => {
      // Mock failed response
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      // Call the function and expect it to throw
      await expect(fetchUserRepos('nonexistentuser')).rejects.toThrow('Failed to fetch repos');
      
      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/users/nonexistentuser/repos');
    });
    
    it('should throw an error when fetch fails', async () => {
      // Mock fetch rejection
      const networkError = new Error('Network error');
      global.fetch.mockRejectedValue(networkError);
      
      // Call the function and expect it to throw
      await expect(fetchUserRepos('testuser')).rejects.toThrow('Network error');
      
      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/users/testuser/repos');
    });
    
    it('should handle empty response', async () => {
      // Mock empty response
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([])
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      // Call the function
      const result = await fetchUserRepos('emptyuser');
      
      // Verify the response was processed correctly
      expect(result).toEqual([]);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
}); 