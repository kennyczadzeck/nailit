"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class LoggingStack extends cdk.Stack {
    constructor(scope, id, props) {
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
                assumedBy: new iam.CompositePrincipal(new iam.ServicePrincipal('amplify.amazonaws.com'), new iam.ServicePrincipal('lambda.amazonaws.com')),
                description: `Comprehensive service role for NailIt Amplify app across all environments`,
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
            this.loggingRole.addToPolicy(new iam.PolicyStatement({
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
            this.loggingRole.addToPolicy(new iam.PolicyStatement({
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
            this.loggingRole.addToPolicy(new iam.PolicyStatement({
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
        }
        else {
            // Reference the existing role created in staging
            this.loggingRole = iam.Role.fromRoleArn(this, 'AmplifyServiceRole', `arn:aws:iam::${this.account}:role/nailit-amplify-service-role`);
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
exports.LoggingStack = LoggingStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2luZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2xvZ2dpbmctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsMkRBQTZDO0FBQzdDLHlEQUEyQztBQVUzQyxNQUFhLFlBQWEsU0FBUSxHQUFHLENBQUMsS0FBSztJQUt6QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdCO1FBQ2hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRXpDLG9DQUFvQztRQUNwQyx3QkFBd0I7UUFDeEIsb0NBQW9DO1FBRXBDLGdFQUFnRTtRQUNoRSxrRUFBa0U7UUFDbEUsSUFBSSxDQUFDLHVCQUF1QixHQUFHLFdBQVcsV0FBVyxjQUFjLENBQUM7UUFFcEUsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDeEUsWUFBWSxFQUFFLElBQUksQ0FBQyx1QkFBdUI7WUFDMUMsU0FBUyxFQUFFLFdBQVcsS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVM7WUFDckcsYUFBYSxFQUFFLFdBQVcsS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDbkcsQ0FBQyxDQUFDO1FBRUgsb0NBQW9DO1FBQ3BDLDJCQUEyQjtRQUMzQixvQ0FBb0M7UUFFcEMsNEVBQTRFO1FBQzVFLDhDQUE4QztRQUM5QyxJQUFJLFdBQVcsS0FBSyxTQUFT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QUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDM0MsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNsRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDaEQsQ0FBQztDQUNGO0FBMUxELG9DQTBMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5pbnRlcmZhY2UgTG9nZ2luZ1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIGVudkNvbmZpZzoge1xuICAgIHJlc291cmNlU3VmZml4OiBzdHJpbmc7XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBMb2dnaW5nU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgbG9nZ2luZ1JvbGU6IGlhbS5JUm9sZTtcbiAgcHVibGljIHJlYWRvbmx5IGFwcGxpY2F0aW9uTG9nR3JvdXA6IGxvZ3MuTG9nR3JvdXA7XG4gIHB1YmxpYyByZWFkb25seSBhcHBsaWNhdGlvbkxvZ0dyb3VwTmFtZTogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBMb2dnaW5nU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgeyBlbnZpcm9ubWVudCwgZW52Q29uZmlnIH0gPSBwcm9wcztcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIENMT1VEV0FUQ0ggTE9HIEdST1VQU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gQ3JlYXRlIHRoZSBtYWluIGFwcGxpY2F0aW9uIGxvZyBncm91cCB3aXRoIENESy1tYW5hZ2VkIG5hbWluZ1xuICAgIC8vIFRoaXMgYXZvaWRzIGNvbmZsaWN0cyB3aXRoIGV4aXN0aW5nIG1hbnVhbGx5IGNyZWF0ZWQgbG9nIGdyb3Vwc1xuICAgIHRoaXMuYXBwbGljYXRpb25Mb2dHcm91cE5hbWUgPSBgL25haWxpdC8ke2Vudmlyb25tZW50fS9hcHBsaWNhdGlvbmA7XG4gICAgXG4gICAgdGhpcy5hcHBsaWNhdGlvbkxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0FwcGxpY2F0aW9uTG9nR3JvdXAnLCB7XG4gICAgICBsb2dHcm91cE5hbWU6IHRoaXMuYXBwbGljYXRpb25Mb2dHcm91cE5hbWUsXG4gICAgICByZXRlbnRpb246IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRIIDogbG9ncy5SZXRlbnRpb25EYXlzLlRXT19XRUVLUyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gSUFNIFJPTEUgRk9SIEFNUExJRlkgQVBQXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvLyBDcmVhdGUgdGhlIHNoYXJlZCBJQU0gcm9sZSBvbmx5IGluIHN0YWdpbmcgZW52aXJvbm1lbnQgdG8gYXZvaWQgY29uZmxpY3RzXG4gICAgLy8gT3RoZXIgZW52aXJvbm1lbnRzIHdpbGwgcmVmZXJlbmNlIHRoaXMgcm9sZVxuICAgIGlmIChlbnZpcm9ubWVudCA9PT0gJ3N0YWdpbmcnKSB7XG4gICAgICAvLyBDcmVhdGUgYSBjb21wcmVoZW5zaXZlIHJvbGUgdGhhdCBBbXBsaWZ5IGNhbiBhc3N1bWUgZm9yIGFsbCBBV1Mgc2VydmljZXNcbiAgICAgIHRoaXMubG9nZ2luZ1JvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0FtcGxpZnlTZXJ2aWNlUm9sZScsIHtcbiAgICAgICAgcm9sZU5hbWU6IGBuYWlsaXQtYW1wbGlmeS1zZXJ2aWNlLXJvbGVgLFxuICAgICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uQ29tcG9zaXRlUHJpbmNpcGFsKFxuICAgICAgICAgIG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnYW1wbGlmeS5hbWF6b25hd3MuY29tJyksXG4gICAgICAgICAgbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLCAvLyBGb3IgZnV0dXJlIExhbWJkYSBmdW5jdGlvbnNcbiAgICAgICAgKSxcbiAgICAgICAgZGVzY3JpcHRpb246IGBDb21wcmVoZW5zaXZlIHNlcnZpY2Ugcm9sZSBmb3IgTmFpbEl0IEFtcGxpZnkgYXBwIGFjcm9zcyBhbGwgZW52aXJvbm1lbnRzYCxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBDbG91ZFdhdGNoIExvZ3MgcGVybWlzc2lvbnNcbiAgICAgICh0aGlzLmxvZ2dpbmdSb2xlIGFzIGlhbS5Sb2xlKS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcbiAgICAgICAgICAnbG9nczpDcmVhdGVMb2dTdHJlYW0nLFxuICAgICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXG4gICAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dHcm91cHMnLFxuICAgICAgICAgICdsb2dzOkRlc2NyaWJlTG9nU3RyZWFtcycsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgIC8vIEFsbG93IGFjY2VzcyB0byBsb2cgZ3JvdXBzIGZvciBhbGwgZW52aXJvbm1lbnRzXG4gICAgICAgICAgYGFybjphd3M6bG9nczoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06bG9nLWdyb3VwOi9uYWlsaXQvZGV2ZWxvcG1lbnQvKmAsXG4gICAgICAgICAgYGFybjphd3M6bG9nczoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06bG9nLWdyb3VwOi9uYWlsaXQvc3RhZ2luZy8qYCxcbiAgICAgICAgICBgYXJuOmF3czpsb2dzOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpsb2ctZ3JvdXA6L25haWxpdC9wcm9kdWN0aW9uLypgLFxuICAgICAgICAgIGBhcm46YXdzOmxvZ3M6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OmxvZy1ncm91cDovbmFpbGl0L2RldmVsb3BtZW50L2FwcGxpY2F0aW9uYCxcbiAgICAgICAgICBgYXJuOmF3czpsb2dzOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpsb2ctZ3JvdXA6L25haWxpdC9zdGFnaW5nL2FwcGxpY2F0aW9uYCxcbiAgICAgICAgICBgYXJuOmF3czpsb2dzOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpsb2ctZ3JvdXA6L25haWxpdC9wcm9kdWN0aW9uL2FwcGxpY2F0aW9uYCxcbiAgICAgICAgICBgYXJuOmF3czpsb2dzOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpsb2ctZ3JvdXA6L25haWxpdC9kZXZlbG9wbWVudC9hcHBsaWNhdGlvbjoqYCxcbiAgICAgICAgICBgYXJuOmF3czpsb2dzOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpsb2ctZ3JvdXA6L25haWxpdC9zdGFnaW5nL2FwcGxpY2F0aW9uOipgLFxuICAgICAgICAgIGBhcm46YXdzOmxvZ3M6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OmxvZy1ncm91cDovbmFpbGl0L3Byb2R1Y3Rpb24vYXBwbGljYXRpb246KmAsXG4gICAgICAgIF0sXG4gICAgICB9KSk7XG5cbiAgICAgIC8vIFMzIHBlcm1pc3Npb25zIGZvciBlbWFpbCBzdG9yYWdlIGFjcm9zcyBhbGwgZW52aXJvbm1lbnRzXG4gICAgICAodGhpcy5sb2dnaW5nUm9sZSBhcyBpYW0uUm9sZSkuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAnczM6R2V0T2JqZWN0JyxcbiAgICAgICAgICAnczM6UHV0T2JqZWN0JyxcbiAgICAgICAgICAnczM6RGVsZXRlT2JqZWN0JyxcbiAgICAgICAgICAnczM6TGlzdEJ1Y2tldCcsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgIGBhcm46YXdzOnMzOjo6bmFpbGl0LSotZW1haWxzLSR7dGhpcy5hY2NvdW50fWAsXG4gICAgICAgICAgYGFybjphd3M6czM6OjpuYWlsaXQtKi1lbWFpbHMtJHt0aGlzLmFjY291bnR9LypgLFxuICAgICAgICBdLFxuICAgICAgfSkpO1xuXG4gICAgICAvLyBTUVMgcGVybWlzc2lvbnMgZm9yIGVtYWlsIGFuZCBBSSBwcm9jZXNzaW5nIHF1ZXVlc1xuICAgICAgKHRoaXMubG9nZ2luZ1JvbGUgYXMgaWFtLlJvbGUpLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ3NxczpTZW5kTWVzc2FnZScsXG4gICAgICAgICAgJ3NxczpSZWNlaXZlTWVzc2FnZScsXG4gICAgICAgICAgJ3NxczpEZWxldGVNZXNzYWdlJyxcbiAgICAgICAgICAnc3FzOkdldFF1ZXVlQXR0cmlidXRlcycsXG4gICAgICAgICAgJ3NxczpHZXRRdWV1ZVVybCcsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgIGBhcm46YXdzOnNxczoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06bmFpbGl0LSotZW1haWwtcXVldWVgLFxuICAgICAgICAgIGBhcm46YXdzOnNxczoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06bmFpbGl0LSotYWktcXVldWVgLFxuICAgICAgICAgIGBhcm46YXdzOnNxczoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06bmFpbGl0LSotZW1haWwtZGxxYCxcbiAgICAgICAgICBgYXJuOmF3czpzcXM6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9Om5haWxpdC0qLWFpLWRscWAsXG4gICAgICAgIF0sXG4gICAgICB9KSk7XG5cbiAgICAgIC8vIFNOUyBwZXJtaXNzaW9ucyBmb3Igbm90aWZpY2F0aW9uc1xuICAgICAgKHRoaXMubG9nZ2luZ1JvbGUgYXMgaWFtLlJvbGUpLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ3NuczpQdWJsaXNoJyxcbiAgICAgICAgICAnc25zOlN1YnNjcmliZScsXG4gICAgICAgICAgJ3NuczpVbnN1YnNjcmliZScsXG4gICAgICAgICAgJ3NuczpMaXN0VG9waWNzJyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgYGFybjphd3M6c25zOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpuYWlsaXQtKi1ub3RpZmljYXRpb25zYCxcbiAgICAgICAgXSxcbiAgICAgIH0pKTtcblxuICAgICAgLy8gRnV0dXJlOiBBZGQgYWRkaXRpb25hbCBwZXJtaXNzaW9ucyBhcyBuZWVkZWRcbiAgICAgIC8vIC0gUkRTL0F1cm9yYSBTZXJ2ZXJsZXNzIHBlcm1pc3Npb25zXG4gICAgICAvLyAtIFNlY3JldHNNYW5hZ2VyIGZvciBzZW5zaXRpdmUgZGF0YVxuICAgICAgLy8gLSBQYXJhbWV0ZXIgU3RvcmUgZm9yIGNvbmZpZ3VyYXRpb25cbiAgICAgIC8vIC0gZXRjLlxuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFJlZmVyZW5jZSB0aGUgZXhpc3Rpbmcgcm9sZSBjcmVhdGVkIGluIHN0YWdpbmdcbiAgICAgIHRoaXMubG9nZ2luZ1JvbGUgPSBpYW0uUm9sZS5mcm9tUm9sZUFybihcbiAgICAgICAgdGhpcyxcbiAgICAgICAgJ0FtcGxpZnlTZXJ2aWNlUm9sZScsXG4gICAgICAgIGBhcm46YXdzOmlhbTo6JHt0aGlzLmFjY291bnR9OnJvbGUvbmFpbGl0LWFtcGxpZnktc2VydmljZS1yb2xlYFxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDTE9VRFdBVENIIEFMQVJNU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gSGlnaCBlcnJvciByYXRlIGFsYXJtXG4gICAgY29uc3QgZXJyb3JSYXRlQWxhcm0gPSBuZXcgbG9ncy5NZXRyaWNGaWx0ZXIodGhpcywgJ0Vycm9yUmF0ZU1ldHJpY0ZpbHRlcicsIHtcbiAgICAgIGxvZ0dyb3VwOiB0aGlzLmFwcGxpY2F0aW9uTG9nR3JvdXAsXG4gICAgICBtZXRyaWNOYW1lc3BhY2U6ICdOYWlsSXQvQXBwbGljYXRpb24nLFxuICAgICAgbWV0cmljTmFtZTogJ0Vycm9yUmF0ZScsXG4gICAgICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4ubGl0ZXJhbCgnW3RpbWVzdGFtcCwgcmVxdWVzdElkLCBsZXZlbD1cImVycm9yXCIsIC4uLl0nKSxcbiAgICAgIG1ldHJpY1ZhbHVlOiAnMScsXG4gICAgICBkZWZhdWx0VmFsdWU6IDAsXG4gICAgfSk7XG5cbiAgICAvLyBTZWN1cml0eSBldmVudHMgbWV0cmljIGZpbHRlclxuICAgIGNvbnN0IHNlY3VyaXR5RXZlbnRzRmlsdGVyID0gbmV3IGxvZ3MuTWV0cmljRmlsdGVyKHRoaXMsICdTZWN1cml0eUV2ZW50c01ldHJpY0ZpbHRlcicsIHtcbiAgICAgIGxvZ0dyb3VwOiB0aGlzLmFwcGxpY2F0aW9uTG9nR3JvdXAsXG4gICAgICBtZXRyaWNOYW1lc3BhY2U6ICdOYWlsSXQvU2VjdXJpdHknLFxuICAgICAgbWV0cmljTmFtZTogJ1NlY3VyaXR5RXZlbnRzJyxcbiAgICAgIGZpbHRlclBhdHRlcm46IGxvZ3MuRmlsdGVyUGF0dGVybi5saXRlcmFsKCdbdGltZXN0YW1wLCByZXF1ZXN0SWQsIGxldmVsLCBtZXNzYWdlLCBtZXRhZGF0YV9zZWN1cml0eV9ldmVudD1cInRydWVcIiwgLi4uXScpLFxuICAgICAgbWV0cmljVmFsdWU6ICcxJyxcbiAgICAgIGRlZmF1bHRWYWx1ZTogMCxcbiAgICB9KTtcblxuICAgIC8vIFBlcmZvcm1hbmNlIG1vbml0b3JpbmcgLSBzbG93IHJlcXVlc3RzXG4gICAgY29uc3Qgc2xvd1JlcXVlc3RzRmlsdGVyID0gbmV3IGxvZ3MuTWV0cmljRmlsdGVyKHRoaXMsICdTbG93UmVxdWVzdHNNZXRyaWNGaWx0ZXInLCB7XG4gICAgICBsb2dHcm91cDogdGhpcy5hcHBsaWNhdGlvbkxvZ0dyb3VwLFxuICAgICAgbWV0cmljTmFtZXNwYWNlOiAnTmFpbEl0L1BlcmZvcm1hbmNlJyxcbiAgICAgIG1ldHJpY05hbWU6ICdTbG93UmVxdWVzdHMnLFxuICAgICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLmxpdGVyYWwoJ1t0aW1lc3RhbXAsIHJlcXVlc3RJZCwgbGV2ZWwsIG1lc3NhZ2U9XCJTbG93IHJlcXVlc3QgZGV0ZWN0ZWQqXCIsIC4uLl0nKSxcbiAgICAgIG1ldHJpY1ZhbHVlOiAnMScsXG4gICAgICBkZWZhdWx0VmFsdWU6IDAsXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBPVVRQVVRTXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBwbGljYXRpb25Mb2dHcm91cE5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hcHBsaWNhdGlvbkxvZ0dyb3VwTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRXYXRjaCBMb2cgR3JvdXAgZm9yIGFwcGxpY2F0aW9uIGxvZ3MnLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tQXBwbGljYXRpb25Mb2dHcm91cGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9nZ2luZ1JvbGVBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5sb2dnaW5nUm9sZS5yb2xlQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gUm9sZSBBUk4gZm9yIGxvZ2dpbmcgcGVybWlzc2lvbnMnLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tTG9nZ2luZ1JvbGVgLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gVEFHU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdQcm9qZWN0JywgJ05haWxJdCcpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudCk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdNYW5hZ2VkQnknLCAnQ0RLJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdDb21wb25lbnQnLCAnTG9nZ2luZycpO1xuICB9XG59ICJdfQ==