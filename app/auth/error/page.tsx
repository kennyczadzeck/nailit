'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration. Please try again later.';
      case 'AccessDenied':
        return 'You denied access to the application. Please try again and grant permission to continue.';
      case 'Verification':
        return 'The verification link was invalid or has expired. Please try signing in again.';
      case 'OAuthSignin':
        return 'Error in constructing an authorization URL. Please try again.';
      case 'OAuthCallback':
        return 'Error in handling the response from OAuth provider. Please try again.';
      case 'OAuthCreateAccount':
        return 'Could not create OAuth account in the database. Please try again.';
      case 'EmailCreateAccount':
        return 'Could not create email account in the database. Please try again.';
      case 'Callback':
        return 'Error in the OAuth callback handler route. Please try again.';
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with another account. Please use the original sign-in method.';
      case 'EmailSignin':
        return 'Error sending the verification email. Please try again.';
      case 'CredentialsSignin':
        return 'Invalid credentials provided. Please check your details and try again.';
      case 'SessionRequired':
        return 'You must be signed in to access this page.';
      default:
        return 'An unexpected error occurred during authentication. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Authentication Error
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We encountered an issue while signing you in
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error || 'Authentication Failed'}
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{getErrorMessage(error)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Link href="/auth/signin">
                <Button className="w-full">
                  Try Again
                </Button>
              </Link>
              
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Go Home
                </Button>
              </Link>
            </div>

            {error === 'AccessDenied' && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  Why do we need access?
                </h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Read your Gmail to monitor project communications</li>
                  <li>• Send reply emails through the platform</li>
                  <li>• Access is required for core functionality</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gray-100">
            <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Loading...
          </h2>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
} 