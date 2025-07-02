import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
}

/**
 * Safely logs environment variable information without exposing sensitive values
 * Only logs NEXT_PUBLIC_ variables and masks sensitive patterns
 */
export function logEnvironmentInfo() {
  if (typeof window === 'undefined') {
    // Server-side - don't log anything
    return;
  }

  const publicEnvVars = Object.keys(process?.env || {})
    .filter(key => key.startsWith('NEXT_PUBLIC_'))
    .reduce((acc, key) => {
      const value = process.env[key];
      // Mask API keys and other sensitive values
      if (key.includes('API_KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
        acc[key] = value ? `${value.substring(0, 6)}...${value.substring(value.length - 4)}` : 'undefined';
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string | undefined>);

  console.log('Public environment variables:', publicEnvVars);
}

/**
 * Checks if a required environment variable is available without exposing its value
 * 
 * IMPORTANT: This function works around Next.js production build optimizations
 * 
 * Next.js Issue:
 * - In production builds, Next.js optimizes away the process.env object
 * - Dynamic property access (process.env[name]) returns undefined
 * - Direct property access (process.env.VARIABLE_NAME) works correctly
 * - Object.keys(process.env) returns an empty array
 * 
 * Symptoms:
 * - Environment variables work on server but fail on client
 * - process.env[variableName] returns undefined despite variable being set
 * - Direct access like process.env.NEXT_PUBLIC_API_KEY works fine
 * 
 * Solution:
 * - Use switch statement with direct property access for known variables
 * - Fall back to dynamic access for backwards compatibility
 * 
 * See: docs/development/NEXTJS_ENVIRONMENT_VARIABLES.md for full details
 */
export function checkEnvironmentVariable(name: string): boolean {
  let value: string | undefined;
  
  // Handle Next.js optimized builds where dynamic property access fails
  // but direct property access works. This is required for production Docker builds.
  switch (name) {
    case 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY':
      // ✅ Direct access works in Next.js optimized builds
      value = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      break;
    case 'NEXT_PUBLIC_BUILD_TIME':
      // ✅ Direct access works in Next.js optimized builds
      value = process.env.NEXT_PUBLIC_BUILD_TIME;
      break;
    default:
      // ❌ Dynamic access fails in production but works in development
      // Keep for backwards compatibility and server-side usage
      value = process.env[name];
      break;
  }
  
  const isAvailable = !!value && value.length > 0;
  
  if (!isAvailable) {
    console.warn(`Environment variable ${name} is not configured`);
  }
  
  return isAvailable;
} 