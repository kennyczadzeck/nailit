// API endpoint for AI-powered email analysis

import { NextRequest, NextResponse } from 'next/server';
import { EmailAnalyzer } from '@/app/lib/ai/email-analyzer';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, projectId, useEnhancedContext = false, storeInDatabase = false } = body; // Default to MVP context, optional storage

    // Validate required fields
    if (!email || !projectId) {
      return NextResponse.json(
        { error: 'Email and projectId are required' },
        { status: 400 }
      );
    }

    // Fetch project with team members for context
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        teamMembers: true,
        emailSettings: true
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Initialize analyzer with MVP context by default
    const analyzer = new EmailAnalyzer({ 
      useEnhancedContext: useEnhancedContext // Only use enhanced if explicitly requested
    });

    // Analyze email
    const result = await analyzer.analyzeEmail(email, project);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Analysis failed', details: result.error },
        { status: 500 }
      );
    }

    let storedAnalysis = null;

    // Store analysis result in database only if requested and email exists
    if (storeInDatabase) {
      try {
        // Check if EmailMessage exists first
        const emailMessage = await prisma.emailMessage.findUnique({
          where: { id: email.id }
        });

        if (emailMessage) {
          storedAnalysis = await prisma.emailAnalysis.upsert({
            where: {
              emailId_projectId: {
                emailId: email.id,
                projectId: project.id
              }
            },
            update: {
              classification: result.analysis!.classification.primary_type,
              confidence: result.analysis!.confidence_score,
              confidenceScore: result.analysis!.confidence_score,
              subCategories: JSON.stringify(result.analysis!.classification.sub_categories),
              keyPoints: JSON.stringify(result.analysis!.summary.key_points),
              actionItems: JSON.stringify(result.analysis!.summary.action_items),
              timelineMentions: JSON.stringify(result.analysis!.summary.timeline_mentions),
              entities: JSON.stringify(result.analysis!.entities),
              priority: result.analysis!.priority,
              requiresResponse: result.analysis!.requires_response,
              attachmentsMentioned: result.analysis!.attachments_mentioned,
              modelUsed: result.analysis!.processing_metadata.model_used,
              processingTimeMs: result.analysis!.processing_metadata.processing_time_ms,
              analyzedAt: new Date(result.analysis!.processing_metadata.analyzed_at)
            },
            create: {
              emailId: email.id,
              projectId: project.id,
              classification: result.analysis!.classification.primary_type,
              confidence: result.analysis!.confidence_score,
              confidenceScore: result.analysis!.confidence_score,
              subCategories: JSON.stringify(result.analysis!.classification.sub_categories),
              keyPoints: JSON.stringify(result.analysis!.summary.key_points),
              actionItems: JSON.stringify(result.analysis!.summary.action_items),
              timelineMentions: JSON.stringify(result.analysis!.summary.timeline_mentions),
              entities: JSON.stringify(result.analysis!.entities),
              priority: result.analysis!.priority,
              requiresResponse: result.analysis!.requires_response,
              attachmentsMentioned: result.analysis!.attachments_mentioned,
              modelUsed: result.analysis!.processing_metadata.model_used,
              processingTimeMs: result.analysis!.processing_metadata.processing_time_ms,
              analyzedAt: new Date(result.analysis!.processing_metadata.analyzed_at)
            }
          });
        }
      } catch (dbError) {
        console.warn('Database storage failed:', dbError);
        // Continue without storing - analysis is still valid
      }
    }

    // Return analysis with optional database ID
    return NextResponse.json({
      success: true,
      analysis: {
        ...result.analysis,
        id: storedAnalysis?.id || `temp-${Date.now()}`
      },
      contextType: useEnhancedContext ? 'enhanced' : 'mvp',
      storedInDatabase: !!storedAnalysis
    });

  } catch (error) {
    console.error('Email analysis API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 