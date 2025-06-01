import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';

export interface NailItInfrastructureStackProps extends cdk.StackProps {
  environment: string;
  domainName?: string;
}

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NailItInfrastructureStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // VPC for secure networking
    const vpc = new ec2.Vpc(this, 'NailItVPC', {
      maxAzs: 2,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 1, // Cost optimization for dev environment
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Security Groups
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: vpc,
      description: 'Security group for RDS PostgreSQL database',
      allowAllOutbound: false,
    });

    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: vpc,
      description: 'Security group for Lambda functions',
    });

    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc: vpc,
      description: 'Security group for Redis ElastiCache',
      allowAllOutbound: false,
    });

    // Allow Lambda to connect to RDS
    dbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to connect to PostgreSQL'
    );

    // Allow local development access (temporary for setup)
    dbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'Allow local development access - REMOVE IN PRODUCTION'
    );

    // Allow Lambda to connect to Redis
    redisSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Lambda to connect to Redis'
    );

    // RDS PostgreSQL Database
    const database = new rds.DatabaseInstance(this, 'NailItDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_7,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageType: rds.StorageType.GP2,
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      databaseName: 'nailit',
      credentials: rds.Credentials.fromGeneratedSecret('nailitadmin'),
      backupRetention: cdk.Duration.days(7),
      deletionProtection: environment === 'production',
      removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoMinorVersionUpgrade: true,
      multiAz: false, // Keep false for dev environment cost savings
    });

    // ElastiCache Redis for caching
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis cluster',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    const redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
      port: 6379,
    });

    // S3 Bucket for email content and attachments
    const emailBucket = new s3.Bucket(this, 'NailItEmailBucket', {
      bucketName: `nailit-${environment}-emails-${this.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          id: 'delete-old-versions',
          expiration: cdk.Duration.days(90),
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // SQS Queues for email processing pipeline
    const emailDeadLetterQueue = new sqs.Queue(this, 'EmailProcessingDLQ', {
      queueName: `nailit-${environment}-email-dlq`,
      retentionPeriod: cdk.Duration.days(14),
    });

    const emailQueue = new sqs.Queue(this, 'EmailProcessingQueue', {
      queueName: `nailit-${environment}-email-queue`,
      visibilityTimeout: cdk.Duration.minutes(15),
      retentionPeriod: cdk.Duration.days(7),
      deadLetterQueue: {
        queue: emailDeadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    const aiProcessingQueue = new sqs.Queue(this, 'AIProcessingQueue', {
      queueName: `nailit-${environment}-ai-processing-queue`,
      visibilityTimeout: cdk.Duration.minutes(10),
      retentionPeriod: cdk.Duration.days(7),
    });

    // SNS Topic for notifications
    const notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: `nailit-${environment}-notifications`,
      displayName: 'NailIt Email Notifications',
    });

    // Lambda Execution Role
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
      inlinePolicies: {
        NailItLambdaPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret',
              ],
              resources: [database.secret!.secretArn],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
              ],
              resources: [`${emailBucket.bucketArn}/*`],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sqs:SendMessage',
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
              ],
              resources: [
                emailQueue.queueArn,
                aiProcessingQueue.queueArn,
                emailDeadLetterQueue.queueArn,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sns:Publish',
              ],
              resources: [notificationTopic.topicArn],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
              ],
              resources: [
                `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
                `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
              ],
            }),
          ],
        }),
      },
    });

    // API Gateway for webhooks and external integrations
    const api = new apigateway.RestApi(this, 'NailItApi', {
      restApiName: `NailIt ${environment} API`,
      description: `NailIt ${environment} environment API`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        // Disable CloudWatch logging to avoid account role requirement
        loggingLevel: apigateway.MethodLoggingLevel.OFF,
      },
    });

    // Lambda Log Groups (separate to control retention and encryption)
    const emailProcessingLogGroup = new logs.LogGroup(this, 'EmailProcessingLogGroup', {
      logGroupName: `/aws/lambda/nailit-${environment}-email-processing`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const aiProcessingLogGroup = new logs.LogGroup(this, 'AIProcessingLogGroup', {
      logGroupName: `/aws/lambda/nailit-${environment}-ai-processing`, 
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS PostgreSQL endpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: database.secret!.secretArn,
      description: 'Database credentials secret ARN',
    });

    new cdk.CfnOutput(this, 'EmailBucketName', {
      value: emailBucket.bucketName,
      description: 'S3 bucket for email content',
    });

    new cdk.CfnOutput(this, 'EmailQueueUrl', {
      value: emailQueue.queueUrl,
      description: 'Email processing queue URL',
    });

    new cdk.CfnOutput(this, 'ProcessingQueueUrl', {
      value: aiProcessingQueue.queueUrl,
      description: 'AI processing queue URL',
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: notificationTopic.topicArn,
      description: 'SNS notification topic ARN',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: redisCluster.attrRedisEndpointAddress,
      description: 'Redis cluster endpoint',
    });
  }
}
