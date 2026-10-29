import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { MobileNav } from './MobileNav';
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
    },
    navConfig: {
      mobileMenuTransition: {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 0, height: 0 }
      },
      iconAnimation: {
        whileHover: { scale: 1.1 },
        whileTap: { scale: 0.95 }
      }
    }
  };
});

// Mock the SocialLinks component
vi.mock('../shared/SocialLinks', () => ({
  SocialLinks: ({ isMobile }) => <div data-testid="social-links" data-is-mobile={isMobile}>Social Links Mock</div>
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  NavLink: ({ to, children, className, onClick }) => {
    // Mock the isActive function that NavLink provides
    const isActive = to === '/about-me'; // Simulate 'About Me' being active
    return (
      <a 
        href={to} 
        className={typeof className === 'function' ? className({ isActive }) : className}
        data-testid={`nav-link-${to.replace(/\//g, '').replace('-', '')}`}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }
}));

describe('MobileNav', () => {
  let setIsMenuOpen;
  
  beforeEach(() => {
    setIsMenuOpen = vi.fn();
  });
  
  it('renders nothing when isMenuOpen is false', () => {
    renderWithRouterAndConfig(<MobileNav isMenuOpen={false} setIsMenuOpen={setIsMenuOpen} />);
    expect(screen.queryByText('About Me')).not.toBeInTheDocument();
  });
  
  it('renders navigation links when isMenuOpen is true', () => {
    renderWithRouterAndConfig(<MobileNav isMenuOpen={true} setIsMenuOpen={setIsMenuOpen} />);
    expect(screen.getByText('About Me')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
  });
  
  it('renders icons for each navigation link when open', () => {
    renderWithRouterAndConfig(<MobileNav isMenuOpen={true} setIsMenuOpen={setIsMenuOpen} />);
    expect(screen.getByTestId('about-icon')).toBeInTheDocument();
    expect(screen.getByTestId('projects-icon')).toBeInTheDocument();
    expect(screen.getByTestId('blog-icon')).toBeInTheDocument();
  });
  
  it('applies active class to the active link when open', () => {
    renderWithRouterAndConfig(<MobileNav isMenuOpen={true} setIsMenuOpen={setIsMenuOpen} />);
    const aboutLink = screen.getByTestId('nav-link-aboutme');
    const projectsLink = screen.getByTestId('nav-link-projects');
    
    // About link should have the active class
    expect(aboutLink.className).toContain('bg-white/10');
    expect(aboutLink.className).toContain('text-white');
    
    // Projects link should have the inactive class
    expect(projectsLink.className).toContain('text-gray-400');
  });
  
  it('renders the SocialLinks component with isMobile prop when open', () => {
    renderWithRouterAndConfig(<MobileNav isMenuOpen={true} setIsMenuOpen={setIsMenuOpen} />);
    const socialLinks = screen.getByTestId('social-links');
    expect(socialLinks).toBeInTheDocument();
    expect(socialLinks.getAttribute('data-is-mobile')).toBe('true');
  });
  
  it('calls setIsMenuOpen when a navigation link is clicked', () => {
    renderWithRouterAndConfig(<MobileNav isMenuOpen={true} setIsMenuOpen={setIsMenuOpen} />);
    fireEvent.click(screen.getByTestId('nav-link-projects'));
    expect(setIsMenuOpen).toHaveBeenCalledWith(false);
  });
}); 