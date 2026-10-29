import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import mockConfig from './mocks/config.json'

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// Clean up after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock configLoader before any imports that might use it
vi.mock('../config/configLoader', () => {
  return {
    loadConfig: vi.fn().mockResolvedValue(mockConfig),
    getConfig: vi.fn((section, key, defaultValue) => {
      if (!section) return mockConfig;
      if (!key) return mockConfig[section] || defaultValue;
      return mockConfig[section]?.[key] || defaultValue;
    }),
    getPersonalInfo: vi.fn(() => mockConfig.personal),
    getSocialLinks: vi.fn(() => mockConfig.social),
    getChatConfig: vi.fn(() => mockConfig.chat),
    getContentConfig: vi.fn(() => mockConfig.content)
  }
})

// Mock ConfigProvider
vi.mock('../config/ConfigProvider', () => {
  const React = require('react')
  const ConfigContext = React.createContext({
    config: mockConfig,
    loading: false,
    error: null
  })
  
  return {
    ConfigProvider: ({ children }) => 
      React.createElement(ConfigContext.Provider, 
        { value: { config: mockConfig, loading: false, error: null } }, 
        children
      ),
    useConfig: () => React.useContext(ConfigContext)
  }
})

// Mock fetch for config.json
beforeAll(() => {
  // Mock fetch to return the mock config for config.json requests
  global.fetch = vi.fn((url) => {
    if (url === '/config.json') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      })
    }
    
    // For other requests, return a 404
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })
  })
})

// Suppress React DOM prop warnings (especially useful for framer-motion props)
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (/Warning.*React does not recognize the.*prop on a DOM element/.test(args[0])) {
      return
    }
    // Suppress act warnings in tests
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  // Reset fetch mock
  vi.restoreAllMocks()
})

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  const React = require('react');
  
  // Create a mock BrowserRouter that just renders its children
  const BrowserRouter = ({ children }) => React.createElement('div', { 'data-testid': 'browser-router' }, children);
  
  return {
    ...actual,
    BrowserRouter,
    useNavigate: vi.fn().mockReturnValue(vi.fn()),
    useLocation: vi.fn().mockReturnValue({ pathname: '/' }),
    useParams: vi.fn().mockReturnValue({}),
    Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children)
  };
}); 