'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Navigation } from '../components/Navigation';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  UserCircleIcon,
  ShieldCheckIcon,
  KeyIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

export default function AccountPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-1">Manage your personal account and security preferences</p>
        </div>

        <div className="space-y-8">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircleIcon className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                {session?.user?.image && (
                  <img 
                    src={session.user.image} 
                    alt={session.user.name || 'Profile'} 
                    className="w-20 h-20 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {session?.user?.name || 'User Name'}
                  </h3>
                  <p className="text-gray-600">{session?.user?.email}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Profile managed through Google Account
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ShieldCheckIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Google Account Integration
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Your profile information is synced with your Google account. 
                        To update your name or profile picture, please visit your Google Account settings.
                      </p>
                    </div>
                    <div className="mt-3">
                      <a 
                        href="https://myaccount.google.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-800 hover:text-blue-900"
                      >
                        Manage Google Account →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connected Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyIcon className="w-5 h-5" />
                Connected Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Google Account</p>
                      <p className="text-sm text-gray-600">{session?.user?.email}</p>
                      <p className="text-xs text-green-600">✓ Connected & Active</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Primary account
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>NailIt uses your Google account for authentication and Gmail integration. 
                Disconnecting would sign you out and disable email monitoring.</p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ShieldCheckIcon className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Your Data is Protected
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Bank-level encryption for all data transmission</li>
                        <li>Minimal data collection - only what&apos;s needed for functionality</li>
                        <li>No sharing of personal information with third parties</li>
                        <li>Secure storage with automatic backups</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Data Retention</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Your email data is processed for project monitoring and stored securely. 
                    You can request data export or deletion at any time.
                  </p>
                  <Button variant="outline" size="sm">Request Data Export</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <TrashIcon className="w-5 h-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Delete Account</h4>
                <p className="text-sm text-red-700 mb-3">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button variant="outline" size="sm" className="text-red-700 border-red-300 hover:bg-red-50">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 