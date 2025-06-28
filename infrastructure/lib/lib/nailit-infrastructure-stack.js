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
        // Enhanced Email Ingestion Queue for real-time processing
        const emailIngestionQueue = new sqs.Queue(this, 'EmailIngestionQueue', {
            queueName: `nailit-${envConfig.resourceSuffix}-email-ingestion-queue`,
            visibilityTimeout: cdk.Duration.minutes(3),
            retentionPeriod: cdk.Duration.days(14),
            deadLetterQueue: {
                queue: new sqs.Queue(this, 'EmailIngestionDLQ', {
                    queueName: `nailit-${envConfig.resourceSuffix}-email-ingestion-dlq`,
                    retentionPeriod: cdk.Duration.days(14),
                }),
                maxReceiveCount: 3,
            },
        });
        // Email Assignment Queue for project association
        const emailAssignmentQueue = new sqs.Queue(this, 'EmailAssignmentQueue', {
            queueName: `nailit-${envConfig.resourceSuffix}-email-assignment-queue`,
            visibilityTimeout: cdk.Duration.minutes(5),
            retentionPeriod: cdk.Duration.days(14),
            deadLetterQueue: {
                queue: new sqs.Queue(this, 'EmailAssignmentDLQ', {
                    queueName: `nailit-${envConfig.resourceSuffix}-email-assignment-dlq`,
                    retentionPeriod: cdk.Duration.days(14),
                }),
                maxReceiveCount: 3,
            },
        });
        // Email Flagging Queue for flagged item integration
        const emailFlaggingQueue = new sqs.Queue(this, 'EmailFlaggingQueue', {
            queueName: `nailit-${envConfig.resourceSuffix}-email-flagging-queue`,
            visibilityTimeout: cdk.Duration.minutes(8),
            retentionPeriod: cdk.Duration.days(14),
            deadLetterQueue: {
                queue: new sqs.Queue(this, 'EmailFlaggingDLQ', {
                    queueName: `nailit-${envConfig.resourceSuffix}-email-flagging-dlq`,
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
                            resources: [
                                emailQueue.queueArn,
                                aiQueue.queueArn,
                                emailIngestionQueue.queueArn,
                                emailAssignmentQueue.queueArn,
                                emailFlaggingQueue.queueArn
                            ],
                        }),
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                'sns:Publish',
                            ],
                            resources: [notificationTopic.topicArn],
                        }),
                        // CloudWatch Logs permissions for application logging
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
                                `arn:aws:logs:*:*:log-group:/nailit/${environment}/*`,
                                `arn:aws:logs:*:*:log-group:/nailit/${environment}/*:*`,
                            ],
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
        new cdk.CfnOutput(this, 'EmailIngestionQueueUrl', {
            value: emailIngestionQueue.queueUrl,
            description: 'SQS queue URL for enhanced email ingestion',
            exportName: `NailIt-${envConfig.resourceSuffix}-EmailIngestionQueue`,
        });
        new cdk.CfnOutput(this, 'EmailAssignmentQueueUrl', {
            value: emailAssignmentQueue.queueUrl,
            description: 'SQS queue URL for email project assignment',
            exportName: `NailIt-${envConfig.resourceSuffix}-EmailAssignmentQueue`,
        });
        new cdk.CfnOutput(this, 'EmailFlaggingQueueUrl', {
            value: emailFlaggingQueue.queueUrl,
            description: 'SQS queue URL for email flagging integration',
            exportName: `NailIt-${envConfig.resourceSuffix}-EmailFlaggingQueue`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFpbGl0LWluZnJhc3RydWN0dXJlLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vbmFpbGl0LWluZnJhc3RydWN0dXJlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVEQUF5QztBQUN6Qyx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHlEQUEyQztBQWEzQyxNQUFhLHlCQUEwQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3RELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBcUM7UUFDN0UsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDekMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUVyRCxvQ0FBb0M7UUFDcEMsYUFBYTtRQUNiLG9DQUFvQztRQUVwQyx1QkFBdUI7UUFDdkIsTUFBTSxXQUFXLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1RCxVQUFVLEVBQUUsVUFBVSxTQUFTLENBQUMsY0FBYyxXQUFXLFNBQVMsRUFBRTtZQUNwRSxTQUFTLEVBQUUsSUFBSTtZQUNmLGNBQWMsRUFBRTtnQkFDZDtvQkFDRSxFQUFFLEVBQUUsbUJBQW1CO29CQUN2QixPQUFPLEVBQUUsSUFBSTtvQkFDYiwyQkFBMkIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7aUJBQ25EO2dCQUNEO29CQUNFLEVBQUUsRUFBRSxnQkFBZ0I7b0JBQ3BCLE9BQU8sRUFBRSxJQUFJO29CQUNiLFdBQVcsRUFBRTt3QkFDWDs0QkFDRSxZQUFZLEVBQUUsRUFBRSxDQUFDLFlB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QUUsVUFBVSxTQUFTLENBQUMsY0FBYyxvQkFBb0I7U0FDbkUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNoRCxLQUFLLEVBQUUsbUJBQW1CLENBQUMsT0FBTztZQUNsQyxXQUFXLEVBQUUsbUNBQW1DO1lBQ2hELFVBQVUsRUFBRSxVQUFVLFNBQVMsQ0FBQyxjQUFjLGFBQWE7U0FDNUQsQ0FBQyxDQUFDO1FBRUgsb0NBQW9DO1FBQ3BDLE9BQU87UUFDUCxvQ0FBb0M7UUFFcEMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMzQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN0RCxDQUFDO0NBQ0Y7QUEvUEQsOERBK1BDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBzcXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNxcyc7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBhbXBsaWZ5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hbXBsaWZ5JztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5pbnRlcmZhY2UgTmFpbEl0SW5mcmFzdHJ1Y3R1cmVTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICBlbnZDb25maWc6IHtcbiAgICBhbXBsaWZ5QnJhbmNoOiBzdHJpbmc7XG4gICAgZGF0YWJhc2VCcmFuY2g6IHN0cmluZztcbiAgICByZXNvdXJjZVN1ZmZpeDogc3RyaW5nO1xuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgTmFpbEl0SW5mcmFzdHJ1Y3R1cmVTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBOYWlsSXRJbmZyYXN0cnVjdHVyZVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQsIGVudkNvbmZpZyB9ID0gcHJvcHM7XG4gICAgY29uc3QgYWNjb3VudElkID0gcHJvcHMuZW52Py5hY2NvdW50IHx8IHRoaXMuYWNjb3VudDtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFMzIFNUT1JBR0VcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIEVtYWlsIFN0b3JhZ2UgQnVja2V0XG4gICAgY29uc3QgZW1haWxCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdFbWFpbFN0b3JhZ2VCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgbmFpbGl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1lbWFpbHMtJHthY2NvdW50SWR9YCxcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0RlbGV0ZU9sZFZlcnNpb25zJyxcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdUcmFuc2l0aW9uVG9JQScsXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICB0cmFuc2l0aW9uczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5JTkZSRVFVRU5UX0FDQ0VTUyxcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygzMCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBTUVMgUVVFVUVTXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvLyBFbWFpbCBQcm9jZXNzaW5nIFF1ZXVlXG4gICAgY29uc3QgZW1haWxRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0VtYWlsUHJvY2Vzc2luZ1F1ZXVlJywge1xuICAgICAgcXVldWVOYW1lOiBgbmFpbGl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1lbWFpbC1xdWV1ZWAsXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSxcbiAgICAgIGRlYWRMZXR0ZXJRdWV1ZToge1xuICAgICAgICBxdWV1ZTogbmV3IHNxcy5RdWV1ZSh0aGlzLCAnRW1haWxQcm9jZXNzaW5nRExRJywge1xuICAgICAgICAgIHF1ZXVlTmFtZTogYG5haWxpdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tZW1haWwtZGxxYCxcbiAgICAgICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSxcbiAgICAgICAgfSksXG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogMyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBSSBQcm9jZXNzaW5nIFF1ZXVlXG4gICAgY29uc3QgYWlRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0FJUHJvY2Vzc2luZ1F1ZXVlJywge1xuICAgICAgcXVldWVOYW1lOiBgbmFpbGl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1haS1xdWV1ZWAsXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTApLFxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcbiAgICAgICAgcXVldWU6IG5ldyBzcXMuUXVldWUodGhpcywgJ0FJUHJvY2Vzc2luZ0RMUScsIHtcbiAgICAgICAgICBxdWV1ZU5hbWU6IGBuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LWFpLWRscWAsXG4gICAgICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksXG4gICAgICAgIH0pLFxuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDMsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gRW5oYW5jZWQgRW1haWwgSW5nZXN0aW9uIFF1ZXVlIGZvciByZWFsLXRpbWUgcHJvY2Vzc2luZ1xuICAgIGNvbnN0IGVtYWlsSW5nZXN0aW9uUXVldWUgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdFbWFpbEluZ2VzdGlvblF1ZXVlJywge1xuICAgICAgcXVldWVOYW1lOiBgbmFpbGl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1lbWFpbC1pbmdlc3Rpb24tcXVldWVgLFxuICAgICAgdmlzaWJpbGl0eVRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDMpLFxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcbiAgICAgICAgcXVldWU6IG5ldyBzcXMuUXVldWUodGhpcywgJ0VtYWlsSW5nZXN0aW9uRExRJywge1xuICAgICAgICAgIHF1ZXVlTmFtZTogYG5haWxpdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tZW1haWwtaW5nZXN0aW9uLWRscWAsXG4gICAgICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksXG4gICAgICAgIH0pLFxuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDMsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gRW1haWwgQXNzaWdubWVudCBRdWV1ZSBmb3IgcHJvamVjdCBhc3NvY2lhdGlvblxuICAgIGNvbnN0IGVtYWlsQXNzaWdubWVudFF1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnRW1haWxBc3NpZ25tZW50UXVldWUnLCB7XG4gICAgICBxdWV1ZU5hbWU6IGBuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LWVtYWlsLWFzc2lnbm1lbnQtcXVldWVgLFxuICAgICAgdmlzaWJpbGl0eVRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcbiAgICAgICAgcXVldWU6IG5ldyBzcXMuUXVldWUodGhpcywgJ0VtYWlsQXNzaWdubWVudERMUScsIHtcbiAgICAgICAgICBxdWV1ZU5hbWU6IGBuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LWVtYWlsLWFzc2lnbm1lbnQtZGxxYCxcbiAgICAgICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSxcbiAgICAgICAgfSksXG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogMyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBFbWFpbCBGbGFnZ2luZyBRdWV1ZSBmb3IgZmxhZ2dlZCBpdGVtIGludGVncmF0aW9uXG4gICAgY29uc3QgZW1haWxGbGFnZ2luZ1F1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnRW1haWxGbGFnZ2luZ1F1ZXVlJywge1xuICAgICAgcXVldWVOYW1lOiBgbmFpbGl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1lbWFpbC1mbGFnZ2luZy1xdWV1ZWAsXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoOCksXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSxcbiAgICAgIGRlYWRMZXR0ZXJRdWV1ZToge1xuICAgICAgICBxdWV1ZTogbmV3IHNxcy5RdWV1ZSh0aGlzLCAnRW1haWxGbGFnZ2luZ0RMUScsIHtcbiAgICAgICAgICBxdWV1ZU5hbWU6IGBuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LWVtYWlsLWZsYWdnaW5nLWRscWAsXG4gICAgICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksXG4gICAgICAgIH0pLFxuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDMsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gU05TIE5PVElGSUNBVElPTlNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIE5vdGlmaWNhdGlvbiBUb3BpY1xuICAgIGNvbnN0IG5vdGlmaWNhdGlvblRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnTm90aWZpY2F0aW9uVG9waWMnLCB7XG4gICAgICB0b3BpY05hbWU6IGBuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LW5vdGlmaWNhdGlvbnNgLFxuICAgICAgZGlzcGxheU5hbWU6IGBOYWlsSXQgJHtlbnZpcm9ubWVudH0gTm90aWZpY2F0aW9uc2AsXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBBV1MgQU1QTElGWSAoUmVmZXJlbmNlIE9ubHkpXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gTm90ZTogQW1wbGlmeSBhcHAgaXMgbWFudWFsbHkgbWFuYWdlZCBidXQgZG9jdW1lbnRlZCBoZXJlXG4gICAgLy8gQXBwIElEOiBkMXJxMGs5anM1bHdnMyBcbiAgICAvLyBCcmFuY2hlczogZGV2ZWxvcCwgc3RhZ2luZywgbWFpblxuICAgIC8vIEN1c3RvbSBkb21haW5zIGNvbmZpZ3VyZWQgaW4gY29uc29sZVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gSUFNIFJPTEVTICYgUE9MSUNJRVNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIExhbWJkYSBFeGVjdXRpb24gUm9sZSAoZm9yIGZ1dHVyZSBMYW1iZGEgZnVuY3Rpb25zKVxuICAgIGNvbnN0IGxhbWJkYUV4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0xhbWJkYUV4ZWN1dGlvblJvbGUnLCB7XG4gICAgICByb2xlTmFtZTogYG5haWxpdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tbGFtYmRhLWV4ZWN1dGlvbmAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKSxcbiAgICAgIF0sXG4gICAgICBpbmxpbmVQb2xpY2llczoge1xuICAgICAgICBOYWlsSXRTZXJ2aWNlQWNjZXNzOiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxuICAgICAgICAgICAgICAgICdzMzpEZWxldGVPYmplY3QnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFtlbWFpbEJ1Y2tldC5idWNrZXRBcm4sIGAke2VtYWlsQnVja2V0LmJ1Y2tldEFybn0vKmBdLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICdzcXM6U2VuZE1lc3NhZ2UnLFxuICAgICAgICAgICAgICAgICdzcXM6UmVjZWl2ZU1lc3NhZ2UnLFxuICAgICAgICAgICAgICAgICdzcXM6RGVsZXRlTWVzc2FnZScsXG4gICAgICAgICAgICAgICAgJ3NxczpHZXRRdWV1ZUF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICBlbWFpbFF1ZXVlLnF1ZXVlQXJuLCBcbiAgICAgICAgICAgICAgICBhaVF1ZXVlLnF1ZXVlQXJuLFxuICAgICAgICAgICAgICAgIGVtYWlsSW5nZXN0aW9uUXVldWUucXVldWVBcm4sXG4gICAgICAgICAgICAgICAgZW1haWxBc3NpZ25tZW50UXVldWUucXVldWVBcm4sXG4gICAgICAgICAgICAgICAgZW1haWxGbGFnZ2luZ1F1ZXVlLnF1ZXVlQXJuXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgJ3NuczpQdWJsaXNoJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbbm90aWZpY2F0aW9uVG9waWMudG9waWNBcm5dLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAvLyBDbG91ZFdhdGNoIExvZ3MgcGVybWlzc2lvbnMgZm9yIGFwcGxpY2F0aW9uIGxvZ2dpbmdcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nR3JvdXAnLFxuICAgICAgICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXG4gICAgICAgICAgICAgICAgJ2xvZ3M6UHV0TG9nRXZlbnRzJyxcbiAgICAgICAgICAgICAgICAnbG9nczpEZXNjcmliZUxvZ0dyb3VwcycsXG4gICAgICAgICAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dTdHJlYW1zJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgICAgYGFybjphd3M6bG9nczoqOio6bG9nLWdyb3VwOi9uYWlsaXQvJHtlbnZpcm9ubWVudH0vKmAsXG4gICAgICAgICAgICAgICAgYGFybjphd3M6bG9nczoqOio6bG9nLWdyb3VwOi9uYWlsaXQvJHtlbnZpcm9ubWVudH0vKjoqYCxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0pLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIE9VVFBVVFNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFbWFpbEJ1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogZW1haWxCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgYnVja2V0IGZvciBlbWFpbCBzdG9yYWdlJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LUVtYWlsQnVja2V0YCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFbWFpbFF1ZXVlVXJsJywge1xuICAgICAgdmFsdWU6IGVtYWlsUXVldWUucXVldWVVcmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NRUyBxdWV1ZSBVUkwgZm9yIGVtYWlsIHByb2Nlc3NpbmcnLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tRW1haWxRdWV1ZWAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQUlRdWV1ZVVybCcsIHtcbiAgICAgIHZhbHVlOiBhaVF1ZXVlLnF1ZXVlVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdTUVMgcXVldWUgVVJMIGZvciBBSSBwcm9jZXNzaW5nJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LUFJUXVldWVgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VtYWlsSW5nZXN0aW9uUXVldWVVcmwnLCB7XG4gICAgICB2YWx1ZTogZW1haWxJbmdlc3Rpb25RdWV1ZS5xdWV1ZVVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU1FTIHF1ZXVlIFVSTCBmb3IgZW5oYW5jZWQgZW1haWwgaW5nZXN0aW9uJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LUVtYWlsSW5nZXN0aW9uUXVldWVgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VtYWlsQXNzaWdubWVudFF1ZXVlVXJsJywge1xuICAgICAgdmFsdWU6IGVtYWlsQXNzaWdubWVudFF1ZXVlLnF1ZXVlVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdTUVMgcXVldWUgVVJMIGZvciBlbWFpbCBwcm9qZWN0IGFzc2lnbm1lbnQnLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tRW1haWxBc3NpZ25tZW50UXVldWVgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VtYWlsRmxhZ2dpbmdRdWV1ZVVybCcsIHtcbiAgICAgIHZhbHVlOiBlbWFpbEZsYWdnaW5nUXVldWUucXVldWVVcmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NRUyBxdWV1ZSBVUkwgZm9yIGVtYWlsIGZsYWdnaW5nIGludGVncmF0aW9uJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LUVtYWlsRmxhZ2dpbmdRdWV1ZWAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTm90aWZpY2F0aW9uVG9waWNBcm4nLCB7XG4gICAgICB2YWx1ZTogbm90aWZpY2F0aW9uVG9waWMudG9waWNBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ1NOUyB0b3BpYyBBUk4gZm9yIG5vdGlmaWNhdGlvbnMnLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tTm90aWZpY2F0aW9uVG9waWNgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xhbWJkYUV4ZWN1dGlvblJvbGVBcm4nLCB7XG4gICAgICB2YWx1ZTogbGFtYmRhRXhlY3V0aW9uUm9sZS5yb2xlQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gcm9sZSBBUk4gZm9yIExhbWJkYSBleGVjdXRpb24nLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tTGFtYmRhUm9sZWAsXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBUQUdTXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ1Byb2plY3QnLCAnTmFpbEl0Jyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdFbnZpcm9ubWVudCcsIGVudmlyb25tZW50KTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ01hbmFnZWRCeScsICdDREsnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0RhdGFiYXNlUHJvdmlkZXInLCAnTmVvbicpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnSG9zdGluZ1Byb3ZpZGVyJywgJ0FtcGxpZnknKTtcbiAgfVxufSAiXX0=