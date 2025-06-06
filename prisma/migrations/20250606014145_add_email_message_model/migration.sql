-- AlterTable
ALTER TABLE "flagged_items" ADD COLUMN     "emailContext" TEXT;

-- CreateTable
CREATE TABLE "email_messages" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'gmail',
    "providerData" JSONB,
    "subject" TEXT,
    "sender" TEXT NOT NULL,
    "senderName" TEXT,
    "recipients" TEXT[],
    "ccRecipients" TEXT[],
    "bccRecipients" TEXT[],
    "sentAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "s3ContentPath" TEXT,
    "s3AttachmentPaths" TEXT[],
    "ingestionStatus" TEXT NOT NULL DEFAULT 'pending',
    "analysisStatus" TEXT NOT NULL DEFAULT 'pending',
    "assignmentStatus" TEXT NOT NULL DEFAULT 'pending',
    "relevanceScore" DOUBLE PRECISION,
    "aiSummary" TEXT,
    "classification" JSONB,
    "extractedData" JSONB,
    "urgencyLevel" TEXT,
    "flaggedItemId" TEXT,
    "containsChanges" BOOLEAN NOT NULL DEFAULT false,
    "processingErrors" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastProcessedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_messages_messageId_key" ON "email_messages"("messageId");

-- CreateIndex
CREATE INDEX "email_messages_userId_receivedAt_idx" ON "email_messages"("userId", "receivedAt");

-- CreateIndex
CREATE INDEX "email_messages_projectId_receivedAt_idx" ON "email_messages"("projectId", "receivedAt");

-- CreateIndex
CREATE INDEX "email_messages_ingestionStatus_idx" ON "email_messages"("ingestionStatus");

-- CreateIndex
CREATE INDEX "email_messages_analysisStatus_idx" ON "email_messages"("analysisStatus");

-- CreateIndex
CREATE INDEX "email_messages_urgencyLevel_idx" ON "email_messages"("urgencyLevel");

-- CreateIndex
CREATE INDEX "email_messages_containsChanges_idx" ON "email_messages"("containsChanges");

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_flaggedItemId_fkey" FOREIGN KEY ("flaggedItemId") REFERENCES "flagged_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
