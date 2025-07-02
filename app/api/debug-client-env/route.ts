import { NextRequest, NextResponse } from 'next/server';
import { withDebugSecurity, debugSecurityHeaders } from '../../lib/security-middleware';

async function handleDebugClientEnv(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  
  if (format === 'html') {
    // Return HTML page with client-side JavaScript test (sanitized)
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Environment Variable Debug (Secured)</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .result { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; }
    </style>
</head>
<body>
    <h1>Client-Side Environment Variable Test (Secured)</h1>
    <div class="result warning">
        <strong>⚠️ Security Notice:</strong> This endpoint is for debugging only and requires authentication in production.
    </div>
    <div id="results"></div>
    
    <script>
        function runTest() {
            const results = document.getElementById('results');
            
            // Test availability without exposing actual values
            const hasGoogleMapsKey = typeof process !== 'undefined' && 
                                   process.env && 
                                   process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            const hasBuildTime = typeof process !== 'undefined' && 
                               process.env && 
                               process.env.NEXT_PUBLIC_BUILD_TIME;
            
            results.innerHTML = \`
                <div class="result \${hasGoogleMapsKey ? 'success' : 'error'}">
                    <strong>Google Maps API Key:</strong> \${hasGoogleMapsKey ? 'Available' : 'Not Available'}
                </div>
                <div class="result \${hasBuildTime ? 'success' : 'error'}">
                    <strong>Build Time:</strong> \${hasBuildTime ? 'Available' : 'Not Available'}
                </div>
                <div class="result">
                    <strong>Test Time:</strong> \${new Date().toISOString()}
                </div>
                <div class="result">
                    <strong>Environment:</strong> \${typeof process !== 'undefined' && process.env ? process.env.NODE_ENV || 'unknown' : 'client-side'}
                </div>
            \`;
        }
        
        // Run test when page loads
        document.addEventListener('DOMContentLoaded', runTest);
    </script>
</body>
</html>`;
    
    return new NextResponse(html, {
      headers: { 
        'Content-Type': 'text/html',
        ...debugSecurityHeaders
      },
    });
  }

  // Secure version - only show availability, not actual values
  const nextPublicKeys = Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'));
  
  const clientEnvVars = {
    // Safe to show - only existence, not values
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'SET' : 'NOT_SET',
    NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME ? 'SET' : 'NOT_SET',
    
    // Show which NEXT_PUBLIC_ variables exist (keys only)
    nextPublicKeysFound: nextPublicKeys,
    nextPublicKeysCount: nextPublicKeys.length,
    
    // Build-time vs runtime info
    buildInfo: {
      nodeEnv: process.env.NODE_ENV,
      nailItEnvironment: process.env.NAILIT_ENVIRONMENT,
      timestamp: new Date().toISOString(),
      isServer: typeof window === 'undefined',
    }
  };

  return NextResponse.json({
    success: true,
    clientEnvironmentVariables: clientEnvVars,
    message: 'This shows NEXT_PUBLIC_ environment variable availability (secured version)',
    warning: 'This endpoint is for debugging only and should not be accessible in production'
  }, {
    headers: debugSecurityHeaders
  });
}

// Apply security middleware
export const GET = withDebugSecurity(handleDebugClientEnv) 