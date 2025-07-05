import { prisma } from '../app/lib/prisma';

interface ValidationCheck {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  critical: boolean;
}

async function validateE2EWorkflow() {
  console.log('🎯 Validating end-to-end workflow...');
  
  try {
    // Get test project with all related data
    const project = await prisma.project.findFirst({
      where: { 
        OR: [
          { name: 'Kitchen Renovation Test Project' },
          { name: { contains: 'Test' } }
        ]
      },
      include: {
        user: true,
        emailMessages: {
          include: {
            emailAnalyses: true
          }
        },
        emailAnalyses: true,
        flaggedItems: true,
        timelineEntries: true,
        teamMembers: true,
        emailSettings: true
      }
    });

    if (!project) {
      throw new Error('Test project not found. Run setup first.');
    }

    console.log('\n📊 End-to-End Workflow Data:');
    console.log(`   Project: ${project.name}`);
    console.log(`   User: ${project.user.email}`);
    console.log(`   Team Members: ${project.teamMembers.length}`);
    console.log(`   Email Settings: ${project.emailSettings ? 'Configured' : 'Missing'}`);
    console.log(`   Ingested Emails: ${project.emailMessages.length}`);
    console.log(`   AI Analyses: ${project.emailAnalyses.length}`);
    console.log(`   Flagged Items: ${project.flaggedItems.length}`);
    console.log(`   Timeline Entries: ${project.timelineEntries.length}`);

    // Perform validation checks
    const checks: ValidationCheck[] = [
      {
        name: 'Test homeowner account exists',
        passed: project.user.email === 'nailit.test.homeowner@gmail.com',
        expected: 'nailit.test.homeowner@gmail.com',
        actual: project.user.email,
        critical: true
      },
      {
        name: 'Project properly configured',
        passed: project.name.includes('Test') && project.status === 'ACTIVE',
        expected: 'Test project with ACTIVE status',
        actual: `${project.name} (${project.status})`,
        critical: true
      },
      {
        name: 'Team members configured',
        passed: project.teamMembers.length >= 1,
        expected: 'At least 1 team member',
        actual: `${project.teamMembers.length} team members`,
        critical: true
      },
      {
        name: 'Email settings configured',
        passed: project.emailSettings !== null && project.emailSettings.monitoringEnabled,
        expected: 'Email monitoring enabled',
        actual: project.emailSettings ? 'Configured' : 'Missing',
        critical: true
      },
      {
        name: 'Emails ingested',
        passed: project.emailMessages.length > 0,
        expected: 'At least 1 ingested email',
        actual: `${project.emailMessages.length} emails`,
        critical: true
      },
      {
        name: 'AI analysis completed',
        passed: project.emailAnalyses.length > 0,
        expected: 'At least 1 AI analysis',
        actual: `${project.emailAnalyses.length} analyses`,
        critical: true
      },
      {
        name: 'High analysis coverage',
        passed: project.emailMessages.length > 0 && (project.emailAnalyses.length / project.emailMessages.length) >= 0.8,
        expected: '80% of emails analyzed',
        actual: project.emailMessages.length > 0 ? `${((project.emailAnalyses.length / project.emailMessages.length) * 100).toFixed(1)}%` : '0%',
        critical: false
      },
      {
        name: 'Flagged items created',
        passed: project.flaggedItems.length > 0,
        expected: 'At least 1 flagged item',
        actual: `${project.flaggedItems.length} flagged items`,
        critical: false
      },
      {
        name: 'Timeline entries created',
        passed: project.timelineEntries.length > 0,
        expected: 'At least 1 timeline entry',
        actual: `${project.timelineEntries.length} timeline entries`,
        critical: false
      },
      {
        name: 'Reasonable flagging rate',
        passed: project.emailAnalyses.length > 0 && (project.flaggedItems.length / project.emailAnalyses.length) >= 0.1,
        expected: '10% of analyses flagged',
        actual: project.emailAnalyses.length > 0 ? `${((project.flaggedItems.length / project.emailAnalyses.length) * 100).toFixed(1)}%` : '0%',
        critical: false
      }
    ];

    // Calculate AI analysis quality metrics
    const analysisQualityChecks = await validateAnalysisQuality(project.emailAnalyses);
    checks.push(...analysisQualityChecks);

    // Display validation results
    console.log('\n✅ Validation Checks:');
    let passedChecks = 0;
    let criticalFailures = 0;

    for (const check of checks) {
      const status = check.passed ? '✅ PASS' : '❌ FAIL';
      const critical = check.critical ? ' (CRITICAL)' : '';
      console.log(`   ${status} ${check.name}${critical}`);
      console.log(`      Expected: ${check.expected}`);
      console.log(`      Actual: ${check.actual}`);
      
      if (check.passed) {
        passedChecks++;
      } else if (check.critical) {
        criticalFailures++;
      }
    }

    // Calculate success metrics
    const totalChecks = checks.length;
    const successRate = (passedChecks / totalChecks) * 100;
    const criticalChecks = checks.filter(c => c.critical).length;
    const criticalSuccessRate = ((criticalChecks - criticalFailures) / criticalChecks) * 100;

    console.log(`\n📈 Validation Results:`);
    console.log(`   Overall Success Rate: ${successRate.toFixed(1)}% (${passedChecks}/${totalChecks})`);
    console.log(`   Critical Success Rate: ${criticalSuccessRate.toFixed(1)}% (${criticalChecks - criticalFailures}/${criticalChecks})`);
    console.log(`   Critical Failures: ${criticalFailures}`);

    // Determine overall result
    if (criticalFailures === 0 && successRate >= 80) {
      console.log('\n🎉 End-to-end workflow validation PASSED!');
      console.log('✅ All critical checks passed and overall success rate ≥ 80%');
      return { success: true, successRate, criticalFailures, checks };
    } else if (criticalFailures === 0) {
      console.log('\n⚠️  End-to-end workflow validation PARTIAL SUCCESS!');
      console.log('✅ All critical checks passed but overall success rate < 80%');
      return { success: true, successRate, criticalFailures, checks };
    } else {
      console.log('\n❌ End-to-end workflow validation FAILED!');
      console.log(`❌ ${criticalFailures} critical check(s) failed`);
      return { success: false, successRate, criticalFailures, checks };
    }

  } catch (error) {
    console.error('❌ E2E validation failed:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await prisma.$disconnect();
  }
}

async function validateAnalysisQuality(analyses: any[]): Promise<ValidationCheck[]> {
  if (analyses.length === 0) {
    return [];
  }

  const confidenceScores = analyses.map(a => a.confidenceScore);
  const avgConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
  const highConfidenceCount = confidenceScores.filter(score => score >= 0.8).length;
  const highConfidenceRate = (highConfidenceCount / confidenceScores.length) * 100;

  const processingTimes = analyses.map(a => a.processingTimeMs);
  const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;

  const primaryTypes = analyses.map(a => a.primaryType);
  const classifiedCount = primaryTypes.filter(type => type !== 'unclassified').length;
  const classificationRate = (classifiedCount / primaryTypes.length) * 100;

  return [
    {
      name: 'High average confidence',
      passed: avgConfidence >= 0.75,
      expected: '≥75% average confidence',
      actual: `${(avgConfidence * 100).toFixed(1)}%`,
      critical: false
    },
    {
      name: 'High confidence rate',
      passed: highConfidenceRate >= 60,
      expected: '≥60% of analyses with high confidence (≥80%)',
      actual: `${highConfidenceRate.toFixed(1)}%`,
      critical: false
    },
    {
      name: 'Reasonable processing time',
      passed: avgProcessingTime <= 10000, // 10 seconds
      expected: '≤10 seconds average processing time',
      actual: `${(avgProcessingTime / 1000).toFixed(1)}s`,
      critical: false
    },
    {
      name: 'Good classification rate',
      passed: classificationRate >= 80,
      expected: '≥80% of emails classified (not unclassified)',
      actual: `${classificationRate.toFixed(1)}%`,
      critical: false
    }
  ];
}

// Run validation if called directly
if (require.main === module) {
  validateE2EWorkflow()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { validateE2EWorkflow }; 