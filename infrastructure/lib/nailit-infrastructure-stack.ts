import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import { Construct } from 'constructs';

interface NailItInfrastructureStackProps extends cdk.StackProps {
  environment: string;
  envConfig: {
    amplifyBranch: string;
    databaseBranch: string;
    resourceSuffix: string;
  };
}

export class NailItInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NailItInfrastructureStackProps) {
    super(scope, id, props);

    const { environment, envConfig } = props;
    const accountId = props.env?.account || this.account;

    // =================================
    // S3 STORAGE
    // =================================

    // Email Storage Bucket
    const emailBucket = new s3.Bucket(this, 'EmailStorageBucket', {
      bucketName: `nailit-${envConfig.resourceSuffix}-emails-${accountId}`,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
        {
          id: 'TransitionToIA',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
      removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // =================================
    // SQS QUEUES
    // =================================

    // Email Processing Queue
    const emailQueue = new sqs.Queue(this, 'EmailProcessingQueue', {
      queueName: `nailit-${envConfig.resourceSuffix}-email-queue`,
      visibilityTimeout: cdk.Duration.minutes(5),
      retentionPeriod: cdk.Duration.days(14),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'EmailProcessingDLQ', {
          queueName: `nailit-${envConfig.resourceSuffix}-email-dlq`,
          retentionPeriod: cdk.Duration.days(14),
        }),
        maxReceiveCount: 3,
      },
    });

    // AI Processing Queue
    const aiQueue = new sqs.Queue(this, 'AIProcessingQueue', {
      queueName: `nailit-${envConfig.resourceSuffix}-ai-queue`,
      visibilityTimeout: cdk.Duration.minutes(10),
      retentionPeriod: cdk.Duration.days(14),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'AIProcessingDLQ', {
          queueName: `nailit-${envConfig.resourceSuffix}-ai-dlq`,
          retentionPeriod: cdk.Duration.days(14),
        }),
        maxReceiveCount: 3,
      },
    });

    // =================================
    // SNS NOTIFICATIONS
    // =================================

    // Notification Topic
    const notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: `nailit-${envConfig.resourceSuffix}-notifications`,
      displayName: `NailIt ${environment} Notifications`,
    });

    // =================================
    // AWS AMPLIFY (Reference Only)
    // =================================
    // Note: Amplify app is manually managed but documented here
    // App ID: d1rq0k9js5lwg3 
    // Branches: develop, staging, main
    // Custom domains configured in console

    // =================================
    // IAM ROLES & POLICIES
    // =================================

    // Lambda Execution Role (for future Lambda functions)
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `nailit-${envConfig.resourceSuffix}-lambda-execution`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        NailItServiceAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
              ],
              resources: [emailBucket.bucketArn, `${emailBucket.bucketArn}/*`],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sqs:SendMessage',
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
              ],
              resources: [emailQueue.queueArn, aiQueue.queueArn],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sns:Publish',
              ],
              resources: [notificationTopic.topicArn],
            }),
          ],
        }),
      },
    });

    // =================================
    // OUTPUTS
    // =================================

    new cdk.CfnOutput(this, 'EmailBucketName', {
      value: emailBucket.bucketName,
      description: 'S3 bucket for email storage',
      exportName: `NailIt-${envConfig.resourceSuffix}-EmailBucket`,
    });

    new cdk.CfnOutput(this, 'EmailQueueUrl', {
      value: emailQueue.queueUrl,
      description: 'SQS queue URL for email processing',
      exportName: `NailIt-${envConfig.resourceSuffix}-EmailQueue`,
    });

    new cdk.CfnOutput(this, 'AIQueueUrl', {
      value: aiQueue.queueUrl,
      description: 'SQS queue URL for AI processing',
      exportName: `NailIt-${envConfig.resourceSuffix}-AIQueue`,
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: notificationTopic.topicArn,
      description: 'SNS topic ARN for notifications',
      exportName: `NailIt-${envConfig.resourceSuffix}-NotificationTopic`,
    });

    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: lambdaExecutionRole.roleArn,
      description: 'IAM role ARN for Lambda execution',
      exportName: `NailIt-${envConfig.resourceSuffix}-LambdaRole`,
    });

    // =================================
    // TAGS
    // =================================

    cdk.Tags.of(this).add('Project', 'NailIt');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('DatabaseProvider', 'Neon');
    cdk.Tags.of(this).add('HostingProvider', 'Amplify');
  }
} 