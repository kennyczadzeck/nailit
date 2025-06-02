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
exports.NailItInfrastructureStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const sqs = __importStar(require("aws-cdk-lib/aws-sqs"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class NailItInfrastructureStack extends cdk.Stack {
    constructor(scope, id, props) {
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
exports.NailItInfrastructureStack = NailItInfrastructureStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFpbGl0LWluZnJhc3RydWN0dXJlLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbmFpbGl0LWluZnJhc3RydWN0dXJlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVEQUF5QztBQUN6Qyx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHlEQUEyQztBQWEzQyxNQUFhLHlCQUEwQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3RELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBcUM7UUFDN0UsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDekMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUVyRCxvQ0FBb0M7UUFDcEMsYUFBYTtRQUNiLG9DQUFvQztRQUVwQyx1QkFBdUI7UUFDdkIsTUFBTSxXQUFXLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1RCxVQUFVLEVBQUUsVUFBVSxTQUFTLENBQUMsY0FBYyxXQUFXLFNBQVMsRUFBRTtZQUNwRSxTQUFTLEVBQUUsSUFBSTtZQUNmLGNBQWMsRUFBRTtnQkFDZDtvQkFDRSxFQUFFLEVBQUUsbUJBQW1CO29CQUN2QixPQUFPLEVBQUUsSUFBSTtvQkFDYiwyQkFBMkIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7aUJBQ25EO2dCQUNEO29CQUNFLEVBQUUsRUFBRSxnQkFBZ0I7b0JBQ3BCLE9BQU8sRUFBRSxJQUFJO29CQUNiLFdBQVcsRUFBRTt3QkFDWDs0QkFDRSxZQUFZLEVBQUUsRUFBRSxDQUFDLFlB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SSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMxQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3RELENBQUM7Q0FDRjtBQTlLRCw4REE4S0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIHNxcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3FzJztcbmltcG9ydCAqIGFzIHNucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGFtcGxpZnkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFtcGxpZnknO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmludGVyZmFjZSBOYWlsSXRJbmZyYXN0cnVjdHVyZVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIGVudkNvbmZpZzoge1xuICAgIGFtcGxpZnlCcmFuY2g6IHN0cmluZztcbiAgICBkYXRhYmFzZUJyYW5jaDogc3RyaW5nO1xuICAgIHJlc291cmNlU3VmZml4OiBzdHJpbmc7XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBOYWlsSXRJbmZyYXN0cnVjdHVyZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IE5haWxJdEluZnJhc3RydWN0dXJlU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgeyBlbnZpcm9ubWVudCwgZW52Q29uZmlnIH0gPSBwcm9wcztcbiAgICBjb25zdCBhY2NvdW50SWQgPSBwcm9wcy5lbnY/LmFjY291bnQgfHwgdGhpcy5hY2NvdW50O1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUzMgU1RPUkFHRVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gRW1haWwgU3RvcmFnZSBCdWNrZXRcbiAgICBjb25zdCBlbWFpbEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0VtYWlsU3RvcmFnZUJ1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGBuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LWVtYWlscy0ke2FjY291bnRJZH1gLFxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnRGVsZXRlT2xkVmVyc2lvbnMnLFxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgbm9uY3VycmVudFZlcnNpb25FeHBpcmF0aW9uOiBjZGsuRHVyYXRpb24uZGF5cygzMCksXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ1RyYW5zaXRpb25Ub0lBJyxcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgIHRyYW5zaXRpb25zOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLklORlJFUVVFTlRfQUNDRVNTLFxuICAgICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFNRUyBRVUVVRVNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIEVtYWlsIFByb2Nlc3NpbmcgUXVldWVcbiAgICBjb25zdCBlbWFpbFF1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnRW1haWxQcm9jZXNzaW5nUXVldWUnLCB7XG4gICAgICBxdWV1ZU5hbWU6IGBuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LWVtYWlsLXF1ZXVlYCxcbiAgICAgIHZpc2liaWxpdHlUaW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgIHJldGVudGlvblBlcmlvZDogY2RrLkR1cmF0aW9uLmRheXMoMTQpLFxuICAgICAgZGVhZExldHRlclF1ZXVlOiB7XG4gICAgICAgIHF1ZXVlOiBuZXcgc3FzLlF1ZXVlKHRoaXMsICdFbWFpbFByb2Nlc3NpbmdETFEnLCB7XG4gICAgICAgICAgcXVldWVOYW1lOiBgbmFpbGl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1lbWFpbC1kbHFgLFxuICAgICAgICAgIHJldGVudGlvblBlcmlvZDogY2RrLkR1cmF0aW9uLmRheXMoMTQpLFxuICAgICAgICB9KSxcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEFJIFByb2Nlc3NpbmcgUXVldWVcbiAgICBjb25zdCBhaVF1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnQUlQcm9jZXNzaW5nUXVldWUnLCB7XG4gICAgICBxdWV1ZU5hbWU6IGBuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LWFpLXF1ZXVlYCxcbiAgICAgIHZpc2liaWxpdHlUaW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygxMCksXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSxcbiAgICAgIGRlYWRMZXR0ZXJRdWV1ZToge1xuICAgICAgICBxdWV1ZTogbmV3IHNxcy5RdWV1ZSh0aGlzLCAnQUlQcm9jZXNzaW5nRExRJywge1xuICAgICAgICAgIHF1ZXVlTmFtZTogYG5haWxpdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tYWktZGxxYCxcbiAgICAgICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSxcbiAgICAgICAgfSksXG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogMyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBTTlMgTk9USUZJQ0FUSU9OU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gTm90aWZpY2F0aW9uIFRvcGljXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uVG9waWMgPSBuZXcgc25zLlRvcGljKHRoaXMsICdOb3RpZmljYXRpb25Ub3BpYycsIHtcbiAgICAgIHRvcGljTmFtZTogYG5haWxpdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tbm90aWZpY2F0aW9uc2AsXG4gICAgICBkaXNwbGF5TmFtZTogYE5haWxJdCAke2Vudmlyb25tZW50fSBOb3RpZmljYXRpb25zYCxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEFXUyBBTVBMSUZZIChSZWZlcmVuY2UgT25seSlcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBOb3RlOiBBbXBsaWZ5IGFwcCBpcyBtYW51YWxseSBtYW5hZ2VkIGJ1dCBkb2N1bWVudGVkIGhlcmVcbiAgICAvLyBBcHAgSUQ6IGQxcnEwazlqczVsd2czIFxuICAgIC8vIEJyYW5jaGVzOiBkZXZlbG9wLCBzdGFnaW5nLCBtYWluXG4gICAgLy8gQ3VzdG9tIGRvbWFpbnMgY29uZmlndXJlZCBpbiBjb25zb2xlXG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBJQU0gUk9MRVMgJiBQT0xJQ0lFU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gTGFtYmRhIEV4ZWN1dGlvbiBSb2xlIChmb3IgZnV0dXJlIExhbWJkYSBmdW5jdGlvbnMpXG4gICAgY29uc3QgbGFtYmRhRXhlY3V0aW9uUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnTGFtYmRhRXhlY3V0aW9uUm9sZScsIHtcbiAgICAgIHJvbGVOYW1lOiBgbmFpbGl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1sYW1iZGEtZXhlY3V0aW9uYCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpLFxuICAgICAgXSxcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgIE5haWxJdFNlcnZpY2VBY2Nlc3M6IG5ldyBpYW0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgJ3MzOkdldE9iamVjdCcsXG4gICAgICAgICAgICAgICAgJ3MzOlB1dE9iamVjdCcsXG4gICAgICAgICAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdCcsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIHJlc291cmNlczogW2VtYWlsQnVja2V0LmJ1Y2tldEFybiwgYCR7ZW1haWxCdWNrZXQuYnVja2V0QXJufS8qYF0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgJ3NxczpTZW5kTWVzc2FnZScsXG4gICAgICAgICAgICAgICAgJ3NxczpSZWNlaXZlTWVzc2FnZScsXG4gICAgICAgICAgICAgICAgJ3NxczpEZWxldGVNZXNzYWdlJyxcbiAgICAgICAgICAgICAgICAnc3FzOkdldFF1ZXVlQXR0cmlidXRlcycsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIHJlc291cmNlczogW2VtYWlsUXVldWUucXVldWVBcm4sIGFpUXVldWUucXVldWVBcm5dLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICdzbnM6UHVibGlzaCcsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIHJlc291cmNlczogW25vdGlmaWNhdGlvblRvcGljLnRvcGljQXJuXSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0pLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIE9VVFBVVFNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFbWFpbEJ1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogZW1haWxCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgYnVja2V0IGZvciBlbWFpbCBzdG9yYWdlJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LUVtYWlsQnVja2V0YCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFbWFpbFF1ZXVlVXJsJywge1xuICAgICAgdmFsdWU6IGVtYWlsUXVldWUucXVldWVVcmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NRUyBxdWV1ZSBVUkwgZm9yIGVtYWlsIHByb2Nlc3NpbmcnLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tRW1haWxRdWV1ZWAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQUlRdWV1ZVVybCcsIHtcbiAgICAgIHZhbHVlOiBhaVF1ZXVlLnF1ZXVlVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdTUVMgcXVldWUgVVJMIGZvciBBSSBwcm9jZXNzaW5nJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LUFJUXVldWVgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ05vdGlmaWNhdGlvblRvcGljQXJuJywge1xuICAgICAgdmFsdWU6IG5vdGlmaWNhdGlvblRvcGljLnRvcGljQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdTTlMgdG9waWMgQVJOIGZvciBub3RpZmljYXRpb25zJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LU5vdGlmaWNhdGlvblRvcGljYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMYW1iZGFFeGVjdXRpb25Sb2xlQXJuJywge1xuICAgICAgdmFsdWU6IGxhbWJkYUV4ZWN1dGlvblJvbGUucm9sZUFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnSUFNIHJvbGUgQVJOIGZvciBMYW1iZGEgZXhlY3V0aW9uJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LUxhbWJkYVJvbGVgLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gVEFHU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdQcm9qZWN0JywgJ05haWxJdCcpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudCk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdNYW5hZ2VkQnknLCAnQ0RLJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdEYXRhYmFzZVByb3ZpZGVyJywgJ05lb24nKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0hvc3RpbmdQcm92aWRlcicsICdBbXBsaWZ5Jyk7XG4gIH1cbn0gIl19