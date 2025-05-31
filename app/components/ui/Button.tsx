import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-[#34A853] text-white hover:bg-[#2D9348] focus:ring-[#34A853]',
    secondary: 'bg-[#1A73E8] text-white hover:bg-[#1557B0] focus:ring-[#1A73E8]',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-[#34A853]',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-[#34A853]',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}; 