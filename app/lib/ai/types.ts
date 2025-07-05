// Types for AI-powered email analysis system

export interface EmailMessage {
  id: string;
  sender: string;
  recipients: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  sentAt: string;
  attachments?: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  
  // Project details
  contractor?: string;
  budget?: number;
  address?: string;
  addressPlaceId?: string;
  addressLat?: number;
  addressLng?: number;
  
  // Relations
  userId: string;
  teamMembers?: TeamMember[];
  emailSettings?: EmailSettings;
  flaggedItems?: FlaggedItem[];
  timelineEntries?: TimelineEntry[];
  emailMessages?: EmailMessage[];
  emailAnalyses?: EmailAnalysis[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'GENERAL_CONTRACTOR' | 'ARCHITECT_DESIGNER' | 'PROJECT_MANAGER';
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSettings {
  id: string;
  projectId: string;
  monitoringEnabled: boolean;
  notificationsEnabled: boolean;
  weeklyReports: boolean;
  highPriorityAlerts: boolean;
  gmailConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FlaggedItem {
  id: string;
  title: string;
  description: string;
  impact: string;
  category: string;
  emailFrom: string;
  emailSubject?: string;
  emailDate: string;
  status: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  impact?: string;
  cost?: number;
  verified: boolean;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailClassification {
  primary_type: 'invoice' | 'change_order' | 'progress_update' | 'schedule_update' | 
                'material_delivery' | 'inspection' | 'communication' | 'issue_report';
  confidence: number;
  sub_categories: string[];
}

export interface EmailSummary {
  key_points: string[];
  action_items: string[];
  timeline_mentions: string[];
}

export interface EmailEntities {
  contractors: string[];
  materials: string[];
  locations: string[];
  amounts: string[];
  dates: string[];
}

export interface EmailAnalysis {
  id: string;
  classification: EmailClassification;
  summary: EmailSummary;
  entities: EmailEntities;
  priority: 'high' | 'medium' | 'low';
  requires_response: boolean;
  attachments_mentioned: boolean;
  confidence_score: number;
  processing_metadata: {
    analyzed_at: string;
    model_used: string;
    processing_time_ms: number;
  };
  
  // Database fields
  projectId: string;
  emailMessageId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisError {
  type: 'api_error' | 'parse_error' | 'validation_error' | 'context_error';
  message: string;
  details?: any;
  retry_suggested: boolean;
}

export interface AnalysisResult {
  success: boolean;
  analysis?: EmailAnalysis;
  error?: AnalysisError;
} 