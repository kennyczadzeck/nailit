import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface OAuthTokens {
  access_token?: string;
  refresh_token: string;
  expiry_date?: number;
}

export interface OAuthComplianceData {
  ipAddress?: string;
  userAgent?: string;
  grantTimestamp?: string;
  tokenSource?: string;
  securityLevel?: string;
  lastRefresh?: string;
  refreshCount?: number;
  revocation?: {
    timestamp: string;
    reason: string;
    details?: string;
  };
  reauthorizationRequired?: {
    timestamp: string;
    reason: string;
    details?: string;
  };
  [key: string]: unknown;
}

export interface OAuthSessionData {
  sessionId: string;
  grantedAt: Date;
  grantedBy: string;
  scopes: string[];
  refreshToken: string;
  accessToken?: string;
  tokenExpiry?: Date;
  complianceData?: OAuthComplianceData;
}

export interface OAuthRevocationData {
  revokedAt: Date;
  revokedBy: string;
  reason: 'security' | 'user_request' | 'token_expired' | 'policy_violation' | 'reauthorization';
  details?: string;
}

export interface ComplianceReport {
  projectId: string;
  projectName: string;
  userEmail: string;
  oauthStatus: {
    isConnected: boolean;
    sessionId: string | null;
    grantedAt: Date | null;
    grantedBy: string | null;
    lastRefreshedAt: Date | null;
    tokenExpiry: Date | null;
    scopes: string[] | null;
    reauthorizationRequired: boolean | null;
  };
  revocationHistory: {
    revokedAt: Date;
    revokedBy: string;
    reason: string;
  } | null;
  complianceData: OAuthComplianceData | null;
  securityAssessment: {
    sessionAge: number | null;
    tokenValid: boolean;
    needsReauthorization: boolean;
  };
}

/**
 * Enhanced OAuth Session Manager
 * 
 * Provides granular audit trail, reauthorization handling, and compliance reporting
 * for OAuth integrations with email providers.
 */
export class OAuthSessionManager {
  
  /**
   * Create a new OAuth session with full audit trail
   */
  async createOAuthSession(
    projectId: string,
    userId: string,
    tokens: OAuthTokens,
    scopes: string[]
  ): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const now = new Date();

      logger.info('Creating new OAuth session', {
        projectId,
        userId,
        sessionId,
        scopes,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      });

      // Revoke any existing OAuth session for this project
      await this.revokeExistingSession(projectId, userId, 'reauthorization');

      // Create new OAuth session
      await prisma.emailSettings.upsert({
        where: { projectId },
        update: {
          gmailConnected: true,
          gmailRefreshToken: tokens.refresh_token,
          gmailAccessToken: tokens.access_token,
          gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          
          // Enhanced OAuth session tracking
          oauthSessionId: sessionId,
          oauthGrantedAt: now,
          oauthGrantedBy: userId,
          oauthLastRefreshedAt: now,
          oauthRevokedAt: null,
          oauthRevokedBy: null,
          oauthRevokeReason: null,
          oauthScopes: scopes,
          oauthReauthorizationRequired: false,
          oauthComplianceData: {
            ipAddress: this.getClientIP(),
            userAgent: this.getUserAgent(),
            grantTimestamp: now.toISOString(),
            tokenSource: 'oauth_flow',
            securityLevel: 'standard'
          }
        },
        create: {
          projectId,
          gmailConnected: true,
          gmailRefreshToken: tokens.refresh_token,
          gmailAccessToken: tokens.access_token,
          gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          
          // Enhanced OAuth session tracking
          oauthSessionId: sessionId,
          oauthGrantedAt: now,
          oauthGrantedBy: userId,
          oauthLastRefreshedAt: now,
          oauthScopes: scopes,
          oauthReauthorizationRequired: false,
          oauthComplianceData: {
            ipAddress: this.getClientIP(),
            userAgent: this.getUserAgent(),
            grantTimestamp: now.toISOString(),
            tokenSource: 'oauth_flow',
            securityLevel: 'standard'
          }
        }
      });

      logger.info('OAuth session created successfully', {
        projectId,
        userId,
        sessionId,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      });

      return sessionId;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to create OAuth session', {
        projectId,
        userId,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Refresh OAuth tokens with audit trail
   */
  async refreshOAuthTokens(
    projectId: string,
    newTokens: OAuthTokens
  ): Promise<void> {
    try {
      const now = new Date();

      logger.info('Refreshing OAuth tokens', {
        projectId,
        newTokenExpiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
      });

      await prisma.emailSettings.update({
        where: { projectId },
        data: {
          gmailAccessToken: newTokens.access_token,
          gmailTokenExpiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
          oauthLastRefreshedAt: now,
          oauthReauthorizationRequired: false,
          oauthComplianceData: {
            ...await this.getExistingComplianceData(projectId),
            lastRefresh: now.toISOString(),
            refreshCount: await this.incrementRefreshCount(projectId)
          }
        }
      });

      logger.info('OAuth tokens refreshed successfully', {
        projectId,
        newTokenExpiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to refresh OAuth tokens', {
        projectId,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Revoke OAuth session with detailed audit trail
   */
  async revokeOAuthSession(
    projectId: string,
    revocationData: OAuthRevocationData
  ): Promise<void> {
    try {
      logger.info('Revoking OAuth session', {
        projectId,
        reason: revocationData.reason,
        revokedBy: revocationData.revokedBy
      });

      await prisma.emailSettings.update({
        where: { projectId },
        data: {
          gmailConnected: false,
          gmailRefreshToken: null,
          gmailAccessToken: null,
          gmailTokenExpiry: null,
          oauthRevokedAt: revocationData.revokedAt,
          oauthRevokedBy: revocationData.revokedBy,
          oauthRevokeReason: revocationData.reason,
          oauthReauthorizationRequired: revocationData.reason === 'reauthorization',
          oauthComplianceData: {
            ...await this.getExistingComplianceData(projectId),
            revocation: {
              timestamp: revocationData.revokedAt.toISOString(),
              reason: revocationData.reason,
              details: revocationData.details,
              revokedBy: revocationData.revokedBy
            }
          }
        }
      });

      logger.info('OAuth session revoked successfully', {
        projectId,
        reason: revocationData.reason
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to revoke OAuth session', {
        projectId,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Check if reauthorization is required
   */
  async checkReauthorizationRequired(projectId: string): Promise<boolean> {
    try {
      const emailSettings = await prisma.emailSettings.findUnique({
        where: { projectId }
      });

      if (!emailSettings) {
        return true; // No OAuth session exists
      }

      // Check if explicitly marked for reauthorization
      if (emailSettings.oauthReauthorizationRequired) {
        return true;
      }

      // Check if tokens are expired
      if (emailSettings.gmailTokenExpiry && emailSettings.gmailTokenExpiry < new Date()) {
        await this.markForReauthorization(projectId, 'token_expired');
        return true;
      }

      // Check if session is too old (90 days)
      if (emailSettings.oauthGrantedAt) {
        const daysSinceGrant = (Date.now() - emailSettings.oauthGrantedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceGrant > 90) {
          await this.markForReauthorization(projectId, 'policy_violation', 'Session expired after 90 days');
          return true;
        }
      }

      return false;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to check reauthorization requirement', {
        projectId,
        error: errorMessage
      });
      return true; // Fail safe - require reauthorization on error
    }
  }

  /**
   * Get OAuth session compliance report
   */
  async getComplianceReport(projectId: string): Promise<ComplianceReport | null> {
    try {
      const emailSettings = await prisma.emailSettings.findUnique({
        where: { projectId },
        include: {
          project: {
            include: {
              user: true
            }
          }
        }
      });

      if (!emailSettings) {
        return null;
      }

      return {
        projectId,
        projectName: emailSettings.project.name,
        userEmail: emailSettings.project.user.email,
        oauthStatus: {
          isConnected: emailSettings.gmailConnected,
          sessionId: emailSettings.oauthSessionId,
          grantedAt: emailSettings.oauthGrantedAt,
          grantedBy: emailSettings.oauthGrantedBy,
          lastRefreshedAt: emailSettings.oauthLastRefreshedAt,
          tokenExpiry: emailSettings.gmailTokenExpiry,
          scopes: emailSettings.oauthScopes,
          reauthorizationRequired: emailSettings.oauthReauthorizationRequired
        },
        revocationHistory: emailSettings.oauthRevokedAt ? {
          revokedAt: emailSettings.oauthRevokedAt,
          revokedBy: emailSettings.oauthRevokedBy,
          reason: emailSettings.oauthRevokeReason
        } : null,
        complianceData: emailSettings.oauthComplianceData as OAuthComplianceData,
        securityAssessment: {
          sessionAge: emailSettings.oauthGrantedAt ? 
            Math.floor((Date.now() - emailSettings.oauthGrantedAt.getTime()) / (1000 * 60 * 60 * 24)) : null,
          tokenValid: emailSettings.gmailTokenExpiry ? 
            emailSettings.gmailTokenExpiry > new Date() : false,
          needsReauthorization: await this.checkReauthorizationRequired(projectId)
        }
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to generate compliance report', {
        projectId,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Get all OAuth sessions for compliance audit
   */
  async getAllOAuthSessions(): Promise<ComplianceReport[]> {
    try {
      const emailSettings = await prisma.emailSettings.findMany({
        include: {
          project: {
            include: {
              user: true
            }
          }
        }
      });

      const reports = await Promise.all(
        emailSettings.map(setting => this.getComplianceReport(setting.projectId))
      );

      return reports.filter((report): report is ComplianceReport => report !== null);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get all OAuth sessions', {
        error: errorMessage
      });
      throw error;
    }
  }

  // Private helper methods

  private generateSessionId(): string {
    return `oauth_${crypto.randomBytes(16).toString('hex')}_${Date.now()}`;
  }

  private async revokeExistingSession(
    projectId: string, 
    userId: string, 
    reason: string
  ): Promise<void> {
    const existing = await prisma.emailSettings.findUnique({
      where: { projectId }
    });

    if (existing && existing.gmailConnected) {
      await this.revokeOAuthSession(projectId, {
        revokedAt: new Date(),
        revokedBy: userId,
        reason: reason as OAuthRevocationData['reason'],
        details: 'Revoked for new authorization'
      });
    }
  }

  private async markForReauthorization(
    projectId: string, 
    reason: string, 
    details?: string
  ): Promise<void> {
    await prisma.emailSettings.update({
      where: { projectId },
      data: {
        oauthReauthorizationRequired: true,
        oauthComplianceData: {
          ...await this.getExistingComplianceData(projectId),
          reauthorizationRequired: {
            timestamp: new Date().toISOString(),
            reason,
            details
          }
        }
      }
    });
  }

  private async getExistingComplianceData(projectId: string): Promise<OAuthComplianceData> {
    const settings = await prisma.emailSettings.findUnique({
      where: { projectId }
    });
    return (settings?.oauthComplianceData as OAuthComplianceData) || {};
  }

  private async incrementRefreshCount(projectId: string): Promise<number> {
    const existing = await this.getExistingComplianceData(projectId);
    return (existing.refreshCount || 0) + 1;
  }

  private getClientIP(): string {
    // In a real implementation, extract from request headers
    return 'unknown';
  }

  private getUserAgent(): string {
    // In a real implementation, extract from request headers
    return 'unknown';
  }
}

export const oauthSessionManager = new OAuthSessionManager(); 