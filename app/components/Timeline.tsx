'use client';

import React, { useState, useEffect } from 'react';
import { ExportDropdown } from './ExportDropdown';
import { 
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface TimelineEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  impact: string;
  cost?: number;
  scheduleImpact?: string;
  scopeDetails?: string;
  verified: boolean;
  fromFlaggedItem: boolean;
  emailFrom?: string;
  createdAt: string;
}

interface TimelineProps {
  projectName: string;
  teamMemberCount: number;
  lastUpdated: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  projectName,
  teamMemberCount,
  lastUpdated,
}) => {
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchTimelineEntries();
  }, []);

  const fetchTimelineEntries = async () => {
    try {
      setLoading(true);
      
      // Get project ID first
      const projectsResponse = await fetch('/api/projects');
      const projects = await projectsResponse.json();
      
      if (projects.length === 0) {
        setTimelineEntries([]);
        return;
      }

      const projectId = projects[0].id;
      
      // Fetch timeline entries
      const response = await fetch(`/api/timeline?projectId=${projectId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch timeline entries');
      }
      
      const entries = await response.json();
      setTimelineEntries(entries);
    } catch (err) {
      console.error('Error fetching timeline entries:', err);
      setError('Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      fetchTimelineEntries();
      setRefreshing(false);
    }, 1000);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cost':
        return CurrencyDollarIcon;
      case 'schedule':
        return ClockIcon;
      case 'scope':
        return DocumentTextIcon;
      case 'issue':
        return ExclamationTriangleIcon;
      case 'update':
        return CheckCircleIcon;
      default:
        return CalendarDaysIcon;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cost':
        return 'bg-red-100 text-red-600 border-red-200';
      case 'schedule':
        return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'scope':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'issue':
        return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'update':
        return 'bg-purple-100 text-purple-600 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'cost':
        return 'Cost Impact';
      case 'schedule':
        return 'Schedule Update';
      case 'scope':
        return 'Scope Change';
      case 'issue':
        return 'Issue';
      case 'update':
        return 'Update';
      default:
        return 'Event';
    }
  };

  const getFilteredEntries = () => {
    if (selectedCategory === 'all') return timelineEntries;
    return timelineEntries.filter(entry => entry.category === selectedCategory);
  };

  const handleExport = (format: 'pdf' | 'csv', range: 'current' | 'full' | 'custom') => {
    // TODO: Implement export functionality
    console.log(`Exporting ${format} for range: ${range}`);
  };

  const filteredEntries = getFilteredEntries();
  const categories = [...new Set(timelineEntries.map(entry => entry.category))];

  if (loading) {
    return (
      <div className="flex flex-col w-full max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading timeline...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col w-full max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-red-500">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-start">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">{projectName}</h1>
            <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span className="truncate">{teamMemberCount} team member{teamMemberCount !== 1 ? 's' : ''}</span>
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span className="truncate">Last updated {lastUpdated}</span>
              </span>
              <span className="flex items-center gap-2">
                <CalendarDaysIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{timelineEntries.length} event{timelineEntries.length !== 1 ? 's' : ''}</span>
              </span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 w-full sm:w-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 border border-gray-200 rounded-md hover:bg-gray-50 min-h-[44px] w-full sm:w-auto"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <div className="w-full sm:w-auto">
              <ExportDropdown onExport={handleExport} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({timelineEntries.length})
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                selectedCategory === category
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getCategoryLabel(category)} ({timelineEntries.filter(e => e.category === category).length})
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        {filteredEntries.length === 0 ? (
          <div className="text-center text-gray-500 py-8 sm:py-12">
            <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No timeline entries</h3>
            <p className="text-sm sm:text-base text-gray-500">
              {selectedCategory === 'all' 
                ? 'Project timeline will appear here as events are confirmed.'
                : `No ${getCategoryLabel(selectedCategory.toLowerCase())} events found.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {filteredEntries.map((entry, index) => {
              const CategoryIcon = getCategoryIcon(entry.category);
              const isLast = index === filteredEntries.length - 1;
              
              return (
                <div key={entry.id} className="relative">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-4 sm:left-6 top-10 sm:top-12 w-0.5 h-full bg-gray-200"></div>
                  )}
                  
                  <div className="flex gap-3 sm:gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center ${getCategoryColor(entry.category)}`}>
                      <CategoryIcon className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{entry.title}</h3>
                            <div className="flex flex-wrap gap-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(entry.category)}`}>
                                {getCategoryLabel(entry.category)}
                              </span>
                              {entry.fromFlaggedItem && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  From Email
                                </span>
                              )}
                              {entry.verified && (
                                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          </div>
                          
                          <p className="text-gray-600 mb-2 text-sm sm:text-base break-words">{entry.description}</p>
                          
                          {entry.impact && (
                            <p className="text-sm font-medium text-gray-800 mb-2 break-words">
                              Impact: {entry.impact}
                            </p>
                          )}
                          
                          {/* Additional details based on category */}
                          <div className="space-y-1 text-sm text-gray-600">
                            {entry.cost && (
                              <div className="flex items-center gap-2">
                                <CurrencyDollarIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="break-words">Cost Impact: ${entry.cost.toLocaleString()}</span>
                              </div>
                            )}
                            {entry.scheduleImpact && (
                              <div className="flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="break-words">Schedule: {entry.scheduleImpact}</span>
                              </div>
                            )}
                            {entry.scopeDetails && (
                              <div className="flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="break-words">Scope: {entry.scopeDetails}</span>
                              </div>
                            )}
                            {entry.emailFrom && (
                              <div className="flex items-center gap-2">
                                <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="break-words">From: {entry.emailFrom}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right sm:text-right text-left text-sm text-gray-500 flex-shrink-0">
                          <div>{entry.time}</div>
                          <div>{entry.date}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}; 