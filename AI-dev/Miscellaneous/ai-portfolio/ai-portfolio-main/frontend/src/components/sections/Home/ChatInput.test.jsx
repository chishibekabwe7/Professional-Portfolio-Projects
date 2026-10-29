import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './ChatInput';
import React from 'react';
import '../../../test/mocks';
import { renderWithConfig } from '../../../test/testUtils';

describe('ChatInput', () => {
  const defaultProps = {
    input: '',
    setInput: vi.fn(),
    isLoading: false,
    onSubmit: vi.fn(),
    onStop: vi.fn()
  };

  it('renders the form with input and submit button', () => {
    renderWithConfig(<ChatInput {...defaultProps} />);
    
    // Check that the input is rendered
    expect(screen.getByPlaceholderText('Ask me anything about Alon...')).toBeInTheDocument();
    
    // Check that the submit button is rendered
    const submitButton = screen.getByRole('button', { type: 'submit' });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled(); // Initially disabled because input is empty
  });
  
  it('enables the submit button when input has text', () => {
    renderWithConfig(<ChatInput {...defaultProps} input="Test message" />);
    
    // Check that the submit button is enabled
    const submitButton = screen.getByRole('button', { type: 'submit' });
    expect(submitButton).not.toBeDisabled();
  });
  
  it('disables the submit button when loading is true', () => {
    renderWithConfig(<ChatInput {...defaultProps} input="Test message" isLoading={true} />);
    
    // Check that the stop button is shown instead of submit button
    expect(screen.queryByRole('button', { name: /send/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { type: 'button' })).toBeInTheDocument();
  });
  
  it('calls onSubmit with the input value when form is submitted', () => {
    const handleSubmit = vi.fn();
    renderWithConfig(<ChatInput {...defaultProps} input="Test message" onSubmit={handleSubmit} />);
    
    // Submit the form
    const form = screen.getByPlaceholderText('Ask me anything about Alon...').closest('form');
    fireEvent.submit(form);
    
    // Check that onSubmit was called with the correct value
    expect(handleSubmit).toHaveBeenCalledWith('Test message');
    
    // Check that setInput was called to clear the input
    expect(defaultProps.setInput).toHaveBeenCalledWith('');
  });
  
  it('does not submit if the input is empty', () => {
    const handleSubmit = vi.fn();
    renderWithConfig(<ChatInput {...defaultProps} onSubmit={handleSubmit} />);
    
    // Submit the form without typing anything
    const form = screen.getByPlaceholderText('Ask me anything about Alon...').closest('form');
    fireEvent.submit(form);
    
    // Check that onSubmit was not called
    expect(handleSubmit).not.toHaveBeenCalled();
  });
  
  it('does not submit if loading is true', () => {
    const handleSubmit = vi.fn();
    renderWithConfig(<ChatInput {...defaultProps} input="Test message" isLoading={true} onSubmit={handleSubmit} />);
    
    // Submit the form
    const form = screen.getByPlaceholderText('Ask me anything about Alon...').closest('form');
    fireEvent.submit(form);
    
    // Check that onSubmit was not called
    expect(handleSubmit).not.toHaveBeenCalled();
  });
  
  it('calls onStop when stop button is clicked', () => {
    const handleStop = vi.fn();
    renderWithConfig(<ChatInput {...defaultProps} isLoading={true} onStop={handleStop} />);
    
    // Click the stop button
    const stopButton = screen.getByRole('button', { type: 'button' });
    fireEvent.click(stopButton);
    
    // Check that onStop was called
    expect(handleStop).toHaveBeenCalled();
  });
  
  it('updates input value when typing', () => {
    const setInput = vi.fn();
    renderWithConfig(<ChatInput {...defaultProps} setInput={setInput} />);
    
    // Type in the input
    const input = screen.getByPlaceholderText('Ask me anything about Alon...');
    fireEvent.change(input, { target: { value: 'New message' } });
    
    // Check that setInput was called with the new value
    expect(setInput).toHaveBeenCalledWith('New message');
  });
}); 