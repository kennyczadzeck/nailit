// Types for AI-powered email analysis system

export interface EmailMessage {
  id: string;
  messageId: string;
  threadId?: string;
  provider: string;
  providerData?: Record<string, unknown>;
  subject?: string;
  sender: string;
  senderName?: string;
  recipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  sentAt: string;
  receivedAt: string;
  bodyText?: string;
  bodyHtml?: string;
  s3ContentPath?: string;
  s3AttachmentPaths: string[];
  ingestionStatus: string;
  analysisStatus: string;
  assignmentStatus: string;
  relevanceScore?: number;
  aiSummary?: string;
  classification?: Record<string, unknown>;
  extractedData?: Record<string, unknown>;
  urgencyLevel?: string;
  flaggedItemId?: string;
  containsChanges: boolean;
  processingErrors?: Record<string, unknown>;
  retryCount: number;
  lastProcessedAt?: string;
  userId: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  attachments?: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  startDate: string;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Project details
  contractor?: string | null;
  budget?: number | null;
  address?: string | null;
  addressPlaceId?: string | null;
  addressLat?: number | null;
  addressLng?: number | null;
  
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
  gmailConnected: boolean;
  gmailRefreshToken?: string | null;
  gmailAccessToken?: string | null;
  gmailTokenExpiry?: string | null;
  monitoringEnabled: boolean;
  emailFilters?: Record<string, unknown>;
  notificationsEnabled: boolean;
  weeklyReports: boolean;
  highPriorityAlerts: boolean;
  createdAt: string;
  updatedAt: string;
  oauthComplianceData?: Record<string, unknown>;
  oauthGrantedAt?: string | null;
  oauthGrantedBy?: string | null;
  oauthLastRefreshedAt?: string | null;
  oauthReauthorizationRequired: boolean;
  oauthRevokeReason?: string | null;
  oauthRevokedAt?: string | null;
  oauthRevokedBy?: string | null;
  oauthScopes?: Record<string, unknown>;
  oauthSessionId?: string | null;
}

export interface FlaggedItem {
  id: string;
  title: string;
  description: string;
  impact: string;
  category: 'COST' | 'SCHEDULE' | 'SCOPE' | 'UNCLASSIFIED';
  emailFrom: string;
  emailSubject?: string;
  emailDate: string;
  originalEmail?: string;
  aiConfidence: number;
  detectedChanges?: Record<string, unknown>;
  needsEmailResponse: boolean;
  status: 'PENDING' | 'REVIEWED' | 'CONFIRMED' | 'IGNORED' | 'EMAIL_SENT';
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  mlFeedback?: 'POSITIVE' | 'NEGATIVE' | 'RECLASSIFY' | 'CLASSIFY';
  userNotes?: string;
  projectId: string;
  emailContext?: string;
}

export interface TimelineEntry {
  id: string;
  title: string;
  description: string;
  category: 'COST' | 'SCHEDULE' | 'SCOPE' | 'ISSUE' | 'UPDATE';
  date: string;
  impact?: string;
  cost?: number;
  scheduleImpact?: string;
  scopeDetails?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  flaggedItemId?: string;
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
  details?: unknown;
  retry_suggested: boolean;
}

export interface AnalysisResult {
  success: boolean;
  analysis?: EmailAnalysis;
  error?: AnalysisError;
} 