-- AlterTable
ALTER TABLE "email_settings" ADD COLUMN     "oauthComplianceData" JSONB,
ADD COLUMN     "oauthGrantedAt" TIMESTAMP(3),
ADD COLUMN     "oauthGrantedBy" TEXT,
ADD COLUMN     "oauthLastRefreshedAt" TIMESTAMP(3),
ADD COLUMN     "oauthReauthorizationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "oauthRevokeReason" TEXT,
ADD COLUMN     "oauthRevokedAt" TIMESTAMP(3),
ADD COLUMN     "oauthRevokedBy" TEXT,
ADD COLUMN     "oauthScopes" JSONB,
ADD COLUMN     "oauthSessionId" TEXT;
