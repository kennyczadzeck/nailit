-- NailIt Database Schema for Neon PostgreSQL
-- Run this in Neon Console → SQL Editor

-- Create Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    "emailVerified" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create Projects table
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ACTIVE' NOT NULL,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    contractor TEXT,
    budget DECIMAL,
    address TEXT,
    "addressPlaceId" TEXT,
    "addressLat" DECIMAL,
    "addressLng" DECIMAL,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Create Accounts table (NextAuth)
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    UNIQUE(provider, "providerAccountId")
);

-- Create Sessions table (NextAuth)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMP NOT NULL
);

-- Create Verification Tokens table (NextAuth)
CREATE TABLE verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires TIMESTAMP NOT NULL,
    UNIQUE(identifier, token)
);

-- Create Flagged Items table
CREATE TABLE flagged_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact TEXT NOT NULL,
    category TEXT NOT NULL,
    "emailFrom" TEXT NOT NULL,
    "emailSubject" TEXT,
    "emailDate" TIMESTAMP NOT NULL,
    "originalEmail" TEXT,
    "aiConfidence" DECIMAL DEFAULT 0.0 NOT NULL,
    "detectedChanges" JSONB,
    "needsEmailResponse" BOOLEAN DEFAULT false NOT NULL,
    status TEXT DEFAULT 'PENDING' NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "reviewedAt" TIMESTAMP,
    "mlFeedback" TEXT,
    "userNotes" TEXT,
    "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
);

-- Create Timeline Entries table
CREATE TABLE timeline_entries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    impact TEXT,
    cost DECIMAL,
    "scheduleImpact" TEXT,
    "scopeDetails" TEXT,
    verified BOOLEAN DEFAULT false NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "flaggedItemId" TEXT UNIQUE REFERENCES flagged_items(id)
);

-- Create Email Settings table
CREATE TABLE email_settings (
    id TEXT PRIMARY KEY,
    "gmailConnected" BOOLEAN DEFAULT false NOT NULL,
    "gmailRefreshToken" TEXT,
    "gmailAccessToken" TEXT,
    "gmailTokenExpiry" TIMESTAMP,
    "monitoringEnabled" BOOLEAN DEFAULT true NOT NULL,
    "emailFilters" JSONB,
    "notificationsEnabled" BOOLEAN DEFAULT true NOT NULL,
    "weeklyReports" BOOLEAN DEFAULT true NOT NULL,
    "highPriorityAlerts" BOOLEAN DEFAULT true NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "projectId" TEXT UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE
);

-- Create ML Feedback table
CREATE TABLE ml_feedback (
    id TEXT PRIMARY KEY,
    "feedbackType" TEXT NOT NULL,
    confidence DECIMAL,
    "userAction" TEXT NOT NULL,
    "emailContent" TEXT,
    "detectedPatterns" JSONB,
    "correctCategory" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "flaggedItemId" TEXT,
    "projectId" TEXT NOT NULL
);

-- Create Team Members table
CREATE TABLE team_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_projects_userId ON projects("userId");
CREATE INDEX idx_accounts_userId ON accounts("userId");
CREATE INDEX idx_sessions_userId ON sessions("userId");
CREATE INDEX idx_flagged_items_projectId ON flagged_items("projectId");
CREATE INDEX idx_timeline_entries_projectId ON timeline_entries("projectId");
CREATE INDEX idx_email_settings_projectId ON email_settings("projectId");
CREATE INDEX idx_team_members_projectId ON team_members("projectId"); 