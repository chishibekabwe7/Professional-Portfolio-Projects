import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { BlogSection } from './index';
import React from 'react';
import '../../../test/mocks';
import { renderWithConfig } from '../../../test/testUtils';

describe('BlogSection', () => {
  it('renders the blog section with coming soon message', () => {
    renderWithConfig(<BlogSection />);
    
    // Check for heading and coming soon message
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('Coming Soon!')).toBeInTheDocument();
  });
}); 