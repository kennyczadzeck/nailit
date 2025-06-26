'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface Project {
  id: string;
  name: string;
  description?: string;
  address?: string;
  addressPlaceId?: string;
  addressLat?: number;
  addressLng?: number;
  budget?: number;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  teamMembers?: Array<{
    id: string;
    name: string;
    email: string;
    role: 'GENERAL_CONTRACTOR' | 'ARCHITECT_DESIGNER' | 'PROJECT_MANAGER';
  }>;
  emailSettings?: {
    monitoringEnabled: boolean;
    notificationsEnabled: boolean;
    weeklyReports: boolean;
    highPriorityAlerts: boolean;
  };
  _count?: {
    flaggedItems: number;
    timelineEntries: number;
  };
}

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  loading: boolean;
  switchProject: (projectId: string) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const { data: session } = useSession();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = React.useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const projectsData = await response.json();
        setProjects(projectsData);
        
        // Set current project (try to get from localStorage first, then default to first active, then first overall)
        const savedProjectId = localStorage.getItem('currentProjectId');
        let selectedProject = null;
        
        if (savedProjectId) {
          selectedProject = projectsData.find((p: Project) => p.id === savedProjectId);
        }
        
        if (!selectedProject) {
          // Default to first active project, then first project overall
          selectedProject = projectsData.find((p: Project) => p.status === 'ACTIVE') || projectsData[0];
        }
        
        setCurrentProject(selectedProject || null);
        
        if (selectedProject) {
          localStorage.setItem('currentProjectId', selectedProject.id);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const switchProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      localStorage.setItem('currentProjectId', project.id);
    }
  };

  const refreshProjects = async () => {
    await fetchProjects();
  };

  useEffect(() => {
    fetchProjects();
  }, [session, fetchProjects]);

  const contextValue: ProjectContextType = {
    currentProject,
    projects,
    loading,
    switchProject,
    refreshProjects
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
}; 