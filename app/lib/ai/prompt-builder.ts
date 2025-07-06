// Modular prompt builder for construction email analysis

import { EmailMessage, Project } from './types';

export class PromptBuilder {
  /**
   * Layer 1: System Prompt (Static)
   * Defines the AI's role and output format requirements
   */
  static getSystemPrompt(): string {
    return `You are a construction project analyst specializing in email processing for residential and commercial construction projects. Your role is to analyze construction-related emails and extract key information in a structured format.

CRITICAL REQUIREMENTS:
- Always respond with valid JSON matching the specified schema
- Focus on construction-specific terminology and context
- Identify key stakeholders, timelines, costs, and materials
- Classify emails by their primary purpose in the construction workflow
- Extract actionable items and important dates
- Maintain professional objectivity in summaries

OUTPUT FORMAT:
You must respond with a JSON object matching this exact schema:
{
  "classification": {
    "primary_type": "string",
    "confidence": "number",
    "sub_categories": ["string"]
  },
  "summary": {
    "key_points": ["string"],
    "action_items": ["string"],
    "timeline_mentions": ["string"]
  },
  "entities": {
    "contractors": ["string"],
    "materials": ["string"],
    "locations": ["string"],
    "amounts": ["string"],
    "dates": ["string"]
  },
  "priority": "string",
  "requires_response": "boolean",
  "attachments_mentioned": "boolean"
}

CLASSIFICATION TYPES:
- invoice: Bills, payment requests, receipts
- change_order: Scope changes, additional work requests
- progress_update: Work status, completion reports
- schedule_update: Timeline changes, delays, scheduling
- material_delivery: Supply arrivals, shortages, orders
- inspection: Code compliance, quality checks, permits
- communication: General project coordination, meetings
- issue_report: Problems, concerns, defects, complaints

PRIORITY LEVELS:
- high: Urgent issues, safety concerns, immediate deadlines
- medium: Important but not urgent, standard business
- low: Informational, non-critical updates

Analyze the email content carefully and provide accurate, actionable insights.`;
  }

  /**
   * Layer 2: Context Injection (Dynamic)
   * Builds project-specific context for better analysis
   */
  static buildProjectContext(project: Project): string {
    const teamMembersText = project.teamMembers && project.teamMembers.length > 0
      ? project.teamMembers.map(member => `- ${member.name} (${member.role}) - ${member.email}`).join('\n')
      : 'No team members specified';

    const estimatedPhase = this.estimateProjectPhase(project);
    const phaseContext = this.getPhaseContext(estimatedPhase);
    const budgetContext = this.getBudgetContext(project);

    return `PROJECT CONTEXT:
Name: ${project.name}
Description: ${project.description || 'No description provided'}
Status: ${project.status}
Address: ${project.address || 'Address not specified'}
Budget: ${project.budget ? `$${project.budget.toLocaleString()}` : 'Budget not specified'}
Timeline: ${project.startDate} to ${project.endDate || 'End date not specified'}

TEAM MEMBERS:
${teamMembersText}

ESTIMATED PHASE: ${estimatedPhase}
${phaseContext}

BUDGET CONTEXT:
${budgetContext}

This context should inform your analysis of the email content. Pay special attention to:
- Recognizing team members and their roles
- Understanding the current construction phase
- Identifying budget and timeline implications
- Connecting email content to project context`;
  }

  /**
   * Layer 3: Email Analysis Prompt (Dynamic)
   * Formats the email content for analysis
   */
  static buildEmailAnalysisPrompt(email: EmailMessage): string {
    const attachmentsText = email.attachments && email.attachments.length > 0
      ? `ATTACHMENTS: ${email.attachments.join(', ')}`
      : 'ATTACHMENTS: None';

    return `ANALYZE THIS EMAIL:

FROM: ${email.sender}
TO: ${email.recipients.join(', ')}
SUBJECT: ${email.subject}
DATE: ${email.sentAt}
${attachmentsText}

CONTENT:
${email.bodyText}

ANALYSIS INSTRUCTIONS:
1. Classify this email based on its primary purpose in the construction workflow
2. Extract key information relevant to project management
3. Identify any action items or deadlines mentioned
4. Note any mentions of costs, materials, or schedule changes
5. Assess the priority level based on content urgency and project context
6. Determine if this email requires a response from the project team
7. Check if attachments are mentioned in the email content

Consider the project context provided above when making your analysis. Use your understanding of construction workflows and terminology to provide accurate insights.`;
  }

  /**
   * Combines all three layers into a complete prompt
   */
  static buildCompletePrompt(email: EmailMessage, project: Project): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const systemPrompt = this.getSystemPrompt();
    const projectContext = this.buildProjectContext(project);
    const emailAnalysis = this.buildEmailAnalysisPrompt(email);

    const userPrompt = `${projectContext}\n\n${emailAnalysis}`;

    return {
      systemPrompt,
      userPrompt
    };
  }

  /**
   * Helper: Estimate project phase based on timeline
   */
  private static estimateProjectPhase(project: Project): string {
    const startDate = new Date(project.startDate);
    const endDate = project.endDate ? new Date(project.endDate) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const progressRatio = elapsed / totalDuration;
    
    if (progressRatio < 0.1) return 'planning';
    if (progressRatio < 0.3) return 'foundation';
    if (progressRatio < 0.7) return 'systems';
    if (progressRatio < 0.9) return 'finishing';
    return 'completion';
  }

  /**
   * Helper: Get phase-specific analysis context
   */
  private static getPhaseContext(phase: string): string {
    const phasePrompts: Record<string, string> = {
      'planning': 'Focus on permits, designs, contractor selection, and planning approvals.',
      'foundation': 'Emphasize excavation, concrete work, foundation inspections, and site preparation.',
      'framing': 'Look for structural elements, lumber deliveries, framing inspections, and structural work.',
      'systems': 'Focus on electrical, plumbing, HVAC installations, and systems inspections.',
      'finishing': 'Emphasize interior work, fixtures, finishes, and final inspections.',
      'completion': 'Look for punch lists, final payments, warranties, and project closeout items.'
    };

    return phasePrompts[phase] || 'General construction activities and project coordination.';
  }

  /**
   * Helper: Get budget-aware context
   */
  private static getBudgetContext(project: Project): string {
    if (!project.budget) {
      return 'Budget information not available. Monitor for any cost-related discussions.';
    }

    const budget = project.budget;
    const changeOrderThreshold = budget * 0.1; // 10% of budget

    return `Total Budget: $${budget.toLocaleString()}
Change Order Threshold: $${changeOrderThreshold.toLocaleString()}

Flag any costs over the change order threshold or significant budget implications.`;
  }
} 