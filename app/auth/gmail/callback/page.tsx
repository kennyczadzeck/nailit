'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CallbackContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">OAuth Error</h1>
            <p className="text-gray-600 mb-4">Error: {error}</p>
            <p className="text-sm text-gray-500">
              Please try the OAuth setup again or check your Google Cloud Console configuration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="text-yellow-600 text-6xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Waiting for Authorization</h1>
            <p className="text-gray-600">
              No authorization code received yet. Please complete the OAuth flow.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">OAuth Authorization Successful!</h1>
          
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Authorization Code:</h2>
            <div className="bg-white border rounded p-3 font-mono text-sm break-all select-all">
              {code}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">Next Steps:</h3>
            <ol className="text-left text-blue-700 space-y-1">
              <li>1. Copy the authorization code above</li>
              <li>2. Go back to your terminal</li>
              <li>3. Run: <code className="bg-blue-100 px-1 rounded">npm run test:oauth-callback contractor &lt;code&gt;</code></li>
            </ol>
          </div>

          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            📋 Copy Code to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
} 