// Enhanced project context builder for AI email analysis
// Provides comprehensive context for better analysis quality
// Team member filtering is handled by email ingestion business logic

import { EmailMessage, Project, TeamMember } from './types';

export interface EnhancedProjectContext {
  projectInfo: {
    name: string;
    description: string;
    address: string;
    budget: number;
    phase: string;
    type: string;
  };
  timeline: {
    startDate: string;
    endDate: string;
    daysRemaining: number;
    isOverdue: boolean;
  };
  budget: {
    total: number;
    remaining: number;
    percentUsed: number;
    isNearLimit: boolean;
  };
  team: {
    totalMembers: number;
    contractors: string[];
    hasGeneralContractor: boolean;
  };
  riskFactors: {
    budgetRisk: 'low' | 'medium' | 'high';
    timelineRisk: 'low' | 'medium' | 'high';
    coordinationRisk: 'low' | 'medium' | 'high';
  };
  recentActivity: {
    lastEmailDate: string | null;
    daysSinceLastEmail: number;
    analysisCount: number;
  };
}

export class EnhancedContextBuilder {
  /**
   * Build comprehensive project context for AI analysis
   * Note: Team member filtering is handled by email ingestion, not AI
   * 
   * This context improves analysis quality by providing:
   * - Detailed project status and constraints
   * - Budget and timeline awareness
   * - Risk assessment factors
   * - Team composition insights
   */
  static buildEnhancedContext(
    project: Project, 
    teamMembers: TeamMember[] = [], 
    recentAnalyses: any[] = []
  ): EnhancedProjectContext {
    const now = new Date();
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    // Calculate budget metrics
    const budgetUsed = (project.budget || 0) * 0.3; // Placeholder - would come from actual tracking
    const budgetRemaining = (project.budget || 0) - budgetUsed;
    const percentUsed = project.budget ? (budgetUsed / project.budget) * 100 : 0;
    
    // Team composition analysis
    const contractors = teamMembers.map(tm => tm.name).filter(Boolean);
    const hasGeneralContractor = teamMembers.some(tm => 
      tm.role?.toLowerCase().includes('general') || 
      tm.role?.toLowerCase().includes('gc')
    );
    
    // Risk assessment
    const budgetRisk = percentUsed > 80 ? 'high' : percentUsed > 60 ? 'medium' : 'low';
    const timelineRisk = daysRemaining < 30 ? 'high' : daysRemaining < 90 ? 'medium' : 'low';
    const coordinationRisk = teamMembers.length > 5 ? 'high' : teamMembers.length > 2 ? 'medium' : 'low';
    
    // Recent activity metrics
    const lastAnalysis = recentAnalyses[0];
    const lastEmailDate = lastAnalysis?.analyzedAt || null;
    const daysSinceLastEmail = lastEmailDate ? 
      Math.floor((now.getTime() - new Date(lastEmailDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      projectInfo: {
        name: project.name,
        description: project.description || 'No description provided',
        address: project.address || 'Address not specified',
        budget: project.budget || 0,
        phase: project.phase || 'planning',
        type: project.type || 'residential'
      },
      timeline: {
        startDate: project.startDate,
        endDate: project.endDate || 'Not specified',
        daysRemaining,
        isOverdue: daysRemaining < 0
      },
      budget: {
        total: project.budget || 0,
        remaining: budgetRemaining,
        percentUsed,
        isNearLimit: percentUsed > 80
      },
      team: {
        totalMembers: teamMembers.length,
        contractors,
        hasGeneralContractor
      },
      riskFactors: {
        budgetRisk,
        timelineRisk,
        coordinationRisk
      },
      recentActivity: {
        lastEmailDate,
        daysSinceLastEmail,
        analysisCount: recentAnalyses.length
      }
    };
  }

  /**
   * Convert enhanced context to AI prompt format
   * Provides rich context for better analysis quality
   */
  static contextToPrompt(context: EnhancedProjectContext): string {
    const riskAlerts = [];
    if (context.riskFactors.budgetRisk === 'high') riskAlerts.push('⚠️ BUDGET RISK: >80% used');
    if (context.riskFactors.timelineRisk === 'high') riskAlerts.push('⚠️ TIMELINE RISK: <30 days remaining');
    if (context.timeline.isOverdue) riskAlerts.push('🚨 PROJECT OVERDUE');
    
    return `PROJECT CONTEXT:

PROJECT: ${context.projectInfo.name}
DESCRIPTION: ${context.projectInfo.description}
LOCATION: ${context.projectInfo.address}
TYPE: ${context.projectInfo.type} | PHASE: ${context.projectInfo.phase}

BUDGET STATUS:
- Total: $${context.budget.total.toLocaleString()}
- Used: ${context.budget.percentUsed.toFixed(1)}% ($${(context.budget.total - context.budget.remaining).toLocaleString()})
- Remaining: $${context.budget.remaining.toLocaleString()}

TIMELINE STATUS:
- Start: ${context.timeline.startDate}
- End: ${context.timeline.endDate}
- Days Remaining: ${context.timeline.daysRemaining}
- Status: ${context.timeline.isOverdue ? 'OVERDUE' : 'On Track'}

TEAM COMPOSITION:
- Total Members: ${context.team.totalMembers}
- Has General Contractor: ${context.team.hasGeneralContractor ? 'Yes' : 'No'}
- Active Contractors: ${context.team.contractors.join(', ') || 'None specified'}

RISK ASSESSMENT:
- Budget Risk: ${context.riskFactors.budgetRisk.toUpperCase()}
- Timeline Risk: ${context.riskFactors.timelineRisk.toUpperCase()}
- Coordination Risk: ${context.riskFactors.coordinationRisk.toUpperCase()}

${riskAlerts.length > 0 ? `ACTIVE ALERTS:\n${riskAlerts.join('\n')}\n` : ''}

RECENT ACTIVITY:
- Last Email: ${context.recentActivity.lastEmailDate || 'None'}
- Days Since Last Email: ${context.recentActivity.daysSinceLastEmail}
- Total Analyses: ${context.recentActivity.analysisCount}

ANALYSIS INSTRUCTIONS:
1. BUDGET AWARENESS: Flag any costs relative to ${context.budget.percentUsed.toFixed(1)}% budget usage
2. TIMELINE URGENCY: Consider ${context.timeline.daysRemaining} days remaining for urgency assessment
3. COORDINATION FOCUS: With ${context.team.totalMembers} team members, watch for coordination issues
4. RISK CONTEXT: Current risk profile suggests ${context.riskFactors.budgetRisk}/${context.riskFactors.timelineRisk}/${context.riskFactors.coordinationRisk} risk levels

Note: This email has already been filtered as project-relevant by business logic.
Use this enhanced context to provide more accurate and contextually-aware analysis.`;
  }

  /**
   * Phase-specific analysis guidance
   * Provides context-aware analysis suggestions based on project phase
   */
  static getPhaseSpecificGuidance(phase: string): string {
    const phaseGuidance = {
      'planning': 'Focus on permits, design changes, contractor selection, and timeline establishment',
      'pre-construction': 'Watch for permit approvals, material ordering, contractor scheduling, and site preparation',
      'construction': 'Monitor progress updates, change orders, material deliveries, and quality issues',
      'finishing': 'Track completion milestones, punch list items, final inspections, and warranty issues',
      'completed': 'Handle warranty claims, final payments, and project closeout documentation'
    };
    
    return phaseGuidance[phase.toLowerCase()] || 'Analyze for general project communication and coordination';
  }
} 