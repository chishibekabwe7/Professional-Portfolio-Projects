import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, act, cleanup } from '@testing-library/react'
import { RateLimitCountdown } from './RateLimitCountdown'
import React from 'react'
import '../../../test/mocks'
import { renderWithConfig } from '../../../test/testUtils'

// Mock the Lucide React Clock icon
vi.mock('lucide-react', () => ({
  Clock: () => React.createElement('div', { 'data-testid': 'clock-icon' })
}))

describe('RateLimitCountdown', () => {
  beforeEach(() => {
    // Setup fake timers
    vi.useFakeTimers()
  })

  afterEach(() => {
    // Restore real timers
    vi.useRealTimers()
  })

  it('renders the countdown with correct initial time', () => {
    renderWithConfig(<RateLimitCountdown seconds={10} />)
    expect(screen.getByText('Try again in 10 seconds')).toBeInTheDocument()
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
  })

  it('decrements the countdown every second', () => {
    renderWithConfig(<RateLimitCountdown seconds={3} />)
    
    // Initial state
    expect(screen.getByText('Try again in 3 seconds')).toBeInTheDocument()
    
    // Advance timer by 1 second
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Try again in 2 seconds')).toBeInTheDocument()
    
    // Advance timer by another second
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Try again in 1 seconds')).toBeInTheDocument()
  })

  it('stops at zero and does not render when countdown reaches zero', () => {
    renderWithConfig(<RateLimitCountdown seconds={1} />)
    
    // Initial state
    expect(screen.getByText('Try again in 1 seconds')).toBeInTheDocument()
    
    // Advance timer to reach zero
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    
    // Component should not render anything when countdown reaches zero
    expect(screen.queryByText(/Try again in/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('clock-icon')).not.toBeInTheDocument()
  })

  it('does not render when seconds prop is 0 or negative', () => {
    renderWithConfig(<RateLimitCountdown seconds={0} />)
    expect(screen.queryByText(/Try again in/)).not.toBeInTheDocument()
    
    // Cleanup and re-render with negative value
    cleanup()
    renderWithConfig(<RateLimitCountdown seconds={-5} />)
    expect(screen.queryByText(/Try again in/)).not.toBeInTheDocument()
  })

  it('clears interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    const { unmount } = renderWithConfig(<RateLimitCountdown seconds={10} />)
    
    unmount()
    
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })
}) 