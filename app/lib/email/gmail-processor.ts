import { logger } from '../logger'

interface EmailProcessingResult {
  success: boolean
  messageId?: string
  filteredOut?: boolean
  reason?: string
  error?: string
}

/**
 * Gmail processor class for handling email ingestion
 * Temporarily disabled due to type mismatches - TODO: Fix types and re-enable
 */
export class GmailProcessor {
  constructor(_accessToken: string) {
    // Temporarily disabled
  }

  async processWebhookNotification(
    _userId: string,
    _historyId: string,
    _userEmail: string
  ): Promise<EmailProcessingResult[]> {
    // Temporarily disabled - return placeholder
    return [{ success: false, error: 'Gmail processor temporarily disabled' }]
  }
}

/**
 * Create a Gmail processor instance for a user
 * Temporarily disabled due to type mismatches - TODO: Fix types and re-enable
 */
export async function createGmailProcessor(userId: string): Promise<GmailProcessor | null> {
  // Temporarily disabled - return null
  logger.warn('Gmail processor temporarily disabled', { userId })
  return null
} 