import * as cdk from 'aws-cdk-lib';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface AppRunnerStackProps extends cdk.StackProps {
  environment: string;
  envConfig: {
    amplifyBranch: string;
    databaseBranch: string;
    resourceSuffix: string;
  };
}

export class AppRunnerStack extends cdk.Stack {
  public readonly appRunnerService: apprunner.CfnService;

  constructor(scope: Construct, id: string, props: AppRunnerStackProps) {
    super(scope, id, props);

    const { environment, envConfig } = props;
    const accountId = props.env?.account || this.account;
    const region = props.env?.region || 'us-east-1';

    // =================================
    // IAM ROLE FOR APP RUNNER
    // =================================

    // Instance Role for App Runner service
    const instanceRole = new iam.Role(this, 'AppRunnerInstanceRole', {
      roleName: `nailit-${envConfig.resourceSuffix}-apprunner-instance`,
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
      ],
      inlinePolicies: {
        NailItServiceAccess: new iam.PolicyDocument({
          statements: [
            // S3 bucket access for email storage
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
              ],
              resources: [
                `arn:aws:s3:::nailit-${envConfig.resourceSuffix}-emails-${accountId}`,
                `arn:aws:s3:::nailit-${envConfig.resourceSuffix}-emails-${accountId}/*`,
              ],
            }),
            // SQS queue access
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sqs:SendMessage',
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
                'sqs:GetQueueUrl',
              ],
              resources: [
                `arn:aws:sqs:${region}:${accountId}:nailit-${envConfig.resourceSuffix}-email-queue`,
                `arn:aws:sqs:${region}:${accountId}:nailit-${envConfig.resourceSuffix}-ai-queue`,
                `arn:aws:sqs:${region}:${accountId}:nailit-${envConfig.resourceSuffix}-email-ingestion-queue`,
                `arn:aws:sqs:${region}:${accountId}:nailit-${envConfig.resourceSuffix}-email-assignment-queue`,
                `arn:aws:sqs:${region}:${accountId}:nailit-${envConfig.resourceSuffix}-email-flagging-queue`,
              ],
            }),
            // SNS topic access
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sns:Publish',
                'sns:GetTopicAttributes',
              ],
              resources: [
                `arn:aws:sns:${region}:${accountId}:nailit-${envConfig.resourceSuffix}-notifications`,
              ],
            }),
            // CloudWatch Logs access for application logging
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
              ],
              resources: [
                `arn:aws:logs:${region}:${accountId}:log-group:/nailit/${environment}/*`,
                `arn:aws:logs:${region}:${accountId}:log-group:/nailit/${environment}/*:*`,
              ],
            }),
          ],
        }),
      },
    });

    // Access Role for App Runner to access GitHub (ECR would be different)
    const accessRole = new iam.Role(this, 'AppRunnerAccessRole', {
      roleName: `nailit-${envConfig.resourceSuffix}-apprunner-access`,
      assumedBy: new iam.ServicePrincipal('build.apprunner.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSAppRunnerServicePolicyForECRAccess'),
      ],
    });

    // =================================
    // APP RUNNER SERVICE
    // =================================

    // App Runner service configuration
    this.appRunnerService = new apprunner.CfnService(this, 'NailItAppRunnerService', {
      serviceName: `nailit-${envConfig.resourceSuffix}`,
      sourceConfiguration: {
        autoDeploymentsEnabled: true,
        codeRepository: {
          repositoryUrl: 'https://github.com/kennyczadzeck/nailit',
          sourceCodeVersion: {
            type: 'BRANCH',
            value: envConfig.amplifyBranch, // develop, staging, or main
          },
          codeConfiguration: {
            configurationSource: 'REPOSITORY', // Use apprunner.yaml from repo
          },
        },
      },
      instanceConfiguration: {
        cpu: environment === 'production' ? '1 vCPU' : '0.25 vCPU',
        memory: environment === 'production' ? '2 GB' : '0.5 GB',
        instanceRoleArn: instanceRole.roleArn,
      },
      healthCheckConfiguration: {
        protocol: 'HTTP',
        path: '/api/health',
        interval: 10,
        timeout: 5,
        healthyThreshold: 1,
        unhealthyThreshold: 5,
      },
      autoScalingConfigurationArn: this.createAutoScalingConfiguration(envConfig.resourceSuffix, environment),
    });

    // =================================
    // AUTO SCALING CONFIGURATION
    // =================================

    // Add outputs
    this.addOutputs(envConfig);

    // =================================
    // TAGS
    // =================================

    cdk.Tags.of(this).add('Project', 'NailIt');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('DatabaseProvider', 'Neon');
    cdk.Tags.of(this).add('HostingProvider', 'AppRunner');
  }

  private createAutoScalingConfiguration(resourceSuffix: string, environment: string): string {
    const autoScalingConfig = new apprunner.CfnAutoScalingConfiguration(this, 'AutoScalingConfig', {
      autoScalingConfigurationName: `nailit-${resourceSuffix}-autoscaling`,
      maxConcurrency: environment === 'production' ? 100 : 25,
      maxSize: environment === 'production' ? 10 : 3,
      minSize: environment === 'production' ? 2 : 1,
    });

    return autoScalingConfig.attrAutoScalingConfigurationArn;
  }

  // =================================
  // OUTPUTS
  // =================================

  private addOutputs(envConfig: { resourceSuffix: string }) {
    new cdk.CfnOutput(this, 'AppRunnerServiceUrl', {
      value: `https://${this.appRunnerService.attrServiceUrl}`,
      description: 'App Runner service URL',
      exportName: `NailIt-${envConfig.resourceSuffix}-AppRunnerUrl`,
    });

    new cdk.CfnOutput(this, 'AppRunnerServiceArn', {
      value: this.appRunnerService.attrServiceArn,
      description: 'App Runner service ARN',
      exportName: `NailIt-${envConfig.resourceSuffix}-AppRunnerArn`,
    });

    new cdk.CfnOutput(this, 'AppRunnerServiceId', {
      value: this.appRunnerService.attrServiceId,
      description: 'App Runner service ID',
      exportName: `NailIt-${envConfig.resourceSuffix}-AppRunnerServiceId`,
    });
  }
} 