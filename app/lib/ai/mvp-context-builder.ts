// MVP-focused project context builder for AI email analysis
// Provides essential context while maintaining simplicity and performance
// Optimized for production readiness and reliable analysis

import { Project } from './types';

export interface MVPProjectContext {
  projectInfo: {
    name: string;
    description: string;
    address: string;
    budget: number;
  };
  timeline: {
    startDate: string;
    endDate: string;
  };
}

export class MVPContextBuilder {
  /**
   * Build essential project context for AI analysis
   * Note: Team member filtering is handled by email ingestion, not AI
   * 
   * Only includes data that supports MVP requirements:
   * - Project relevance assessment
   * - Cost impact evaluation  
   * - Basic urgency assessment
   */
  static buildMVPContext(project: Project): MVPProjectContext {
    return {
      projectInfo: {
        name: project.name,
        description: project.description || 'No description provided',
        address: project.address || 'Address not specified',
        budget: project.budget || 0
      },
      timeline: {
        startDate: project.startDate,
        endDate: project.endDate || 'Not specified'
      }
    };
  }

  /**
   * Convert MVP context to AI prompt format
   * Focused on supporting structured output requirements
   */
  static contextToPrompt(context: MVPProjectContext): string {
    return `PROJECT CONTEXT:

PROJECT: ${context.projectInfo.name}
DESCRIPTION: ${context.projectInfo.description}
LOCATION: ${context.projectInfo.address}
BUDGET: $${context.projectInfo.budget.toLocaleString()}
TIMELINE: ${context.timeline.startDate} to ${context.timeline.endDate}

ANALYSIS FOCUS:
1. COST ASSESSMENT: Flag any costs mentioned relative to $${context.projectInfo.budget.toLocaleString()} project budget
2. URGENCY EVALUATION: Assess time-sensitivity based on project timeline
3. PROJECT RELEVANCE: Determine if email content relates to this specific project
4. ENTITY EXTRACTION: Extract relevant contractors, materials, amounts, and dates

Note: This email has already been filtered as project-relevant by business logic.
Use this context to improve classification accuracy and entity extraction.`;
  }

  /**
   * Simple helper to assess cost significance relative to project budget
   * This is the only team-related logic that should remain in context building
   */
  static assessCostSignificance(amount: number, context: MVPProjectContext): {
    significance: 'low' | 'medium' | 'high';
    percentageOfBudget: number;
  } {
    if (context.projectInfo.budget === 0) {
      return { significance: 'medium', percentageOfBudget: 0 };
    }

    const percentage = (amount / context.projectInfo.budget) * 100;
    
    let significance: 'low' | 'medium' | 'high';
    if (percentage < 1) significance = 'low';
    else if (percentage < 10) significance = 'medium';
    else significance = 'high';

    return {
      significance,
      percentageOfBudget: percentage
    };
  }
} 