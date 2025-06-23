'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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

  const fetchRecentActivity = useCallback(async (projectId: string) => {
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
            project: projects.find(p => p.id === projectId)?.name || 'Project',
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
            project: projects.find(p => p.id === projectId)?.name || 'Project',
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
  }, [projects]);

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
  }, [fetchRecentActivity]);
  
  const activeProject = projects.find(p => p.status === 'ACTIVE');

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
            if (activeProject && !archiving) {
              setShowArchiveModal(true);
            }
            break;
          case 'n':
            event.preventDefault();
            if (!activeProject) {
              window.location.href = '/projects/create';
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeProject, archiving]);

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
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navigation />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-[#34A853] rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-lg text-gray-600">Loading your dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const archivedProjects = projects.filter(p => p.status === 'ARCHIVED');
  const hasActiveProject = !!activeProject;

  const getIconForActivity = (type: ActivityItem['type']) => {
    switch (type) {
      case 'timeline':
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
      case 'flagged':
        return <FlagIcon className="w-5 h-5 text-gray-500" />;
      case 'email':
        return <EnvelopeIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <CheckCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navigation />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">Welcome back, {session?.user?.name || 'User'}. Here&apos;s what&apos;s happening.</p>
            </div>
            {hasActiveProject && (
              <Button onClick={() => setShowArchiveModal(true)} variant="outline">
                <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                Archive Current Project
              </Button>
            )}
            {!hasActiveProject && projects.length > 0 && (
               <Button onClick={() => window.location.href='/projects/create'}>
                 <PlusIcon className="w-4 h-4 mr-2" />
                 Create New Project
               </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content: Active Project */}
            <div className="lg:col-span-2 space-y-6">
              {hasActiveProject ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>Active Project</span>
                      <span className="text-sm font-medium text-gray-500">{activeProject.contractor}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <h3 className="text-lg font-semibold text-gray-900">{activeProject.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Started on {new Date(activeProject.startDate).toLocaleDateString()}
                    </p>
                    <div className="flex gap-8 mt-4 pt-4 border-t">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{activeProject._count.timelineEntries}</div>
                        <div className="text-sm text-gray-500">Timeline Events</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{activeProject._count.flaggedItems}</div>
                        <div className="text-sm text-gray-500">Flagged Items</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex flex-col items-center justify-center p-8 text-center">
                  <ExclamationTriangleIcon className="w-12 h-12 text-amber-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">No Active Project</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    All your projects are archived. Create a new one to get started.
                  </p>
                  <Button className="mt-6" onClick={() => window.location.href = '/projects/create'}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create New Project
                  </Button>
                </Card>
              )}

              {/* Archived Projects */}
              {archivedProjects.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Archived Projects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y divide-gray-200">
                      {archivedProjects.map(project => (
                        <li key={project.id} className="py-3 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{project.name}</p>
                            <p className="text-sm text-gray-500">{project.contractor}</p>
                          </div>
                          <span className="text-xs text-gray-400">
                            Archived on {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Sidebar: Recent Activity */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActivity.length > 0 ? (
                    <ul className="space-y-4">
                      {recentActivity.map(item => (
                        <li key={item.id} className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getIconForActivity(item.type)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-700">{item.message}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.time} on {item.project}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500">No recent activity to display.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {showArchiveModal && hasActiveProject && (
        <ConfirmModal
          isOpen={showArchiveModal}
          onClose={() => setShowArchiveModal(false)}
          onConfirm={handleArchiveProject}
          title="Archive Project"
          description={`Are you sure you want to archive "${activeProject.name}"? You can view archived projects but cannot make changes.`}
          confirmText={archiving ? 'Archiving...' : 'Yes, Archive'}
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