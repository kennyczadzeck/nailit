/**
 * Unit Tests for Button Component
 * Tests component behavior with centralized fixtures
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../../../app/components/ui/Button'

// Use centralized fixtures for consistent test patterns
import { testPatterns } from '../../fixtures'

describe('Button Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic rendering', () => {
    test('renders with default props', () => {
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: /click me/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-[#34A853]') // primary variant
      expect(button).toHaveClass('px-4', 'py-2') // md size
    })

    test('renders with different variants', () => {
      const { rerender } = render(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-[#1A73E8]')

      rerender(<Button variant="outline">Outline</Button>)
      expect(screen.getByRole('button')).toHaveClass('border', 'border-gray-300')

      rerender(<Button variant="ghost">Ghost</Button>)
      expect(screen.getByRole('button')).toHaveClass('text-gray-700', 'hover:bg-gray-100')
    })

    test('renders with different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>)
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm')

      rerender(<Button size="lg">Large</Button>)
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base')
    })

    test('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>)
      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })
  })

  describe('Interactive behavior', () => {
    test('handles click events', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Clickable</Button>)
      
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    test('passes through HTML button attributes', () => {
      render(<Button disabled type="submit" data-testid="submit-btn">Submit</Button>)
      
      const button = screen.getByTestId('submit-btn')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('type', 'submit')
    })

    test('applies disabled styles when disabled', () => {
      render(<Button disabled>Disabled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:pointer-events-none')
    })
  })

  describe('Accessibility', () => {
    test('has proper accessibility attributes', () => {
      render(<Button>Accessible Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2')
    })

    test('preserves custom attributes', () => {
      render(
        <Button data-testid="custom-button" aria-label="Custom button">
          Button
        </Button>
      )
      
      const button = screen.getByTestId('custom-button')
      expect(button).toHaveAttribute('aria-label', 'Custom button')
    })
  })

  describe('Text pattern validation using centralized fixtures', () => {
    test('button text follows expected patterns', () => {
      const buttonTexts = ['Create', 'Save', 'Cancel', 'Delete', 'Edit']
      
      buttonTexts.forEach(text => {
        expect(text).toMatch(testPatterns.ui.buttonText)
      })
    })

    test('can render buttons with standard action text', () => {
      const standardActions = ['Create', 'Save', 'Cancel']
      
      standardActions.forEach(action => {
        render(<Button>{action}</Button>)
        expect(screen.getByRole('button', { name: action })).toBeInTheDocument()
      })
    })
  })
}) 