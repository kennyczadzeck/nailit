'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '../components/Navigation';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Toast } from '../components/ui/Toast';
import {
  ArchiveBoxIcon,
  PlusIcon,
  CheckCircleIcon,
  FlagIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

interface Project {
  id: string;
  name: string;
  contractor: string;
  startDate: string;
  createdAt: string;
  status: string;
  _count: {
    flaggedItems: number;
    timelineEntries: number;
  };
}

interface TimelineEntry {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  type: string;
}

interface FlaggedItem {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  priority: string;
  status: string;
}

interface ActivityItem {
  id: string;
  type: 'timeline' | 'flagged' | 'email';
  message: string;
  time: string;
  project: string;
  createdAt: Date;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const showToastNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        
        // Fetch recent activity for the first project (will be active if any exist due to sorting)
        if (data.length > 0) {
          await fetchRecentActivity(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentActivity = async (projectId: string) => {
    try {
      // Fetch timeline entries and flagged items in parallel
      const [timelineResponse, flaggedResponse] = await Promise.all([
        fetch(`/api/timeline?projectId=${projectId}`),
        fetch(`/api/flagged-items?projectId=${projectId}`)
      ]);

      const activities: ActivityItem[] = [];

      if (timelineResponse.ok) {
        const timelineData: TimelineEntry[] = await timelineResponse.json();
        timelineData.slice(0, 3).forEach((entry) => {
          activities.push({
            id: `timeline-${entry.id}`,
            type: 'timeline',
            message: entry.title,
            time: formatTimeAgo(new Date(entry.createdAt)),
            project: projects[0]?.name || 'Project',
            createdAt: new Date(entry.createdAt)
          });
        });
      }

      if (flaggedResponse.ok) {
        const flaggedData: FlaggedItem[] = await flaggedResponse.json();
        flaggedData.slice(0, 2).forEach((item) => {
          activities.push({
            id: `flagged-${item.id}`,
            type: 'flagged',
            message: `Flagged: ${item.title}`,
            time: formatTimeAgo(new Date(item.createdAt)),
            project: projects[0]?.name || 'Project',
            createdAt: new Date(item.createdAt)
          });
        });
      }

      // Sort by creation date (most recent first) and take top 5
      activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Fallback to empty activity if there's an error
      setRecentActivity([]);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} minutes ago`;
    } else if (hours < 24) {
      return `${hours} hours ago`;
    } else {
      return `${days} days ago`;
    }
  };

  const handleArchiveProject = async () => {
    if (!activeProject) return;
    
    try {
      setArchiving(true);
      const response = await fetch(`/api/projects/${activeProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'archive'
        }),
      });

      if (response.ok) {
        // Refresh projects to show updated status
        await fetchProjects();
        
        // Show success message
        showToastNotification('Project archived successfully! Ready to create a new project.', 'success');
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd/Ctrl + key combinations
      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case 'a':
            event.preventDefault();
            const activeProject = projects[0];
            if (activeProject && activeProject.status !== 'ARCHIVED' && !archiving) {
              setShowArchiveModal(true);
            }
            break;
          case 'n':
            event.preventDefault();
            const currentProject = projects[0];
            if (currentProject && currentProject.status === 'ARCHIVED') {
              window.location.href = '/projects/create';
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [projects, archiving]);

  // Re-enable auth checks now that OAuth is configured
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchProjects();
  }, [session, status, router, fetchProjects]);

  // Redirect to project creation if no projects exist
  useEffect(() => {
    if (!loading && projects.length === 0) {
      router.push('/projects/create');
    }
  }, [loading, projects.length, router]);

  // Re-enable session check now that OAuth is configured
  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const activeProject = projects[0]; // MVP: Single project focus

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your renovation project</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative group">
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] text-sm" 
                onClick={() => setShowArchiveModal(true)}
                disabled={archiving || !activeProject || activeProject.status === 'ARCHIVED'}
                title={
                  !activeProject 
                    ? 'No active project to archive'
                    : activeProject.status === 'ARCHIVED'
                    ? 'Project already archived'
                    : 'Archive project and stop monitoring (⌘A)'
                }
              >
                <ArchiveBoxIcon className="w-4 h-4" />
                <span className="whitespace-nowrap">
                  {archiving ? 'Archiving...' : activeProject?.status === 'ARCHIVED' ? 'Archived' : 'Archive Project'}
                </span>
              </Button>
              {/* Tooltip for disabled state */}
              {(!activeProject || activeProject.status === 'ARCHIVED') && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {!activeProject ? 'No active project to archive' : 'Project already archived'}
                </div>
              )}
            </div>
            <div className="relative group">
              <Button 
                variant={activeProject?.status === 'ARCHIVED' ? "primary" : "outline"}
                className="flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] text-sm" 
                disabled={!activeProject || activeProject.status !== 'ARCHIVED'}
                onClick={() => window.location.href = '/projects/create'}
                title={
                  !activeProject
                    ? 'Archive current project first'
                    : activeProject.status !== 'ARCHIVED'
                    ? 'Archive current project to create new one'
                    : 'Create a new project (⌘N)'
                }
              >
                <PlusIcon className="w-4 h-4" />
                <span className="whitespace-nowrap">New Project</span>
              </Button>
              {/* Tooltip for disabled state */}
              {(!activeProject || activeProject.status !== 'ARCHIVED') && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {!activeProject ? 'Archive current project first' : 'Archive current project to create new one'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MVP Notice */}
        <Card className={`${activeProject?.status === 'ARCHIVED' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'} mb-8`}>
          <CardContent className="p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className={`h-5 w-5 ${activeProject?.status === 'ARCHIVED' ? 'text-amber-400' : 'text-blue-400'}`} />
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${activeProject?.status === 'ARCHIVED' ? 'text-amber-800' : 'text-blue-800'}`}>
                  {activeProject?.status === 'ARCHIVED' ? 'Project Archived' : 'Single Project Focus'}
                </h3>
                <div className={`mt-2 text-sm ${activeProject?.status === 'ARCHIVED' ? 'text-amber-700' : 'text-blue-700'}`}>
                  <p>
                    {activeProject?.status === 'ARCHIVED' 
                      ? 'This project is archived and read-only. Email monitoring has stopped. Use the "New Project" button above to start fresh.'
                      : 'You have one active project. Archive it first to create a new project. Multi-project support coming in future updates.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="flex items-center p-4 sm:p-6">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-[#34A853] rounded-md flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active Project</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">1</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4 sm:p-6">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <FlagIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Flagged Items</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{activeProject?._count?.flaggedItems || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4 sm:p-6">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-[#1A73E8] rounded-md flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Timeline Entries</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{activeProject?._count?.timelineEntries || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4 sm:p-6">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Needs Attention</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{Math.min(activeProject?._count?.flaggedItems || 0, 2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Active Project */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Your Active Project</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {activeProject && (
                <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-base sm:text-lg pr-2">{activeProject.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                      activeProject.status === 'ARCHIVED' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {activeProject.status === 'ARCHIVED' ? 'Archived' : activeProject.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Started:</span>
                      <span>{new Date(activeProject.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contractor:</span>
                      <span className="truncate ml-2">{activeProject.contractor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monitoring:</span>
                      <span className={activeProject.status === 'ARCHIVED' ? 'text-amber-600' : 'text-green-600'}>
                        {activeProject.status === 'ARCHIVED' ? 'Stopped' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                    <span className="text-sm text-gray-500">
                      Created: {new Date(activeProject.createdAt).toLocaleDateString()}
                    </span>
                    {activeProject._count.flaggedItems > 0 && (
                      <span className="flex items-center gap-1 text-sm text-red-600">
                        <FlagIcon className="w-4 h-4" />
                        {activeProject._count.flaggedItems} flagged
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Link href="/timeline" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full min-h-[40px]">View Timeline</Button>
                    </Link>
                    <Link href="/flagged" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full min-h-[40px]">Review Flagged Items</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        activity.type === 'flagged' 
                          ? 'bg-red-100' 
                          : activity.type === 'timeline'
                          ? 'bg-blue-100'
                          : 'bg-green-100'
                      }`}>
                        {activity.type === 'flagged' ? (
                          <FlagIcon className="w-4 h-4 text-red-600" />
                        ) : activity.type === 'timeline' ? (
                          <ClockIcon className="w-4 h-4 text-blue-600" />
                        ) : (
                          <EnvelopeIcon className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 break-words">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.project} • {activity.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">No recent activity yet</p>
                    <p className="text-xs">Activity will appear here as your project progresses</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {showArchiveModal && activeProject && (
        <ConfirmModal
          isOpen={showArchiveModal}
          onClose={() => setShowArchiveModal(false)}
          onConfirm={handleArchiveProject}
          title="Archive Project"
          description={`Archive "${activeProject.name}"?

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

      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        title={toastMessage}
        type={toastType}
      />
    </div>
  );
} 