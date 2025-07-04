-- CreateTable
CREATE TABLE "oauth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sessionContext" TEXT NOT NULL,
    "sessionPurpose" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "tokenType" TEXT DEFAULT 'Bearer',
    "scopes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "deviceInfo" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "oauth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_sessions_userId_provider_sessionContext_key" ON "oauth_sessions"("userId", "provider", "sessionContext");

-- AddForeignKey
ALTER TABLE "oauth_sessions" ADD CONSTRAINT "oauth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
