'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FlaggedItemModal } from '../components/FlaggedItemModal';
import { 
  FlagIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  DocumentTextIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface FlaggedItem {
  id: string;
  category: 'cost' | 'schedule' | 'scope' | 'unclassified';
  title: string;
  description: string;
  impact: string;
  date: string;
  time: string;
  emailFrom: string;
  project: string;
  originalEmail?: string;
  detectedChanges?: string[];
  needsEmailResponse?: boolean;
  aiConfidence?: number;
}

export default function FlaggedItemsPage() {
  const [selectedItem, setSelectedItem] = useState<FlaggedItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);

  // Fetch flagged items from API
  useEffect(() => {
    fetchFlaggedItems();
  }, []);

  const fetchFlaggedItems = async () => {
    try {
      setLoading(true);
      
      // First get the project ID (in a real app, this would come from auth/context)
      const projectsResponse = await fetch('/api/projects');
      const projects = await projectsResponse.json();
      
      if (projects.length === 0) {
        setFlaggedItems([]);
        return;
      }

      const currentProject = projects[0]; // Use first project for now
      setProject(currentProject);
      
      // Then get flagged items for that project
      const response = await fetch(`/api/flagged-items?projectId=${currentProject.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch flagged items');
      }
      
      const items = await response.json();
      setFlaggedItems(items);
    } catch (error: unknown) {
      console.error('Error fetching flagged items:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch flagged items')
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cost':
        return CurrencyDollarIcon;
      case 'schedule':
        return ClockIcon;
      case 'scope':
        return DocumentTextIcon;
      case 'unclassified':
        return FlagIcon;
      default:
        return FlagIcon;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cost':
        return 'text-red-600 bg-red-100';
      case 'schedule':
        return 'text-blue-600 bg-blue-100';
      case 'scope':
        return 'text-yellow-600 bg-yellow-100';
      case 'unclassified':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'cost':
        return 'Cost Related';
      case 'schedule':
        return 'Schedule Related';
      case 'scope':
        return 'Scope Related';
      case 'unclassified':
        return 'Needs Classification';
      default:
        return 'Unknown';
    }
  };

  const handleViewItem = (item: FlaggedItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleAction = async (id: string, action: 'confirm' | 'ignore' | 'email_sent') => {
    try {
      setActionLoading(id);
      const response = await fetch(`/api/flagged-items/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('Failed to update flagged item');
      }

      // Remove the item from the list and refresh
      setFlaggedItems(prevItems => prevItems.filter(item => item.id !== id));
      setIsModalOpen(false);
      setSelectedItem(null);

      // Log the action
      if (action === 'confirm') {
        console.log(`✅ CONFIRM: Positive ML feedback - AI correctly flagged item ${id}`);
      } else if (action === 'ignore') {
        console.log(`❌ IGNORE: Negative ML feedback - AI incorrectly flagged item ${id}`);
      } else if (action === 'email_sent') {
        console.log(`📧 EMAIL SENT: Pending ML feedback for item ${id} - awaiting clarification`);
      }
    } catch (error) {
      console.error('Error updating flagged item:', error);
      alert('Failed to update item. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReclassify = async (id: string, newCategory: 'cost' | 'schedule' | 'scope') => {
    try {
      setActionLoading(id);
      const response = await fetch(`/api/flagged-items/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'reclassify', 
          category: newCategory 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reclassify item');
      }

      // Update the item in the list
      setFlaggedItems(prevItems => 
        prevItems.map(item => 
          item.id === id 
            ? { ...item, category: newCategory, aiConfidence: 1.0 }
            : item
        )
      );

      console.log(`🔄 RECLASSIFY: User corrected classification for item ${id} to ${newCategory}`);
    } catch (error) {
      console.error('Error reclassifying item:', error);
      alert('Failed to reclassify item. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const countByCategory = (category: string) => {
    return flaggedItems.filter(item => item.category === category).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34A853]"></div>
              <div className="text-gray-600 font-medium">Loading flagged items...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="text-red-500 text-6xl">⚠️</div>
              <div className="text-red-600 font-medium">{error}</div>
              <Button 
                onClick={() => {
                  setError(null);
                  fetchFlaggedItems();
                }}
                className="bg-[#34A853] hover:bg-[#2d8f47]"
              >
                Try Again
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Flagged Items</h1>
            <p className="text-gray-600 mt-1">Review messages impacting cost, schedule, or scope</p>
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
                      Project archived. Flagged items are read-only. 
                      You can view data but cannot take actions.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <CurrencyDollarIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cost Related</p>
                <p className="text-2xl font-bold text-gray-900">{countByCategory('cost')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Schedule Related</p>
                <p className="text-2xl font-bold text-gray-900">{countByCategory('schedule')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scope Related</p>
                <p className="text-2xl font-bold text-gray-900">{countByCategory('scope')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                  <FlagIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Needs Classification</p>
                <p className="text-2xl font-bold text-gray-900">{countByCategory('unclassified')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flagged Items List */}
        <div className="space-y-4">
          {flaggedItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FlagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No flagged items</h3>
                <p className="text-gray-500">All project communications are up to date!</p>
              </CardContent>
            </Card>
          ) : (
            flaggedItems.map((item) => {
              const CategoryIcon = getCategoryIcon(item.category);
              const hasLowConfidence = item.aiConfidence && item.aiConfidence < 0.7;
              return (
                <Card key={item.id} className="hover:bg-gray-50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(item.category)}`}>
                        <CategoryIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-sm text-gray-500">{item.emailFrom}</span>
                              <span className="text-gray-300">•</span>
                              <span className="text-sm text-gray-500">{item.time}</span>
                              <span className="text-gray-300">•</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                                {getCategoryLabel(item.category)}
                              </span>
                              {item.needsEmailResponse && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Needs Response
                                </span>
                              )}
                              {hasLowConfidence && item.category !== 'unclassified' && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Low Confidence ({Math.round((item.aiConfidence || 0) * 100)}%)
                                </span>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewItem(item)}
                            className="flex items-center gap-2"
                            disabled={actionLoading === item.id}
                          >
                            {actionLoading === item.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                            ) : (
                              <EyeIcon className="w-4 h-4" />
                            )}
                            {actionLoading === item.id ? 'Processing...' : 'View Details'}
                          </Button>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">Impact: {item.impact}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      <FlaggedItemModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAction={handleAction}
        onReclassify={handleReclassify}
        isProjectArchived={project?.status === 'ARCHIVED'}
      />
    </div>
  );
} 