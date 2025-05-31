'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navigation } from '../../components/Navigation';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  UserPlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function NewProjectPage() {
  const router = useRouter();
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: '',
    address: '',
  });

  // Contractor is required, others are optional
  const [contractor, setContractor] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [optionalTeamMembers, setOptionalTeamMembers] = useState<Array<{
    id: number;
    name: string;
    email: string;
    role: string;
  }>>([]);

  const handleInputChange = (field: string, value: string) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
  };

  const handleContractorChange = (field: string, value: string) => {
    setContractor(prev => ({ ...prev, [field]: value }));
  };

  const addOptionalTeamMember = () => {
    setOptionalTeamMembers(prev => [...prev, { 
      id: Date.now(), 
      name: '', 
      email: '', 
      role: 'Subcontractor' 
    }]);
  };

  const removeOptionalTeamMember = (id: number) => {
    setOptionalTeamMembers(prev => prev.filter(member => member.id !== id));
  };

  const updateOptionalTeamMember = (id: number, field: string, value: string) => {
    setOptionalTeamMembers(prev => prev.map(member => 
      member.id === id ? { ...member, [field]: value } : member
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement project creation logic
    alert('Project created successfully! You can now start monitoring your renovation communications.');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/connect-gmail">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Your Project</h1>
            <p className="text-gray-600 mt-1">Set up monitoring for your renovation project</p>
          </div>
        </div>

        {/* MVP Notice */}
        <Card className="bg-blue-50 border-blue-200 mb-8">
          <CardContent className="p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Single Project Focus
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    For the MVP, you can have one active project at a time. This helps us provide 
                    focused monitoring and protection. Multi-project support will be added in future updates.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={projectData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853]"
                    placeholder="e.g., Kitchen Renovation"
                  />
                </div>
                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                    Budget (Optional)
                  </label>
                  <input
                    type="text"
                    id="budget"
                    value={projectData.budget}
                    onChange={(e) => handleInputChange('budget', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853]"
                    placeholder="e.g., $50,000"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={projectData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853]"
                  placeholder="Brief description of your renovation project"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Address
                </label>
                <input
                  type="text"
                  id="address"
                  value={projectData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853]"
                  placeholder="123 Main St, City, State"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={projectData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853]"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Expected End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={projectData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Primary Contractor - Required */}
          <Card>
            <CardHeader>
              <CardTitle>Primary Contractor *</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contractor Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={contractor.name}
                      onChange={(e) => handleContractorChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853]"
                      placeholder="Full name or company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={contractor.email}
                      onChange={(e) => handleContractorChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853]"
                      placeholder="contractor@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={contractor.phone}
                      onChange={(e) => handleContractorChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853]"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optional Team Members */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Additional Team Members</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Optional - Add subcontractors, architects, designers, etc.</p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addOptionalTeamMember}
                  className="flex items-center gap-2"
                >
                  <UserPlusIcon className="w-4 h-4" />
                  Add Team Member
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {optionalTeamMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserPlusIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No additional team members added yet.</p>
                  <p className="text-sm">You can add them now or later in project settings.</p>
                </div>
              ) : (
                optionalTeamMembers.map((member, index) => (
                  <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Team Member {index + 1}
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOptionalTeamMember(member.id)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={member.name}
                          onChange={(e) => updateOptionalTeamMember(member.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853]"
                          placeholder="Full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={member.email}
                          onChange={(e) => updateOptionalTeamMember(member.id, 'email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853]"
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Role
                        </label>
                        <select
                          value={member.role}
                          onChange={(e) => updateOptionalTeamMember(member.id, 'role', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853]"
                        >
                          <option value="Subcontractor">Subcontractor</option>
                          <option value="Architect">Architect</option>
                          <option value="Designer">Designer</option>
                          <option value="Supplier">Supplier</option>
                          <option value="Inspector">Inspector</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/connect-gmail">
              <Button variant="outline">Back</Button>
            </Link>
            <Button type="submit" className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Create Project & Start Monitoring
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
} 