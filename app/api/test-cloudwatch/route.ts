import { NextResponse } from 'next/server';
import { CloudWatchLogsClient, CreateLogGroupCommand, DescribeLogGroupsCommand, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';

export async function GET() {
  const environment = process.env.NAILIT_ENVIRONMENT || 'development';
  const region = process.env.NAILIT_AWS_REGION || 'us-east-1';
  const logGroupName = `/nailit/${environment}/application`;
  const logStreamName = `test-${Date.now()}`;
  
  const results: string[] = [];
  const errors: string[] = [];

  try {
    // Test 1: Check if CloudWatch client can be initialized
    const cloudWatchClient = new CloudWatchLogsClient({
      region: region
    });
    results.push('✅ CloudWatch client initialized successfully');

    // Test 2: Try to describe existing log groups
    try {
      const describeCommand = new DescribeLogGroupsCommand({
        logGroupNamePrefix: `/nailit/${environment}`
      });
      const describeResult = await cloudWatchClient.send(describeCommand);
      results.push(`✅ Found ${describeResult.logGroups?.length || 0} log groups with prefix /nailit/${environment}`);
      
      if (describeResult.logGroups?.length) {
        describeResult.logGroups.forEach(group => {
          results.push(`   📋 Log group: ${group.logGroupName}`);
        });
      }
    } catch (error) {
      errors.push(`❌ Failed to describe log groups: ${error}`);
    }

    // Test 3: Try to create log group if it doesn't exist
    try {
      const createGroupCommand = new CreateLogGroupCommand({
        logGroupName: logGroupName
      });
      await cloudWatchClient.send(createGroupCommand);
      results.push(`✅ Created log group: ${logGroupName}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('ResourceAlreadyExistsException')) {
        results.push(`✅ Log group already exists: ${logGroupName}`);
      } else {
        errors.push(`❌ Failed to create log group: ${errorMessage}`);
      }
    }

    // Test 4: Try to create log stream
    try {
      const createStreamCommand = new CreateLogStreamCommand({
        logGroupName: logGroupName,
        logStreamName: logStreamName
      });
      await cloudWatchClient.send(createStreamCommand);
      results.push(`✅ Created log stream: ${logStreamName}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`❌ Failed to create log stream: ${errorMessage}`);
    }

    // Test 5: Try to send a test log event
    try {
      const putLogCommand = new PutLogEventsCommand({
        logGroupName: logGroupName,
        logStreamName: logStreamName,
        logEvents: [
          {
            timestamp: Date.now(),
            message: JSON.stringify({
              level: 'info',
              message: 'CloudWatch test log entry',
              test: true,
              environment: environment,
              timestamp: new Date().toISOString()
            })
          }
        ]
      });
      await cloudWatchClient.send(putLogCommand);
      results.push('✅ Successfully sent test log event to CloudWatch');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`❌ Failed to send log event: ${errorMessage}`);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`❌ Failed to initialize CloudWatch client: ${errorMessage}`);
  }

  return NextResponse.json({
    success: errors.length === 0,
    environment,
    region,
    logGroupName,
    logStreamName,
    results,
    errors,
    environmentVariables: {
      NAILIT_ENVIRONMENT: process.env.NAILIT_ENVIRONMENT,
      NAILIT_AWS_REGION: process.env.NAILIT_AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '[SET]' : '[NOT SET]',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '[SET]' : '[NOT SET]',
      AWS_REGION: process.env.AWS_REGION
    },
    timestamp: new Date().toISOString()
  });
} 