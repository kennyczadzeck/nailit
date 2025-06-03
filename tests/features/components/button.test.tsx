/**
 * Feature: Button Component
 * All button component tests (BDD, unit, integration)
 * Comprehensive testing of UI component behavior
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../../../app/components/ui/Button'
import { bddHelpers, renderWithAuth } from '../../helpers/testUtils'

describe('Feature: Button Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * BDD Tests: User Experience Stories
   */
  describe('BDD: User Stories', () => {
    bddHelpers.userStory('Primary Button Interaction', () => {
      test('Given I see a primary button, When I click it, Then the action is triggered', () => {
        // Given: I see a primary button
        const mockOnClick = jest.fn()
        render(<Button variant="primary" onClick={mockOnClick}>Click me</Button>)
        
        // When: I click the button
        const button = screen.getByRole('button', { name: /click me/i })
        fireEvent.click(button)
        
        // Then: the action should be triggered
        expect(mockOnClick).toHaveBeenCalledTimes(1)
      })
    })

    bddHelpers.userStory('Secondary Button Styling', () => {
      test('Given I see a secondary button, When I view it, Then it has the correct appearance', () => {
        // Given: I see a secondary button
        render(<Button variant="secondary">Secondary Action</Button>)
        
        // When: I view the button
        const button = screen.getByRole('button', { name: /secondary action/i })
        
        // Then: it should have the correct styling
        expect(button).toBeInTheDocument()
        expect(button).toHaveClass('bg-[#1A73E8]') // secondary variant styles
      })
    })

    bddHelpers.userStory('Disabled Button State', () => {
      test('Given I see a disabled button, When I try to click it, Then no action occurs', () => {
        // Given: I see a disabled button
        const mockOnClick = jest.fn()
        render(<Button disabled onClick={mockOnClick}>Disabled</Button>)
        
        // When: I try to click the button
        const button = screen.getByRole('button', { name: /disabled/i })
        fireEvent.click(button)
        
        // Then: no action should occur
        expect(mockOnClick).not.toHaveBeenCalled()
        expect(button).toBeDisabled()
      })
    })

    bddHelpers.userStory('Button Size Variants', () => {
      test('Given I need different button sizes, When I specify size, Then correct styling is applied', () => {
        // Given: I need different button sizes
        const { rerender } = render(<Button size="sm">Small</Button>)
        
        // When: I specify small size
        let button = screen.getByRole('button')
        expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm')
        
        // When: I specify large size
        rerender(<Button size="lg">Large</Button>)
        button = screen.getByRole('button')
        expect(button).toHaveClass('px-6', 'py-3', 'text-base')
      })
    })

    bddHelpers.userStory('Button Type Attribute', () => {
      test('Given I need form submission, When I set type to submit, Then button acts as submit button', () => {
        // Given: I need form submission
        const mockSubmit = jest.fn()
        render(
          <form onSubmit={mockSubmit}>
            <Button type="submit">Submit Form</Button>
          </form>
        )
        
        // When: I set type to submit and click
        const button = screen.getByRole('button', { name: /submit form/i })
        expect(button).toHaveAttribute('type', 'submit')
      })
    })

    bddHelpers.userStory('Button Variants', () => {
      test('Given I need different button styles, When I specify variant, Then correct styling is applied', () => {
        // Given: I need different button styles
        const variants = [
          { variant: 'primary' as const, expectedClass: 'bg-[#34A853]' },
          { variant: 'secondary' as const, expectedClass: 'bg-[#1A73E8]' },
          { variant: 'outline' as const, expectedClass: 'border-gray-300' },
          { variant: 'ghost' as const, expectedClass: 'text-gray-700' }
        ]
        
        variants.forEach(({ variant, expectedClass }) => {
          const { rerender } = render(<Button variant={variant}>Test</Button>)
          const button = screen.getByRole('button')
          expect(button).toHaveClass(expectedClass)
          
          // Clean up for next iteration
          rerender(<div />)
        })
      })
    })
  })

  /**
   * Unit Tests: Component Props and Behavior
   */
  describe('Unit: Component Props', () => {
    test('renders with default props', () => {
      render(<Button>Default Button</Button>)
      
      const button = screen.getByRole('button', { name: /default button/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-[#34A853]') // default primary variant
      expect(button).not.toBeDisabled()
    })

    test('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>)
      
      const button = screen.getByRole('button', { name: /custom/i })
      expect(button).toHaveClass('custom-class')
    })

    test('forwards additional props to button element', () => {
      render(<Button data-testid="test-button" aria-label="Test">Button</Button>)
      
      const button = screen.getByTestId('test-button')
      expect(button).toHaveAttribute('aria-label', 'Test')
    })

    test('handles all variant types', () => {
      const variants = ['primary', 'secondary', 'outline', 'ghost'] as const
      
      variants.forEach(variant => {
        const { rerender } = render(<Button variant={variant}>Test</Button>)
        const button = screen.getByRole('button')
        expect(button).toBeInTheDocument()
        
        // Clean up for next iteration
        rerender(<div />)
      })
    })

    test('handles all size types', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      
      sizes.forEach(size => {
        const { rerender } = render(<Button size={size}>Test</Button>)
        const button = screen.getByRole('button')
        expect(button).toBeInTheDocument()
        
        // Clean up for next iteration  
        rerender(<div />)
      })
    })
  })

  /**
   * Integration Tests: Real-world Usage
   */
  describe('Integration: Real-world Usage', () => {
    test('works in authenticated context', () => {
      const mockOnClick = jest.fn()
      
      renderWithAuth(
        <Button onClick={mockOnClick}>Authenticated Action</Button>,
        { authenticated: true }
      )
      
      const button = screen.getByRole('button', { name: /authenticated action/i })
      fireEvent.click(button)
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    test('integrates with form validation', () => {
      const mockSubmit = jest.fn(e => e.preventDefault())
      
      render(
        <form onSubmit={mockSubmit}>
          <input required data-testid="required-input" />
          <Button type="submit">Submit</Button>
        </form>
      )
      
      const input = screen.getByTestId('required-input')
      const button = screen.getByRole('button', { name: /submit/i })
      
      // Test form submission with valid input
      fireEvent.change(input, { target: { value: 'valid input' } })
      fireEvent.click(button)
      
      expect(mockSubmit).toHaveBeenCalled()
    })

    test('handles disabled state properly', () => {
      const DisabledButton = () => {
        const [disabled, setDisabled] = React.useState(false)
        
        return (
          <div>
            <Button 
              disabled={disabled} 
              onClick={() => setDisabled(!disabled)}
              data-testid="toggle-button"
            >
              Toggle State
            </Button>
            <button onClick={() => setDisabled(!disabled)}>
              Toggle Disabled
            </button>
          </div>
        )
      }
      
      render(<DisabledButton />)
      
      const button = screen.getByTestId('toggle-button')
      const toggleButton = screen.getByRole('button', { name: /toggle disabled/i })
      
      // Initially not disabled
      expect(button).not.toBeDisabled()
      
      // Toggle to disabled
      fireEvent.click(toggleButton)
      expect(button).toBeDisabled()
      // The disabled styles are applied via CSS classes, so we just verify the disabled state
      expect(button).toHaveAttribute('disabled')
    })
  })
}) 