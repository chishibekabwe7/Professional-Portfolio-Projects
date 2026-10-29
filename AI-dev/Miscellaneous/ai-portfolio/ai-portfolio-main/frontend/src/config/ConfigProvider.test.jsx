import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import mockConfig from '../test/mocks/config.json';
import { ConfigProvider, useConfig } from './ConfigProvider';

// Mock the configLoader module
vi.mock('./configLoader', () => ({
  loadConfig: vi.fn().mockResolvedValue(mockConfig)
}));

describe('ConfigProvider', () => {
  it('provides config to children when loading succeeds', async () => {
    // Define a test component that uses the useConfig hook
    const TestComponent = () => {
      const { config, loading, error } = useConfig();
      
      if (loading) return <div>Loading...</div>;
      if (error) return <div>Error: {error}</div>;
      
      return (
        <div>
          <div data-testid="name">{config.personal.name}</div>
          <div data-testid="email">{config.personal.email}</div>
        </div>
      );
    };
    
    render(
      <ConfigProvider>
        <TestComponent />
      </ConfigProvider>
    );
    
    // Wait for the config to be loaded and displayed
    await waitFor(() => {
      expect(screen.getByTestId('name')).toHaveTextContent(mockConfig.personal.name);
      expect(screen.getByTestId('email')).toHaveTextContent(mockConfig.personal.email);
    });
  });
}); 