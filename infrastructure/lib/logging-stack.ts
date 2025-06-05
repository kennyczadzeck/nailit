import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface LoggingStackProps extends cdk.StackProps {
  environment: string;
  envConfig: {
    resourceSuffix: string;
  };
}

export class LoggingStack extends cdk.Stack {
  public readonly loggingRole: iam.IRole;
  public readonly applicationLogGroup: logs.LogGroup;
  public readonly applicationLogGroupName: string;

  constructor(scope: Construct, id: string, props: LoggingStackProps) {
    super(scope, id, props);

    const { environment, envConfig } = props;

    // =================================
    // CLOUDWATCH LOG GROUPS
    // =================================

    // Create the main application log group with CDK-managed naming
    // This avoids conflicts with existing manually created log groups
    this.applicationLogGroupName = `/nailit/${environment}/application`;
    
    this.applicationLogGroup = new logs.LogGroup(this, 'ApplicationLogGroup', {
      logGroupName: this.applicationLogGroupName,
      retention: environment === 'production' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.TWO_WEEKS,
      removalPolicy: environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // =================================
    // IAM ROLE FOR AMPLIFY APP
    // =================================

    // Create the shared IAM role only in staging environment to avoid conflicts
    // Other environments will reference this role
    if (environment === 'staging') {
      // Create a comprehensive role that Amplify can assume for all AWS services
      this.loggingRole = new iam.Role(this, 'AmplifyServiceRole', {
        roleName: `nailit-amplify-service-role`,
        assumedBy: new iam.CompositePrincipal(
          new iam.ServicePrincipal('amplify.amazonaws.com'),
          new iam.ServicePrincipal('lambda.amazonaws.com'), // For future Lambda functions
        ),
        description: `Comprehensive service role for NailIt Amplify app across all environments`,
      });

      // CloudWatch Logs permissions
      (this.loggingRole as iam.Role).addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogGroups',
          'logs:DescribeLogStreams',
        ],
        resources: [
          // Allow access to log groups for all environments
          `arn:aws:logs:${this.region}:${this.account}:log-group:/nailit/development/*`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/nailit/staging/*`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/nailit/production/*`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/nailit/development/application`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/nailit/staging/application`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/nailit/production/application`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/nailit/development/application:*`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/nailit/staging/application:*`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/nailit/production/application:*`,
        ],
      }));

      // S3 permissions for email storage across all environments
      (this.loggingRole as iam.Role).addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
        ],
        resources: [
          `arn:aws:s3:::nailit-*-emails-${this.account}`,
          `arn:aws:s3:::nailit-*-emails-${this.account}/*`,
        ],
      }));

      // SQS permissions for email and AI processing queues
      (this.loggingRole as iam.Role).addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sqs:SendMessage',
          'sqs:ReceiveMessage',
          'sqs:DeleteMessage',
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl',
        ],
        resources: [
          `arn:aws:sqs:${this.region}:${this.account}:nailit-*-email-queue`,
          `arn:aws:sqs:${this.region}:${this.account}:nailit-*-ai-queue`,
          `arn:aws:sqs:${this.region}:${this.account}:nailit-*-email-dlq`,
          `arn:aws:sqs:${this.region}:${this.account}:nailit-*-ai-dlq`,
        ],
      }));

      // SNS permissions for notifications
      (this.loggingRole as iam.Role).addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sns:Publish',
          'sns:Subscribe',
          'sns:Unsubscribe',
          'sns:ListTopics',
        ],
        resources: [
          `arn:aws:sns:${this.region}:${this.account}:nailit-*-notifications`,
        ],
      }));

      // Future: Add additional permissions as needed
      // - RDS/Aurora Serverless permissions
      // - SecretsManager for sensitive data
      // - Parameter Store for configuration
      // - etc.

    } else {
      // Reference the existing role created in staging
      this.loggingRole = iam.Role.fromRoleArn(
        this,
        'AmplifyServiceRole',
        `arn:aws:iam::${this.account}:role/nailit-amplify-service-role`
      );
    }

    // =================================
    // CLOUDWATCH ALARMS
    // =================================

    // High error rate alarm
    const errorRateAlarm = new logs.MetricFilter(this, 'ErrorRateMetricFilter', {
      logGroup: this.applicationLogGroup,
      metricNamespace: 'NailIt/Application',
      metricName: 'ErrorRate',
      filterPattern: logs.FilterPattern.literal('[timestamp, requestId, level="error", ...]'),
      metricValue: '1',
      defaultValue: 0,
    });

    // Security events metric filter
    const securityEventsFilter = new logs.MetricFilter(this, 'SecurityEventsMetricFilter', {
      logGroup: this.applicationLogGroup,
      metricNamespace: 'NailIt/Security',
      metricName: 'SecurityEvents',
      filterPattern: logs.FilterPattern.literal('[timestamp, requestId, level, message, metadata_security_event="true", ...]'),
      metricValue: '1',
      defaultValue: 0,
    });

    // Performance monitoring - slow requests
    const slowRequestsFilter = new logs.MetricFilter(this, 'SlowRequestsMetricFilter', {
      logGroup: this.applicationLogGroup,
      metricNamespace: 'NailIt/Performance',
      metricName: 'SlowRequests',
      filterPattern: logs.FilterPattern.literal('[timestamp, requestId, level, message="Slow request detected*", ...]'),
      metricValue: '1',
      defaultValue: 0,
    });

    // =================================
    // OUTPUTS
    // =================================

    new cdk.CfnOutput(this, 'ApplicationLogGroupName', {
      value: this.applicationLogGroupName,
      description: 'CloudWatch Log Group for application logs',
      exportName: `NailIt-${envConfig.resourceSuffix}-ApplicationLogGroup`,
    });

    new cdk.CfnOutput(this, 'LoggingRoleArn', {
      value: this.loggingRole.roleArn,
      description: 'IAM Role ARN for logging permissions',
      exportName: `NailIt-${envConfig.resourceSuffix}-LoggingRole`,
    });

    // =================================
    // TAGS
    // =================================

    cdk.Tags.of(this).add('Project', 'NailIt');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Component', 'Logging');
  }
} 