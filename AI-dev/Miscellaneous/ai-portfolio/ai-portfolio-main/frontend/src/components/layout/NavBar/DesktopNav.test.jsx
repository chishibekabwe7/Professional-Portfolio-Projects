import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { DesktopNav } from './DesktopNav';
import React from 'react';
import '../../../test/mocks';
import { renderWithRouterAndConfig } from '../../../test/testUtils';

// Mock the navigationConfig module
vi.mock('../config/navigationConfig', () => {
  return {
    sections: {
      about: {
        icon: vi.fn(() => <div data-testid="about-icon">About Icon</div>),
        title: 'About Me',
        path: '/about-me'
      },
      projects: {
        icon: vi.fn(() => <div data-testid="projects-icon">Projects Icon</div>),
        title: 'Projects',
        path: '/projects'
      },
      blog: {
        icon: vi.fn(() => <div data-testid="blog-icon">Blog Icon</div>),
        title: 'Blog',
        path: '/blog'
      }
    }
  };
});

// Mock the SocialLinks component
vi.mock('../shared/SocialLinks', () => ({
  SocialLinks: () => <div data-testid="social-links-mock">Social Links Mock</div>
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  NavLink: ({ to, children, className }) => {
    // Mock the isActive function that NavLink provides
    const isActive = to === '/about-me'; // Simulate 'About Me' being active
    return (
      <a 
        href={to} 
        className={typeof className === 'function' ? className({ isActive }) : className}
        data-testid={`nav-link-${to.replace(/\//g, '').replace('-', '')}`}
      >
        {children}
      </a>
    );
  }
}));

describe('DesktopNav', () => {
  beforeEach(() => {
    renderWithRouterAndConfig(<DesktopNav />);
  });
  
  it('renders all navigation links', () => {
    expect(screen.getByText('About Me')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
  });
  
  it('renders icons for each navigation link', () => {
    expect(screen.getByTestId('about-icon')).toBeInTheDocument();
    expect(screen.getByTestId('projects-icon')).toBeInTheDocument();
    expect(screen.getByTestId('blog-icon')).toBeInTheDocument();
  });
  
  it('applies active class to the active link', () => {
    const aboutLink = screen.getByTestId('nav-link-aboutme');
    const projectsLink = screen.getByTestId('nav-link-projects');
    
    // About link should have the active class
    expect(aboutLink.className).toContain('bg-white/10');
    expect(aboutLink.className).toContain('text-white');
    
    // Projects link should have the inactive class
    expect(projectsLink.className).toContain('text-gray-400');
  });
  
  it('renders the SocialLinks component', () => {
    expect(screen.getByTestId('social-links-mock')).toBeInTheDocument();
  });
}); 