'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Navigation } from '../components/Navigation';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Toast } from '../components/ui/Toast';
import { AddressAutocomplete } from '../components/ui/AddressAutocomplete';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { useProject } from '../components/ProjectContext';
import { 
  BellIcon,
  EnvelopeIcon,
  CogIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface AddressData {
  placeId: string;
  lat?: number;
  lng?: number;
}

export default function ProjectSettingsPage() {
  const { data: session } = useSession();
  const { currentProject: project, loading, refreshProjects } = useProject();
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  
  // Form data state for project updates
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    addressData: null as AddressData | null,
    budget: 0,
    startDate: '',
    endDate: ''
  });

  // Google Maps API key
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const showToastNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Initialize form data when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        address: project.address || '',
        addressData: project.addressPlaceId ? {
          placeId: project.addressPlaceId,
          lat: project.addressLat || 0,
          lng: project.addressLng || 0
        } : null,
        budget: project.budget || 0,
        startDate: project.startDate || '',
        endDate: project.endDate || ''
      });
    }
  }, [project]);

  const handleArchiveProject = async () => {
    if (!project) return;

    try {
      setArchiving(true);
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'archive'
        }),
      });

      if (response.ok) {
        await refreshProjects(); // Refresh project data
        showToastNotification('Project archived successfully!', 'success');
      } else {
        const error = await response.json();
        showToastNotification(error.error || 'Failed to archive project', 'error');
      }
    } catch (error) {
      console.error('Error archiving project:', error);
      showToastNotification('Failed to archive project', 'error');
    } finally {
      setArchiving(false);
      setShowArchiveModal(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToastNotification('Project deleted successfully!', 'success');
        window.location.href = '/projects/create';
      } else {
        const error = await response.json();
        showToastNotification(error.error || 'Failed to delete project', 'error');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      showToastNotification('Failed to delete project', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="lg:col-span-2">
                <div className="space-y-6">
                  <div className="h-96 bg-gray-200 rounded"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No Project Found</h1>
            <p className="text-gray-600 mb-6">Create a project first to access settings.</p>
            <Button onClick={() => window.location.href = '/projects/create'}>
              Create Your First Project
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Format dates for input fields
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  // Handle form changes
  const handleAddressChange = (value: string, addressData?: AddressData) => {
    setFormData(prev => ({
      ...prev,
      address: value,
      addressData: addressData || null
    }));
  };

  const handleBudgetChange = (value: string, numericValue: number) => {
    setFormData(prev => ({
      ...prev,
      budget: numericValue
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Project Settings</h1>
            <p className="text-gray-600 mt-1">Configure your project monitoring and notifications</p>
          </div>
        </div>

        {/* Archived Project Warning */}
        {project?.status === 'ARCHIVED' && (
          <Card className="bg-amber-50 border-amber-200 mb-8">
            <CardContent className="p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">Project Archived</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      This project is archived and read-only. Email monitoring has stopped. 
                      You can view data but cannot modify settings.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <nav className="space-y-2">
                  <a 
                    href="#monitoring" 
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('monitoring')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <EnvelopeIcon className="w-5 h-5" />
                    Email Monitoring
                  </a>
                  <a 
                    href="#notifications" 
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('notifications')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <BellIcon className="w-5 h-5" />
                    Notifications
                  </a>
                  <a 
                    href="#project" 
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('project')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <CogIcon className="w-5 h-5" />
                    Project Details
                  </a>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Email Monitoring */}
            <div id="monitoring">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <EnvelopeIcon className="w-5 h-5" />
                    Email Monitoring
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className={`${project.emailSettings?.monitoringEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <EnvelopeIcon className={`h-5 w-5 ${project.emailSettings?.monitoringEnabled ? 'text-green-400' : 'text-gray-400'}`} />
                      </div>
                      <div className="ml-3">
                        <h3 className={`text-sm font-medium ${project.emailSettings?.monitoringEnabled ? 'text-green-800' : 'text-gray-800'}`}>
                          {project.emailSettings?.monitoringEnabled ? 'Monitoring Active' : 'Monitoring Inactive'}
                        </h3>
                        <div className={`mt-2 text-sm ${project.emailSettings?.monitoringEnabled ? 'text-green-700' : 'text-gray-700'}`}>
                          <p>
                            {project.emailSettings?.monitoringEnabled 
                              ? 'NailIt is actively monitoring emails from your contractor and team members for important project updates.'
                              : 'Email monitoring is currently disabled. Enable it to track project updates.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Monitored Email Addresses</h4>
                      <div className="space-y-2">
                        {project.teamMembers && project.teamMembers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{member.email}</p>
                              <p className="text-xs text-gray-600">
                                {member.name} - {member.role === 'GENERAL_CONTRACTOR' ? 'General Contractor' : 
                                 member.role === 'ARCHITECT_DESIGNER' ? 'Architect/Designer' : 'Project Manager'}
                              </p>
                            </div>
                            <Button variant="outline" size="sm">Remove</Button>
                          </div>
                        ))}
                        {(!project.teamMembers || project.teamMembers.length === 0) && (
                          <div className="text-center py-6 text-gray-500">
                            <p className="text-sm">No team members configured for monitoring.</p>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="mt-3">
                        Add Email Address
                      </Button>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Detection Sensitivity</h4>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="radio" name="sensitivity" value="high" defaultChecked className="mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">High Sensitivity</p>
                            <p className="text-xs text-gray-600">Flag more potential changes (may include false positives)</p>
                          </div>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="sensitivity" value="medium" className="mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Medium Sensitivity (Recommended)</p>
                            <p className="text-xs text-gray-600">Balanced detection with good accuracy</p>
                          </div>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="sensitivity" value="low" className="mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Low Sensitivity</p>
                            <p className="text-xs text-gray-600">Only flag obvious and significant changes</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button>Save Monitoring Settings</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Notifications */}
            <div id="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BellIcon className="w-5 h-5" />
                    Project Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Immediate Alerts</h4>
                        <p className="text-sm text-gray-600">Get notified immediately when high-priority changes are detected</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={project.emailSettings?.highPriorityAlerts}
                        className="h-4 w-4 text-[#34A853] focus:ring-[#34A853] border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Daily Summaries</h4>
                        <p className="text-sm text-gray-600">Receive daily digest of all project activity</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={project.emailSettings?.notificationsEnabled}
                        className="h-4 w-4 text-[#34A853] focus:ring-[#34A853] border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Weekly Reports</h4>
                        <p className="text-sm text-gray-600">Comprehensive weekly project progress reports</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={project.emailSettings?.weeklyReports}
                        className="h-4 w-4 text-[#34A853] focus:ring-[#34A853] border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Milestone Reminders</h4>
                        <p className="text-sm text-gray-600">Reminders for important project deadlines</p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-[#34A853] focus:ring-[#34A853] border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Notification Schedule</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <label className="text-sm text-gray-700 w-24">Quiet Hours:</label>
                        <div className="flex items-center gap-2">
                          <input type="time" defaultValue="22:00" className="px-2 py-1 border border-gray-300 rounded text-sm" />
                          <span className="text-sm text-gray-600">to</span>
                          <input type="time" defaultValue="08:00" className="px-2 py-1 border border-gray-300 rounded text-sm" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="text-sm text-gray-700 w-24">Weekend:</label>
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-[#34A853] focus:ring-[#34A853] border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-600">Pause notifications on weekends</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button>Save Notification Settings</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Details */}
            <div id="project">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CogIcon className="w-5 h-5" />
                    Project Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
                        Project Name
                      </label>
                      <input
                        type="text"
                        id="projectName"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        readOnly={project.status === 'ARCHIVED'}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853] ${
                          project.status === 'ARCHIVED' ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>
                    <div>
                      <label htmlFor="contractor" className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Contractor
                      </label>
                      <input
                        type="text"
                        id="contractor"
                        value={project.teamMembers?.find(m => m.role === 'GENERAL_CONTRACTOR')?.name || ''}
                        readOnly={true}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                        placeholder="Set via team members"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Project Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      readOnly={project.status === 'ARCHIVED'}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853] ${
                        project.status === 'ARCHIVED' ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}
                      placeholder="Enter project description..."
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
                        value={formatDateForInput(formData.startDate)}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        readOnly={project.status === 'ARCHIVED'}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853] ${
                          project.status === 'ARCHIVED' ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>
                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Target Completion
                      </label>
                      <input
                        type="date"
                        id="endDate"
                        value={formData.endDate ? formatDateForInput(formData.endDate) : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        readOnly={project.status === 'ARCHIVED'}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853] ${
                          project.status === 'ARCHIVED' ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      {GOOGLE_MAPS_API_KEY && project.status !== 'ARCHIVED' ? (
                        <AddressAutocomplete
                          value={formData.address}
                          onChange={handleAddressChange}
                          placeholder="Enter project address..."
                          apiKey={GOOGLE_MAPS_API_KEY}
                        />
                      ) : (
                        <input
                          type="text"
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          readOnly={project.status === 'ARCHIVED'}
                          placeholder={!GOOGLE_MAPS_API_KEY ? "Google Maps API key required for autocomplete" : "Enter project address..."}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#34A853] focus:border-[#34A853] ${
                            project.status === 'ARCHIVED' ? 'bg-gray-50 cursor-not-allowed' : ''
                          }`}
                        />
                      )}
                    </div>
                    <div>
                      <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                        Budget
                      </label>
                      <CurrencyInput
                        value={formData.budget}
                        onChange={handleBudgetChange}
                        placeholder="Enter project budget"
                        disabled={project.status === 'ARCHIVED'}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button disabled={project.status === 'ARCHIVED'}>
                      {project.status === 'ARCHIVED' ? 'Project Archived' : 'Update Project Details'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Actions */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  Project Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Archive Project</h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    {project.status === 'ARCHIVED' 
                      ? 'Project archived. Email monitoring stopped, data is read-only.'
                      : 'Archive project to stop monitoring and preserve data. Creates space for new projects.'
                    }
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-yellow-700 border-yellow-300 hover:bg-yellow-50" 
                    onClick={() => setShowArchiveModal(true)}
                    disabled={archiving || project.status === 'ARCHIVED'}
                  >
                    {archiving ? 'Archiving...' : project.status === 'ARCHIVED' ? 'Already Archived' : 'Archive Project'}
                  </Button>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Delete Project</h4>
                  <p className="text-sm text-red-700 mb-3">
                    Permanently delete this project and all associated data. This action cannot be undone.
                  </p>
                  <Button variant="outline" size="sm" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => setShowDeleteModal(true)}>
                    {deleting ? 'Deleting...' : 'Delete Project'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Archive Confirmation Modal */}
      {showArchiveModal && project && (
        <ConfirmModal
          isOpen={showArchiveModal}
          onClose={() => setShowArchiveModal(false)}
          onConfirm={handleArchiveProject}
          title="Archive Project"
          description={`Archive "${project.name}"?

This will:
• Stop email monitoring
• Make project read-only
• Enable creation of new projects

Archived project data remains accessible for viewing.`}
          confirmText="Archive Project"
          cancelText="Cancel"
          type="warning"
          loading={archiving}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && project && (
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteProject}
          title="Delete Project"
          description={`Are you sure you want to PERMANENTLY DELETE "${project.name}"?

This will:
• Delete all project data
• Delete all timeline entries
• Delete all flagged items
• This action CANNOT be undone`}
          confirmText="Delete Project"
          cancelText="Cancel"
          type="danger"
          requiresTextConfirmation={true}
          confirmationText={project.name}
          loading={deleting}
        />
      )}

      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        title={toastMessage}
        type={toastType}
      />
    </div>
  );
} 