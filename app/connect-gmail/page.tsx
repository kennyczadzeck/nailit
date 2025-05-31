'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '../components/Navigation';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  EnvelopeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  EyeIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

export default function ConnectGmailPage() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnectGmail = () => {
    setIsConnecting(true);
    // TODO: Implement Google OAuth flow
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      alert('Gmail connection will be implemented in Phase 3 with Google OAuth 2.0');
    }, 2000);
  };

  const permissions = [
    {
      icon: EyeIcon,
      title: 'Read Email Messages',
      description: 'Access to read emails from your renovation project team members',
      required: true
    },
    {
      icon: EnvelopeIcon,
      title: 'Send Emails',
      description: 'Send confirmation emails to contractors on your behalf',
      required: false
    },
    {
      icon: LockClosedIcon,
      title: 'Secure Access',
      description: 'All access is encrypted and can be revoked at any time',
      required: true
    }
  ];

  const securityFeatures = [
    'Bank-level encryption for all data transmission',
    'Read-only access to project-related emails only',
    'No access to personal or unrelated emails',
    'Revoke access anytime from your Google account',
    'Data processed securely and never stored unnecessarily',
    'Full audit trail of all access and actions'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#34A853] rounded-full flex items-center justify-center mx-auto mb-4">
            <EnvelopeIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Connect Your Gmail</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Securely connect your Gmail account to start monitoring your renovation project communications. 
            NailIt will automatically detect important changes and keep you protected.
          </p>
        </div>

        {!isConnected ? (
          <div className="space-y-8">
            {/* Connection Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <EnvelopeIcon className="w-5 h-5" />
                  Gmail Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Connect with Google
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Use your Google account to securely connect Gmail
                  </p>
                  <Button 
                    onClick={handleConnectGmail}
                    disabled={isConnecting}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    {isConnecting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <EnvelopeIcon className="w-5 h-5" />
                        Connect Gmail Account
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Permissions */}
            <Card>
              <CardHeader>
                <CardTitle>Required Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {permissions.map((permission, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <permission.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900">{permission.title}</h4>
                          {permission.required && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <ShieldCheckIcon className="w-5 h-5" />
                  Your Privacy is Protected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {securityFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Success State */
          <div className="text-center">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="py-12">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircleIcon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Gmail Successfully Connected!
                </h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Great! Now let's set up your first renovation project so NailIt can start 
                  monitoring your project communications and protecting you from unexpected changes.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/projects/new">
                    <Button size="lg" className="flex items-center gap-2">
                      <ArrowRightIcon className="w-5 h-5" />
                      Create Your Project
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Help Section */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Need Help?
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    If you have questions about Gmail integration or need assistance, 
                    visit our <Link href="/help" className="underline">help center</Link> or 
                    contact our support team.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 