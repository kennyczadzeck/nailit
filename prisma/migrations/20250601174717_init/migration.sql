-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FlaggedItemCategory" AS ENUM ('COST', 'SCHEDULE', 'SCOPE', 'UNCLASSIFIED');

-- CreateEnum
CREATE TYPE "FlaggedItemStatus" AS ENUM ('PENDING', 'REVIEWED', 'CONFIRMED', 'IGNORED', 'EMAIL_SENT');

-- CreateEnum
CREATE TYPE "TimelineCategory" AS ENUM ('COST', 'SCHEDULE', 'SCOPE', 'ISSUE', 'UPDATE');

-- CreateEnum
CREATE TYPE "MLFeedbackType" AS ENUM ('POSITIVE', 'NEGATIVE', 'RECLASSIFY', 'CLASSIFY');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('GENERAL_CONTRACTOR', 'ARCHITECT_DESIGNER', 'PROJECT_MANAGER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractor" TEXT,
    "budget" DOUBLE PRECISION,
    "address" TEXT,
    "addressPlaceId" TEXT,
    "addressLat" DOUBLE PRECISION,
    "addressLng" DOUBLE PRECISION,
    "userId" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flagged_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "category" "FlaggedItemCategory" NOT NULL,
    "emailFrom" TEXT NOT NULL,
    "emailSubject" TEXT,
    "emailDate" TIMESTAMP(3) NOT NULL,
    "originalEmail" TEXT,
    "aiConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "detectedChanges" JSONB,
    "needsEmailResponse" BOOLEAN NOT NULL DEFAULT false,
    "status" "FlaggedItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "mlFeedback" "MLFeedbackType",
    "userNotes" TEXT,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "flagged_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_entries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TimelineCategory" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impact" TEXT,
    "cost" DOUBLE PRECISION,
    "scheduleImpact" TEXT,
    "scopeDetails" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "flaggedItemId" TEXT,

    CONSTRAINT "timeline_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_settings" (
    "id" TEXT NOT NULL,
    "gmailConnected" BOOLEAN NOT NULL DEFAULT false,
    "gmailRefreshToken" TEXT,
    "gmailAccessToken" TEXT,
    "gmailTokenExpiry" TIMESTAMP(3),
    "monitoringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailFilters" JSONB,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weeklyReports" BOOLEAN NOT NULL DEFAULT true,
    "highPriorityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "email_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_feedback" (
    "id" TEXT NOT NULL,
    "feedbackType" "MLFeedbackType" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "userAction" TEXT NOT NULL,
    "emailContent" TEXT,
    "detectedPatterns" JSONB,
    "correctCategory" "FlaggedItemCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "flaggedItemId" TEXT,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ml_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_entries_flaggedItemId_key" ON "timeline_entries"("flaggedItemId");

-- CreateIndex
CREATE UNIQUE INDEX "email_settings_projectId_key" ON "email_settings"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flagged_items" ADD CONSTRAINT "flagged_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_flaggedItemId_fkey" FOREIGN KEY ("flaggedItemId") REFERENCES "flagged_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_settings" ADD CONSTRAINT "email_settings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
