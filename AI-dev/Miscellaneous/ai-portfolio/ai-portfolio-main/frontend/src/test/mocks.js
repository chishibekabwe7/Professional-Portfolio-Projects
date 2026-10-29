import React from 'react';
import { vi } from 'vitest';
import { createLocalStorageMock } from './testUtils.jsx';
import mockConfig from './mocks/config.json';

/**
 * Common mock for framer-motion
 * Import this in your test files with:
 * import '../test/mocks';
 */
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => React.createElement('div', props, children),
    a: ({ children, ...props }) => React.createElement('a', props, children),
    form: ({ children, ...props }) => React.createElement('form', props, children),
    button: ({ children, ...props }) => React.createElement('button', props, children),
    textarea: ({ children, ...props }) => React.createElement('textarea', props, children),
    span: ({ children, ...props }) => React.createElement('span', props, children),
    p: ({ children, ...props }) => React.createElement('p', props, children),
    h1: ({ children, ...props }) => React.createElement('h1', props, children),
    h2: ({ children, ...props }) => React.createElement('h2', props, children),
    h3: ({ children, ...props }) => React.createElement('h3', props, children),
    ul: ({ children, ...props }) => React.createElement('ul', props, children),
    li: ({ children, ...props }) => React.createElement('li', props, children),
    // Add other elements as needed
  },
  AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children)
}));

// Mock for ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }) => React.createElement('div', { className: 'markdown-content' }, children)
}));

// Mock for uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}));

// Mock for Vercel Analytics
vi.mock('@vercel/analytics', () => ({
  inject: vi.fn()
}));

// Mock for Element.scrollIntoView
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
}

// Export localStorage mock for reuse
export const localStorageMock = createLocalStorageMock();

// Setup localStorage mock by default
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock for fetch
global.fetch = vi.fn();

// Mock for console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Helper to restore console methods
export const restoreConsoleMethods = () => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
};

// Helper to suppress console methods
export const suppressConsoleMethods = () => {
  console.error = vi.fn();
  console.warn = vi.fn();
};

// Helper to create common hook mocks
export const createHookMocks = () => ({
  useStreamingChat: vi.fn(() => ({
    isLoading: false,
    error: null,
    sendMessage: vi.fn(async () => ({ success: true })),
    startNewChat: vi.fn(),
    stopAnswering: vi.fn(),
    messages: [{ role: 'assistant', content: 'Hello! How can I help you today?' }],
    sessionId: 'test-session-id'
  })),
  useMessages: vi.fn(() => ({
    messages: [],
    addMessage: vi.fn(),
    updateLastMessage: vi.fn(),
    resetMessages: vi.fn()
  })),
  useSession: vi.fn(() => ({
    sessionId: 'test-session-id',
    startNewSession: vi.fn(() => 'new-test-session-id')
  })),
  useGithubRepos: vi.fn(() => ({
    repos: [],
    loading: false,
    error: null
  })),
  useTypingEffect: vi.fn((content) => ({
    displayedContent: content,
    setIsTyping: vi.fn(),
    setDisplayedContent: vi.fn()
  }))
}); 