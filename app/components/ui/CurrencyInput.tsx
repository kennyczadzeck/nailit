'use client';

import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value: string | number;
  onChange: (value: string, numericValue: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = "Enter budget...",
  className = "",
  disabled = false
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Format number as currency
  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Parse currency string to number
  const parseCurrency = (str: string): number => {
    // Remove all non-digit characters except decimal point
    const numericStr = str.replace(/[^\d.]/g, '');
    const num = parseFloat(numericStr);
    return isNaN(num) ? 0 : num;
  };

  // Update display value when prop value changes
  useEffect(() => {
    if (!isFocused) {
      const numericValue = typeof value === 'string' ? parseCurrency(value) : (value || 0);
      if (numericValue > 0) {
        setDisplayValue(formatCurrency(numericValue));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number when focused for easier editing
    const numericValue = typeof value === 'string' ? parseCurrency(value) : (value || 0);
    if (numericValue > 0) {
      setDisplayValue(numericValue.toString());
    } else {
      setDisplayValue('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numericValue = parseCurrency(displayValue);
    
    // Format and update parent
    if (numericValue > 0) {
      const formatted = formatCurrency(numericValue);
      setDisplayValue(formatted);
      onChange(formatted, numericValue);
    } else {
      setDisplayValue('');
      onChange('', 0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    if (isFocused) {
      // Allow only numbers and decimal point when focused
      const sanitized = inputValue.replace(/[^\d.]/g, '');
      
      // Prevent multiple decimal points
      const parts = sanitized.split('.');
      if (parts.length > 2) {
        return;
      }
      
      setDisplayValue(sanitized);
      
      // Update parent with current numeric value during typing
      const numericValue = parseCurrency(sanitized);
      onChange(sanitized, numericValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, decimal point
    if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true) ||
        // Allow: home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)) {
      return;
    }
    
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={isFocused ? placeholder.replace(/^\$\s*/, '') : `$ ${placeholder.replace(/^\$\s*/, '')}`}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
        disabled ? 'bg-gray-50 cursor-not-allowed' : ''
      } ${className}`}
    />
  );
}; 