#!/usr/bin/env tsx

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function convertAnalysesToUIData() {
  console.log('🔄 Converting Email Analyses to UI Data');
  console.log('========================================\n');
  
  try {
    // Get the test project with email analyses
    const project = await prisma.project.findFirst({
      where: { name: 'Kitchen Renovation Test Project' },
      include: {
        emailMessages: {
          include: {
            emailAnalyses: true
          }
        }
      }
    });
    
    if (!project) {
      console.log('❌ Test project not found');
      return;
    }
    
    console.log('✅ Found project:', project.name);
    console.log('📧 Email messages:', project.emailMessages.length);
    
    let flaggedItemsCreated = 0;
    let timelineEntriesCreated = 0;
    
    for (const email of project.emailMessages) {
      console.log(`\n📩 Processing: ${email.subject}`);
      
      for (const analysis of email.emailAnalyses) {
        console.log(`  🤖 Analysis: ${analysis.classification} (${Math.round(analysis.confidence * 100)}% confidence)`);
        
        // Parse the analysis data
        const keyPoints = analysis.keyPoints || '';
        const actionItems = analysis.actionItems || '';
        const priority = analysis.priority || 'medium';
        
        // Create flagged item if it's important enough
        if (analysis.confidence >= 0.8 || priority === 'high' || analysis.requiresResponse) {
          const flaggedItem = await prisma.flaggedItem.create({
            data: {
              title: `${analysis.classification.toUpperCase()}: ${email.subject}`,
              description: keyPoints.length > 200 ? keyPoints.substring(0, 200) + '...' : keyPoints,
              impact: actionItems.length > 100 ? actionItems.substring(0, 100) + '...' : actionItems,
              category: analysis.classification === 'invoice' ? 'COST' : 
                       analysis.classification === 'change_order' ? 'SCOPE' :
                       analysis.classification === 'delay' ? 'SCHEDULE' :
                       'UNCLASSIFIED',
              emailFrom: email.sender,
              emailSubject: email.subject || '',
              emailDate: email.sentAt,
              originalEmail: email.bodyText || '',
              aiConfidence: analysis.confidence,
              needsEmailResponse: analysis.requiresResponse,
              status: 'PENDING',
              projectId: project.id,
              emailContext: `AI Analysis: ${analysis.classification} detected with ${Math.round(analysis.confidence * 100)}% confidence`
            }
          });
          
          console.log(`    ✅ Created flagged item: ${flaggedItem.title}`);
          flaggedItemsCreated++;
          
          // Create timeline entry for significant items
          if (analysis.classification === 'invoice' || analysis.classification === 'change_order') {
            const timelineEntry = await prisma.timelineEntry.create({
              data: {
                title: analysis.classification === 'invoice' ? 'Invoice Received' : 'Change Order Required',
                description: keyPoints.length > 300 ? keyPoints.substring(0, 300) + '...' : keyPoints,
                category: analysis.classification === 'invoice' ? 'COST' : 'SCOPE',
                date: email.sentAt,
                impact: actionItems,
                cost: analysis.classification === 'invoice' ? extractCostFromText(keyPoints + ' ' + actionItems) : null,
                scheduleImpact: analysis.classification === 'change_order' ? 'Potential delay pending approval' : null,
                scopeDetails: analysis.classification === 'change_order' ? actionItems : null,
                verified: false,
                projectId: project.id,
                flaggedItemId: flaggedItem.id
              }
            });
            
            console.log(`    ✅ Created timeline entry: ${timelineEntry.title}`);
            timelineEntriesCreated++;
          }
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  🚩 Flagged items created: ${flaggedItemsCreated}`);
    console.log(`  📅 Timeline entries created: ${timelineEntriesCreated}`);
    console.log('\n✅ Conversion complete! Refresh the UI to see the data.');
    
  } catch (error) {
    console.error('❌ Error converting analyses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function extractCostFromText(text: string): number | null {
  // Simple regex to extract dollar amounts
  const matches = text.match(/\$[\d,]+\.?\d*/g);
  if (matches && matches.length > 0) {
    const amount = matches[0].replace(/[$,]/g, '');
    return parseFloat(amount);
  }
  return null;
}

if (require.main === module) {
  convertAnalysesToUIData();
}

export { convertAnalysesToUIData }; 