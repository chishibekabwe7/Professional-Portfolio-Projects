import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { ProjectsSection } from './index';
import React from 'react';
import '../../../test/mocks';
import { useGithubRepos } from '../../../hooks/useGithubRepos';
import { renderWithConfig } from '../../../test/testUtils';

// Mock the useGithubRepos hook
vi.mock('../../../hooks/useGithubRepos', () => ({
  useGithubRepos: vi.fn()
}));

describe('ProjectsSection', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });
  
  it('renders loading state', () => {
    // Mock loading state
    vi.mocked(useGithubRepos).mockReturnValue({
      repos: [],
      loading: true,
      error: null
    });
    
    renderWithConfig(<ProjectsSection />);
    
    // Check for loading message
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
  
  it('renders error state', () => {
    // Mock error state
    vi.mocked(useGithubRepos).mockReturnValue({
      repos: [],
      loading: false,
      error: 'Failed to fetch repositories'
    });
    
    renderWithConfig(<ProjectsSection />);
    
    // Check for error message
    expect(screen.getByText('Error loading projects')).toBeInTheDocument();
  });
  
  it('renders repositories', () => {
    // Mock repositories
    const mockRepos = [
      {
        id: 1,
        name: 'Test Repo 1',
        description: 'Test description 1',
        html_url: 'https://github.com/alonxt/test-repo-1'
      },
      {
        id: 2,
        name: 'Test Repo 2',
        description: 'Test description 2',
        html_url: 'https://github.com/alonxt/test-repo-2'
      }
    ];
    
    vi.mocked(useGithubRepos).mockReturnValue({
      repos: mockRepos,
      loading: false,
      error: null
    });
    
    renderWithConfig(<ProjectsSection />);
    
    // Check that repositories are rendered
    expect(screen.getByText('Test Repo 1')).toBeInTheDocument();
    expect(screen.getByText('Test Repo 2')).toBeInTheDocument();
    expect(screen.getByText('Test description 1')).toBeInTheDocument();
    expect(screen.getByText('Test description 2')).toBeInTheDocument();
    
    // Check that links are correct
    const links = screen.getAllByText('View Project');
    expect(links[0].closest('a')).toHaveAttribute('href', 'https://github.com/alonxt/test-repo-1');
    expect(links[1].closest('a')).toHaveAttribute('href', 'https://github.com/alonxt/test-repo-2');
  });
  
  it('renders repositories with missing descriptions', () => {
    // Mock repositories with missing descriptions
    const mockRepos = [
      {
        id: 1,
        name: 'Test Repo 1',
        description: null,
        html_url: 'https://github.com/alonxt/test-repo-1'
      }
    ];
    
    vi.mocked(useGithubRepos).mockReturnValue({
      repos: mockRepos,
      loading: false,
      error: null
    });
    
    renderWithConfig(<ProjectsSection />);
    
    // Check that fallback description is used
    expect(screen.getByText('No description available')).toBeInTheDocument();
  });
  
  it('calls useGithubRepos with correct parameters', () => {
    // Mock repositories
    vi.mocked(useGithubRepos).mockReturnValue({
      repos: [],
      loading: false,
      error: null
    });
    
    renderWithConfig(<ProjectsSection />);
    
    // Check that useGithubRepos was called with correct parameters
    expect(useGithubRepos).toHaveBeenCalledWith('alonxt', 6);
  });
}); 