'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation';
import { Timeline } from '../components/Timeline';
import { Button } from '../components/ui/Button';

interface Project {
  id: string;
  name: string;
  description: string;
  contractor: string;
  createdAt: string;
  _count: {
    flaggedItems: number;
    timelineEntries: number;
  };
}

export default function TimelinePage() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
    try {
      const response = await fetch('/api/projects');
      const projects = await response.json();
      
      if (projects.length > 0) {
        setProject(projects[0]); // Use first project for now
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Error fetching project. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getLastUpdated = (project: Project) => {
    const createdDate = new Date(project.createdAt);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }
  };

  const getTeamMemberCount = () => {
    // For now, count based on contractor info
    // In a real app, this would be a proper team members count
    return project?.contractor ? 2 : 1; // Homeowner + contractor
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34A853]"></div>
              <div className="text-gray-600 font-medium">Loading timeline...</div>
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
                  fetchProject();
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

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-gray-500 py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No project found</h3>
                <p className="text-gray-500">Create a project to view its timeline.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="py-8">
        <Timeline 
          projectName={project.name}
          teamMemberCount={getTeamMemberCount()}
          lastUpdated={getLastUpdated(project)}
        />
      </main>
    </div>
  );
} 