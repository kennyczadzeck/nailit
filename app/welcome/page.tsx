import React from 'react';
import Link from 'next/link';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { 
  ShieldCheckIcon, 
  ClockIcon, 
  DocumentTextIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#34A853] rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                  <path d="M6 18l3-3 3 3"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">NailIt</span>
            </Link>
            <Link href="/auth/signin">
              <Button variant="outline" size="sm">
                Sign In with Google
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Never Miss Another
            <span className="text-[#34A853] block">Project Change</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            NailIt monitors your renovation project emails and automatically flags important changes in pricing, scope, and schedule. 
            Stay protected and in control of your project.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signin">
              <Button size="lg" className="text-lg px-8 py-4">
                Get Started with Google
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                See How It Works
              </Button>
            </a>
          </div>
        </div>

        {/* Problem Statement */}
        <div className="mb-16">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="text-center">
              <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Don&apos;t Let Important Changes Slip Through
              </h2>
              <p className="text-gray-700 text-lg">
                Renovation projects involve hundreds of emails. Critical changes to pricing, scope, or timeline 
                can get buried in your inbox, leading to costly surprises and disputes.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardContent className="text-center">
              <ShieldCheckIcon className="w-12 h-12 text-[#34A853] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Automatic Protection
              </h3>
              <p className="text-gray-600">
                AI monitors your Gmail and automatically flags important changes in project communications.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="text-center">
              <ClockIcon className="w-12 h-12 text-[#1A73E8] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Real-Time Alerts
              </h3>
              <p className="text-gray-600">
                Get notified immediately when pricing, scope, or schedule changes are detected.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="text-center">
              <DocumentTextIcon className="w-12 h-12 text-[#34A853] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Audit Trail
              </h3>
              <p className="text-gray-600">
                Maintain a complete record of all project decisions and changes for your protection.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">How NailIt Protects Your Project</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Sign in with Google', desc: 'Securely connect your Gmail account' },
              { step: '2', title: 'Set Up Project', desc: 'Add your contractor and project details' },
              { step: '3', title: 'Monitor Emails', desc: 'AI scans all project communications' },
              { step: '4', title: 'Get Protected', desc: 'Receive alerts and maintain audit trail' },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center">
                <div className="w-12 h-12 bg-[#34A853] text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="bg-[#34A853] text-white">
            <CardContent>
              <h2 className="text-3xl font-bold mb-4">
                Start Protecting Your Project Today
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Join homeowners who never miss important project changes
              </p>
              <Link href="/auth/signin">
                <Button variant="outline" size="lg" className="bg-white text-[#34A853] hover:bg-gray-100">
                  Get Started with Google
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 