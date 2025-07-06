-- CreateTable
CREATE TABLE "email_analyses" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "subCategories" TEXT NOT NULL,
    "keyPoints" TEXT NOT NULL,
    "actionItems" TEXT NOT NULL,
    "timelineMentions" TEXT NOT NULL,
    "entities" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "requiresResponse" BOOLEAN NOT NULL DEFAULT false,
    "attachmentsMentioned" BOOLEAN NOT NULL DEFAULT false,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "processingTimeMs" INTEGER NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_analyses_emailId_projectId_key" ON "email_analyses"("emailId", "projectId");

-- AddForeignKey
ALTER TABLE "email_analyses" ADD CONSTRAINT "email_analyses_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "email_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_analyses" ADD CONSTRAINT "email_analyses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
