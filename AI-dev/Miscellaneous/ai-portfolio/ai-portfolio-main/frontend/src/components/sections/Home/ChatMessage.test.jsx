import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { ChatMessage } from './ChatMessage';
import React from 'react';
import '../../../test/mocks';
import { renderWithConfig } from '../../../test/testUtils';

// Mock the Lucide React icons
vi.mock('lucide-react', () => ({
  User: () => React.createElement('div', { 'data-testid': 'user-icon' }),
  Bot: () => React.createElement('div', { 'data-testid': 'bot-icon' })
}));

// Mock ReactMarkdown to simplify testing
vi.mock('react-markdown', () => ({
  default: ({ children }) => React.createElement('div', { className: 'mocked-markdown' }, children)
}));

// Mock the TypingIndicator component
vi.mock('./TypingIndicator', () => ({
  TypingIndicator: ({ inline }) => 
    React.createElement(
      'div', 
      { 
        'data-testid': inline ? 'typing-indicator-inline' : 'ai-typing-indicator',
        className: inline ? 'inline-typing' : 'full-typing'
      }, 
      'Typing...'
    )
}));

describe('ChatMessage', () => {
  it('renders user message correctly', () => {
    const userMessage = {
      id: '1',
      role: 'user',
      content: 'Hello, this is a test message',
      timestamp: new Date().toISOString()
    };
    
    renderWithConfig(<ChatMessage message={userMessage} />);
    
    // Check that the message content is displayed
    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
    
    // Check that the user avatar is displayed
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });
  
  it('renders assistant message correctly', () => {
    const assistantMessage = {
      id: '2',
      role: 'assistant',
      content: 'I am the assistant responding to your query',
      timestamp: new Date().toISOString()
    };
    
    renderWithConfig(<ChatMessage message={assistantMessage} />);
    
    // Check that the message content is displayed
    expect(screen.getByText('I am the assistant responding to your query')).toBeInTheDocument();
    
    // Check that the assistant avatar is displayed
    expect(screen.getByTestId('bot-icon')).toBeInTheDocument();
  });
  
  it('renders markdown content in assistant messages', () => {
    const markdownMessage = {
      id: '3',
      role: 'assistant',
      content: '# Heading\n- List item\n- Another item\n```code block```',
      timestamp: new Date().toISOString()
    };
    
    renderWithConfig(<ChatMessage message={markdownMessage} />);
    
    // Check that the markdown content is passed to ReactMarkdown
    const markdownContent = document.querySelector('.markdown-content');
    expect(markdownContent).toBeInTheDocument();
  });
  
  it('displays error message with appropriate styling when isError is true', () => {
    const errorMessage = {
      id: '4',
      role: 'assistant',
      content: 'Error message',
      isError: true,
      timestamp: new Date().toISOString()
    };
    
    const { container } = renderWithConfig(<ChatMessage message={errorMessage} />);
    
    // Check that the message has the error styling
    const messageContent = container.querySelector('.bg-red-500\\/10');
    expect(messageContent).toBeInTheDocument();
  });
  
  it('shows standalone typing indicator when isTyping is true and content is empty', () => {
    const typingMessage = {
      id: '5',
      role: 'assistant',
      content: '',
      isTyping: true,
      timestamp: new Date().toISOString()
    };
    
    renderWithConfig(<ChatMessage message={typingMessage} />);
    
    // Check that the standalone typing indicator is displayed
    expect(screen.getByTestId('ai-typing-indicator')).toBeInTheDocument();
  });
  
  it('shows inline typing indicator when isTyping is true and content is not empty', () => {
    const typingMessage = {
      id: '6',
      role: 'assistant',
      content: 'Partial response',
      isTyping: true,
      timestamp: new Date().toISOString()
    };
    
    renderWithConfig(<ChatMessage message={typingMessage} />);
    
    // Check that the message content is displayed
    expect(screen.getByText('Partial response')).toBeInTheDocument();
    
    // Check that the inline typing indicator is displayed
    expect(screen.getByTestId('typing-indicator-inline')).toBeInTheDocument();
  });
}); 