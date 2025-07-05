// Main email analyzer using OpenAI GPT-4o with enhanced context

import OpenAI from 'openai';
import { EmailMessage, Project, EmailAnalysis, AnalysisResult, AnalysisError } from './types';
import { PromptBuilder } from './prompt-builder';
import { MVPContextBuilder } from './mvp-context-builder';

interface EmailAnalyzerOptions {
  useEnhancedContext?: boolean; // Keep for backward compatibility, but default to MVP
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class EmailAnalyzer {
  private openai: OpenAI;
  private options: EmailAnalyzerOptions;

  constructor(options: EmailAnalyzerOptions = {}) {
    this.options = {
      useEnhancedContext: false, // Default to MVP context
      model: 'gpt-4o',
      maxTokens: 2000,
      temperature: 0.1,
      ...options
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Analyze an email in the context of a construction project
   */
  async analyzeEmail(email: EmailMessage, project: Project): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      // Use MVP context by default for production readiness
      const prompt = this.options.useEnhancedContext 
        ? this.buildEnhancedPrompt(email, project)
        : this.buildMVPPrompt(email, project);

      const response = await this.openai.chat.completions.create({
        model: this.options.model!,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: prompt.userPrompt }
        ],
        max_tokens: this.options.maxTokens,
        temperature: this.options.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const analysis = this.parseAnalysisResponse(content);
      const processingTime = Date.now() - startTime;

      // Add processing metadata
      analysis.processing_metadata = {
        analyzed_at: new Date().toISOString(),
        model_used: this.options.model!,
        processing_time_ms: processingTime
      };

      return {
        success: true,
        analysis
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Email analysis failed:', error);

      const analysisError: AnalysisError = {
        type: error instanceof SyntaxError ? 'parse_error' : 'api_error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
        retry_suggested: true
      };

      return {
        success: false,
        error: analysisError
      };
    }
  }

  /**
   * Build MVP-focused prompt using simplified context
   */
  private buildMVPPrompt(email: EmailMessage, project: Project): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const mvpContext = MVPContextBuilder.buildMVPContext(project);
    const contextPrompt = MVPContextBuilder.contextToPrompt(mvpContext);
    
    return {
      systemPrompt: PromptBuilder.getSystemPrompt(),
      userPrompt: `${contextPrompt}\n\n${PromptBuilder.buildEmailAnalysisPrompt(email)}`
    };
  }

  /**
   * Build enhanced prompt (kept for testing/comparison)
   */
  private buildEnhancedPrompt(email: EmailMessage, project: Project): {
    systemPrompt: string;
    userPrompt: string;
  } {
    // Import enhanced context builder only when needed
    const { EnhancedContextBuilder } = require('./enhanced-context-builder');
    const enhancedContext = EnhancedContextBuilder.buildEnhancedContext(project, email);
    const contextPrompt = EnhancedContextBuilder.contextToPrompt(enhancedContext);
    
    return {
      systemPrompt: PromptBuilder.getSystemPrompt(),
      userPrompt: `${contextPrompt}\n\n${PromptBuilder.buildEmailAnalysisPrompt(email)}`
    };
  }

  private parseAnalysisResponse(content: string): EmailAnalysis {
    try {
      const parsed = JSON.parse(content);

      // Validate required fields
      if (!parsed.classification || !parsed.summary || !parsed.entities) {
        throw new Error('Missing required fields in analysis response');
      }

      // Ensure confidence is a number between 0 and 1
      if (typeof parsed.classification.confidence !== 'number') {
        parsed.classification.confidence = 0.5; // Default fallback
      }
      
      // Normalize confidence to 0-1 range if it's 0-100
      if (parsed.classification.confidence > 1) {
        parsed.classification.confidence = parsed.classification.confidence / 100;
      }

      return {
        id: '', // Will be set when stored in database
        classification: {
          primary_type: parsed.classification.primary_type || 'communication',
          confidence: parsed.classification.confidence,
          sub_categories: parsed.classification.sub_categories || []
        },
        summary: {
          key_points: parsed.summary.key_points || [],
          action_items: parsed.summary.action_items || [],
          timeline_mentions: parsed.summary.timeline_mentions || []
        },
        entities: {
          contractors: parsed.entities.contractors || [],
          materials: parsed.entities.materials || [],
          locations: parsed.entities.locations || [],
          amounts: parsed.entities.amounts || [],
          dates: parsed.entities.dates || []
        },
        priority: parsed.priority || 'medium',
        requires_response: parsed.requires_response || false,
        attachments_mentioned: parsed.attachments_mentioned || false,
        confidence_score: parsed.classification.confidence,
        processing_metadata: {
          analyzed_at: new Date().toISOString(),
          model_used: this.options.model!,
          processing_time_ms: 0 // Will be set by caller
        },
        // Database fields (will be set when storing)
        projectId: '',
        emailMessageId: '',
        createdAt: '',
        updatedAt: ''
      };

    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      console.error('Response content:', content);
      throw new SyntaxError(`Failed to parse OpenAI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test the analyzer with a simple email
   */
  async testConnection(): Promise<boolean> {
    try {
      const testEmail: EmailMessage = {
        id: 'test-1',
        from: 'test@example.com',
        to: 'project@example.com',
        subject: 'Test Email',
        body: 'This is a test email to verify the OpenAI connection.',
        date: new Date().toISOString()
      };

      const testProject: Project = {
        id: 'test-project',
        name: 'Test Project',
        type: 'Residential',
        phase: 'planning',
        address: '123 Test St',
        budget: 100000,
        spent_to_date: 0,
        start_date: '2024-01-01',
        estimated_completion: '2024-12-31',
        current_phase: 'planning',
        phase_activities: ['permits', 'design'],
        change_order_threshold: 5000,
        days_remaining: 365,
        team_members: [],
        contractors: []
      };

      const result = await this.analyzeEmail(testEmail, testProject);
      return result.success;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Toggle between enhanced and basic context
   */
  setEnhancedContext(enabled: boolean): void {
    this.options.useEnhancedContext = enabled;
  }

  /**
   * Get current context mode
   */
  isUsingEnhancedContext(): boolean {
    return this.options.useEnhancedContext;
  }
} 