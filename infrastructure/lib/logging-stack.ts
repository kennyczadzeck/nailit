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
  public readonly loggingRole: iam.Role;
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

    // Create a role that Amplify/Next.js can assume for logging
    this.loggingRole = new iam.Role(this, 'LoggingRole', {
      roleName: `nailit-${envConfig.resourceSuffix}-logging-role`,
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('amplify.amazonaws.com'),
        new iam.ServicePrincipal('lambda.amazonaws.com'), // For future Lambda functions
      ),
      description: `Logging permissions for NailIt ${environment} environment`,
    });

    // CloudWatch Logs permissions
    this.loggingRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogGroups',
        'logs:DescribeLogStreams',
      ],
      resources: [
        this.applicationLogGroup.logGroupArn,
        // Allow creation of new log streams within this group
        `${this.applicationLogGroup.logGroupArn}:*`,
        // Also allow access to the existing manual log group
        `arn:aws:logs:${this.region}:${this.account}:log-group:/nailit/${environment}/application`,
        `arn:aws:logs:${this.region}:${this.account}:log-group:/nailit/${environment}/application:*`,
      ],
    }));

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