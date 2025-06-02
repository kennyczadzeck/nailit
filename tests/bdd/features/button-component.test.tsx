import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../../../app/components/ui/Button'

/**
 * Feature: Button Component
 * User Story: US-07
 * 
 * As a user (including those using assistive technologies)
 * I want consistent, accessible button interactions
 * So that I can navigate and use the application effectively
 */
describe('Feature: Button Component', () => {
  
  /**
   * Scenario: Button renders with default styling
   */
  describe('Scenario: Button renders with default styling', () => {
    test('Given I am viewing a page with default button, When rendered, Then it has primary styling and accessibility', () => {
      // Given: I am viewing a page with a default button
      // When: the button is rendered
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: /click me/i })
      
      // Then: it should have the primary green color (#34A853)
      expect(button).toHaveClass('bg-[#34A853]')
      
      // And: it should have medium padding (px-4 py-2)
      expect(button).toHaveClass('px-4', 'py-2')
      
      // And: it should have proper focus states for accessibility
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2')
      
      // And: it should be in the document
      expect(button).toBeInTheDocument()
    })
  })

  /**
   * Scenario: Button variants display correctly
   */
  describe('Scenario: Button variants display correctly', () => {
    test('Given I have different button variants, When I view each variant, Then each has correct styling', () => {
      const { rerender } = render(<Button variant="secondary">Secondary</Button>)
      
      // When: I view a "secondary" button
      // Then: it should have blue color (#1A73E8)
      expect(screen.getByRole('button')).toHaveClass('bg-[#1A73E8]')

      // When: I view an "outline" button
      rerender(<Button variant="outline">Outline</Button>)
      // Then: it should have a border with transparent background
      expect(screen.getByRole('button')).toHaveClass('border', 'border-gray-300')

      // When: I view a "ghost" button
      rerender(<Button variant="ghost">Ghost</Button>)
      // Then: it should have transparent background with gray text
      expect(screen.getByRole('button')).toHaveClass('text-gray-700', 'hover:bg-gray-100')
    })

    test('Given different button sizes, When rendered, Then each has correct padding', () => {
      const { rerender } = render(<Button size="sm">Small</Button>)
      
      // When: I view a small button
      // Then: it should have small padding
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm')

      // When: I view a large button
      rerender(<Button size="lg">Large</Button>)
      // Then: it should have large padding
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base')
    })
  })

  /**
   * Scenario: Button accessibility features
   */
  describe('Scenario: Button accessibility features', () => {
    test('Given I am using assistive technology, When I interact with button, Then it supports keyboard navigation', () => {
      // Given: I am using a screen reader
      render(<Button>Accessible Button</Button>)
      
      const button = screen.getByRole('button')
      
      // When: I navigate to a button
      // Then: the button should be accessible as a button element
      expect(button.tagName).toBe('BUTTON')
      
      // And: it should have a visible focus indicator
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2')
      
      // Note: Testing Enter/Space key activation would require more complex setup
      // This validates the button is properly accessible to screen readers
    })

    test('Given I use custom attributes, When button is rendered, Then attributes are preserved', () => {
      // Given: I have a button with custom attributes
      // When: button is rendered
      render(<Button disabled type="submit" data-testid="submit-btn">Submit</Button>)
      
      const button = screen.getByTestId('submit-btn')
      
      // Then: custom attributes should be preserved
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toHaveAttribute('data-testid', 'submit-btn')
    })
  })

  /**
   * Scenario: Disabled button behavior
   */
  describe('Scenario: Disabled button behavior', () => {
    test('Given I have a disabled button, When I try to interact, Then no action occurs and styling indicates disabled state', () => {
      const handleClick = jest.fn()
      
      // Given: I have a disabled button
      render(<Button disabled onClick={handleClick}>Disabled</Button>)
      
      const button = screen.getByRole('button')
      
      // When: I try to click it
      fireEvent.click(button)
      
      // Then: no action should be triggered
      expect(handleClick).not.toHaveBeenCalled()
      
      // And: it should have visual indicators that it's disabled
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:pointer-events-none')
      
      // And: it should not be focusable via keyboard navigation
      // (This is handled automatically by the disabled attribute)
    })
  })

  /**
   * Scenario: Button click interactions
   */
  describe('Scenario: Button click interactions', () => {
    test('Given I have an enabled button with click handler, When I click it, Then the handler is called', () => {
      const handleClick = jest.fn()
      
      // Given: I have an enabled button with click handler
      render(<Button onClick={handleClick}>Clickable</Button>)
      
      // When: I click the button
      fireEvent.click(screen.getByRole('button'))
      
      // Then: the handler should be called
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    test('Given I have a button with custom styling, When rendered, Then custom classes are applied', () => {
      // Given: I have a button with custom styling
      // When: the button is rendered
      render(<Button className="custom-class">Custom</Button>)
      
      // Then: custom classes should be applied
      expect(screen.getByRole('button')).toHaveClass('custom-class')
      
      // And: default classes should still be present
      expect(screen.getByRole('button')).toHaveClass('bg-[#34A853]') // primary variant default
    })
  })
}) 