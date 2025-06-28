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
 */
export function checkEnvironmentVariable(name: string): boolean {
  const value = process.env[name];
  const isAvailable = !!value && value.length > 0;
  
  if (!isAvailable) {
    console.warn(`Environment variable ${name} is not configured`);
  }
  
  return isAvailable;
} 