import { vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import mockConfig from './mocks/config.json';

// Create a mock ConfigContext and Provider without importing the actual ConfigProvider
const ConfigContext = React.createContext({
  config: mockConfig,
  loading: false,
  error: null
});

const MockConfigProvider = ({ children }) => (
  <ConfigContext.Provider value={{ config: mockConfig, loading: false, error: null }}>
    {children}
  </ConfigContext.Provider>
);

// Export a mock useConfig hook
export const useConfig = () => React.useContext(ConfigContext);

/**
 * Creates a mock localStorage implementation for testing
 * @returns {Object} Mock localStorage object with getItem, setItem, and clear methods
 */
export const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    })
  };
};

/**
 * Sets up localStorage mock for testing
 * @param {Object} localStorageMock - The mock localStorage object
 */
export const setupLocalStorageMock = (localStorageMock) => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
};

/**
 * Creates a mock fetch implementation that returns the provided response
 * @param {Object|Error} responseOrError - The response object or error to return
 * @returns {Function} Mock fetch function
 */
export const createFetchMock = (responseOrError) => {
  if (responseOrError instanceof Error) {
    return vi.fn().mockRejectedValue(responseOrError);
  }
  
  return vi.fn().mockResolvedValue(responseOrError);
};

/**
 * Renders a component with router context for testing
 * @param {React.ReactElement} ui - The component to render
 * @param {Object} options - Additional render options
 * @returns {Object} The rendered component
 */
export const renderWithRouter = (ui, options = {}) => {
  // Create a mock router wrapper that just renders its children
  const MockRouter = ({ children }) => (
    <div data-testid="browser-router">{children}</div>
  );
  
  return render(ui, {
    wrapper: MockRouter,
    ...options
  });
};

/**
 * Renders a component with ConfigProvider for testing
 * @param {React.ReactElement} ui - The component to render
 * @param {Object} options - Additional render options
 * @returns {Object} The rendered component
 */
export const renderWithConfig = (ui, options = {}) => {
  return render(ui, {
    wrapper: ({ children }) => <MockConfigProvider>{children}</MockConfigProvider>,
    ...options
  });
};

/**
 * Renders a component with both Router and ConfigProvider for testing
 * @param {React.ReactElement} ui - The component to render
 * @param {Object} options - Additional render options
 * @returns {Object} The rendered component
 */
export const renderWithRouterAndConfig = (ui, options = {}) => {
  // Create a mock router wrapper that just renders its children
  const MockRouter = ({ children }) => (
    <div data-testid="browser-router">
      <MockConfigProvider>{children}</MockConfigProvider>
    </div>
  );
  
  return render(ui, {
    wrapper: MockRouter,
    ...options
  });
};

/**
 * Creates a mock response object
 * @param {Object} data - The response data
 * @param {number} status - The response status code
 * @returns {Object} Mock response object
 */
export const createMockResponse = (data, status = 200) => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data))
  };
};

/**
 * Creates a mock streaming response
 * @param {Array} chunks - Array of chunks to stream
 * @returns {Object} Mock response with readable stream
 */
export const createMockStreamingResponse = (chunks) => {
  const mockReader = {
    read: vi.fn(),
    cancel: vi.fn().mockResolvedValue(undefined)
  };
  
  // Setup the reader to return chunks and then done
  chunks.forEach((chunk, index) => {
    mockReader.read.mockResolvedValueOnce({
      value: new TextEncoder().encode(chunk),
      done: false
    });
  });
  
  // Last call returns done: true
  mockReader.read.mockResolvedValueOnce({ done: true });
  
  return {
    body: {
      getReader: () => mockReader
    }
  };
};

/**
 * Advances all timers and waits for pending promises
 * @returns {Promise} Promise that resolves when all timers and promises are resolved
 */
export const advanceTimersAndPromises = async () => {
  vi.runAllTimers();
  await vi.runAllTicks();
}; 