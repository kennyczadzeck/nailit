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
exports.AppRunnerStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const apprunner = __importStar(require("aws-cdk-lib/aws-apprunner"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const ecr = __importStar(require("aws-cdk-lib/aws-ecr"));
class AppRunnerStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment, envConfig } = props;
        const accountId = props.env?.account || this.account;
        const region = props.env?.region || 'us-east-1';
        // Get GitHub connection ARN from context or props
        const githubConnectionArn = props.githubConnectionArn ||
            this.node.tryGetContext('githubConnectionArn');
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
        // ECR REPOSITORY
        // =================================
        // Create ECR repository for the app
        const ecrRepository = new ecr.Repository(this, 'NailItECRRepository', {
            repositoryName: `nailit-${envConfig.resourceSuffix}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            imageTagMutability: ecr.TagMutability.MUTABLE,
        });
        // Grant access role to pull from ECR
        ecrRepository.grantPull(accessRole);
        // =================================
        // APP RUNNER SERVICE
        // =================================
        // App Runner service configuration
        this.appRunnerService = new apprunner.CfnService(this, 'NailItAppRunnerService', {
            serviceName: `nailit-${envConfig.resourceSuffix}`,
            sourceConfiguration: githubConnectionArn ? {
                // GitHub source configuration
                autoDeploymentsEnabled: true,
                authenticationConfiguration: {
                    connectionArn: githubConnectionArn,
                },
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
            } : {
                // ECR fallback configuration
                imageRepository: {
                    imageIdentifier: 'public.ecr.aws/aws-containers/hello-app-runner:latest',
                    imageRepositoryType: 'ECR_PUBLIC',
                },
            },
            instanceConfiguration: {
                cpu: '0.25 vCPU',
                memory: '0.5 GB',
                instanceRoleArn: instanceRole.roleArn,
            },
        });
        // =================================
        // OUTPUTS
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
    addOutputs(envConfig) {
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
exports.AppRunnerStack = AppRunnerStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXJ1bm5lci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2FwcC1ydW5uZXItc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMscUVBQXVEO0FBQ3ZELHlEQUEyQztBQUMzQyx5REFBMkM7QUFhM0MsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFHM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEwQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUN6QyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3JELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsTUFBTSxJQUFJLFdBQVcsQ0FBQztRQUVoRCxrREFBa0Q7UUFDbEQsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsbUJBQW1CO1lBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFMUUsb0NBQW9DO1FBQ3BDLDBCQUEwQjtRQUMxQixvQ0FBb0M7UUFFcEMsdUNBQXVDO1FBQ3ZDLE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDL0QsUUFBUSxFQUFFLFVBQVUsU0FBUyxDQUFDLGNBQWMscUJBQXFCO1lBQ2pFLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQywrQkFBK0IsQ0FBQztZQUNwRSxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQkFBMEIsQ0FBQzthQUN2RTtZ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QVUsU0FBUyxDQUFDLGNBQWMsZUFBZTtTQUM5RCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVDLEtBQUssRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYTtZQUMxQyxXQUFXLEVBQUUsdUJBQXVCO1lBQ3BDLFVBQVUsRUFBRSxVQUFVLFNBQVMsQ0FBQyxjQUFjLHFCQUFxQjtTQUNwRSxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE1TEQsd0NBNExDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGFwcHJ1bm5lciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBwcnVubmVyJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGVjciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5pbnRlcmZhY2UgQXBwUnVubmVyU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcbiAgZW52Q29uZmlnOiB7XG4gICAgYW1wbGlmeUJyYW5jaDogc3RyaW5nO1xuICAgIGRhdGFiYXNlQnJhbmNoOiBzdHJpbmc7XG4gICAgcmVzb3VyY2VTdWZmaXg6IHN0cmluZztcbiAgfTtcbiAgZ2l0aHViQ29ubmVjdGlvbkFybj86IHN0cmluZzsgLy8gT3B0aW9uYWwgR2l0SHViIGNvbm5lY3Rpb24gQVJOXG59XG5cbmV4cG9ydCBjbGFzcyBBcHBSdW5uZXJTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBhcHBSdW5uZXJTZXJ2aWNlOiBhcHBydW5uZXIuQ2ZuU2VydmljZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXBwUnVubmVyU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgeyBlbnZpcm9ubWVudCwgZW52Q29uZmlnIH0gPSBwcm9wcztcbiAgICBjb25zdCBhY2NvdW50SWQgPSBwcm9wcy5lbnY/LmFjY291bnQgfHwgdGhpcy5hY2NvdW50O1xuICAgIGNvbnN0IHJlZ2lvbiA9IHByb3BzLmVudj8ucmVnaW9uIHx8ICd1cy1lYXN0LTEnO1xuXG4gICAgLy8gR2V0IEdpdEh1YiBjb25uZWN0aW9uIEFSTiBmcm9tIGNvbnRleHQgb3IgcHJvcHNcbiAgICBjb25zdCBnaXRodWJDb25uZWN0aW9uQXJuID0gcHJvcHMuZ2l0aHViQ29ubmVjdGlvbkFybiB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgnZ2l0aHViQ29ubmVjdGlvbkFybicpO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gSUFNIFJPTEUgRk9SIEFQUCBSVU5ORVJcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIEluc3RhbmNlIFJvbGUgZm9yIEFwcCBSdW5uZXIgc2VydmljZVxuICAgIGNvbnN0IGluc3RhbmNlUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnQXBwUnVubmVySW5zdGFuY2VSb2xlJywge1xuICAgICAgcm9sZU5hbWU6IGBuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LWFwcHJ1bm5lci1pbnN0YW5jZWAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgndGFza3MuYXBwcnVubmVyLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0Nsb3VkV2F0Y2hMb2dzRnVsbEFjY2VzcycpLFxuICAgICAgXSxcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgIE5haWxJdFNlcnZpY2VBY2Nlc3M6IG5ldyBpYW0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgIC8vIFMzIGJ1Y2tldCBhY2Nlc3MgZm9yIGVtYWlsIHN0b3JhZ2VcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgJ3MzOkdldE9iamVjdCcsXG4gICAgICAgICAgICAgICAgJ3MzOlB1dE9iamVjdCcsXG4gICAgICAgICAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdCcsXG4gICAgICAgICAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICBgYXJuOmF3czpzMzo6Om5haWxpdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tZW1haWxzLSR7YWNjb3VudElkfWAsXG4gICAgICAgICAgICAgICAgYGFybjphd3M6czM6OjpuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LWVtYWlscy0ke2FjY291bnRJZH0vKmAsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIC8vIFNRUyBxdWV1ZSBhY2Nlc3NcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgJ3NxczpTZW5kTWVzc2FnZScsXG4gICAgICAgICAgICAgICAgJ3NxczpSZWNlaXZlTWVzc2FnZScsXG4gICAgICAgICAgICAgICAgJ3NxczpEZWxldGVNZXNzYWdlJyxcbiAgICAgICAgICAgICAgICAnc3FzOkdldFF1ZXVlQXR0cmlidXRlcycsXG4gICAgICAgICAgICAgICAgJ3NxczpHZXRRdWV1ZVVybCcsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgIGBhcm46YXdzOnNxczoke3JlZ2lvbn06JHthY2NvdW50SWR9Om5haWxpdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tZW1haWwtcXVldWVgLFxuICAgICAgICAgICAgICAgIGBhcm46YXdzOnNxczoke3JlZ2lvbn06JHthY2NvdW50SWR9Om5haWxpdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tYWktcXVldWVgLFxuICAgICAgICAgICAgICAgIGBhcm46YXdzOnNxczoke3JlZ2lvbn06JHthY2NvdW50SWR9Om5haWxpdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tZW1haWwtaW5nZXN0aW9uLXF1ZXVlYCxcbiAgICAgICAgICAgICAgICBgYXJuOmF3czpzcXM6JHtyZWdpb259OiR7YWNjb3VudElkfTpuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LWVtYWlsLWFzc2lnbm1lbnQtcXVldWVgLFxuICAgICAgICAgICAgICAgIGBhcm46YXdzOnNxczoke3JlZ2lvbn06JHthY2NvdW50SWR9Om5haWxpdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tZW1haWwtZmxhZ2dpbmctcXVldWVgLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAvLyBTTlMgdG9waWMgYWNjZXNzXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICdzbnM6UHVibGlzaCcsXG4gICAgICAgICAgICAgICAgJ3NuczpHZXRUb3BpY0F0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICBgYXJuOmF3czpzbnM6JHtyZWdpb259OiR7YWNjb3VudElkfTpuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LW5vdGlmaWNhdGlvbnNgLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAvLyBDbG91ZFdhdGNoIExvZ3MgYWNjZXNzIGZvciBhcHBsaWNhdGlvbiBsb2dnaW5nXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcbiAgICAgICAgICAgICAgICAnbG9nczpDcmVhdGVMb2dTdHJlYW0nLFxuICAgICAgICAgICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXG4gICAgICAgICAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dHcm91cHMnLFxuICAgICAgICAgICAgICAgICdsb2dzOkRlc2NyaWJlTG9nU3RyZWFtcycsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgIGBhcm46YXdzOmxvZ3M6JHtyZWdpb259OiR7YWNjb3VudElkfTpsb2ctZ3JvdXA6L25haWxpdC8ke2Vudmlyb25tZW50fS8qYCxcbiAgICAgICAgICAgICAgICBgYXJuOmF3czpsb2dzOiR7cmVnaW9ufToke2FjY291bnRJZH06bG9nLWdyb3VwOi9uYWlsaXQvJHtlbnZpcm9ubWVudH0vKjoqYCxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0pLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEFjY2VzcyBSb2xlIGZvciBBcHAgUnVubmVyIHRvIGFjY2VzcyBHaXRIdWIgKEVDUiB3b3VsZCBiZSBkaWZmZXJlbnQpXG4gICAgY29uc3QgYWNjZXNzUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnQXBwUnVubmVyQWNjZXNzUm9sZScsIHtcbiAgICAgIHJvbGVOYW1lOiBgbmFpbGl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1hcHBydW5uZXItYWNjZXNzYCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdidWlsZC5hcHBydW5uZXIuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0FwcFJ1bm5lclNlcnZpY2VQb2xpY3lGb3JFQ1JBY2Nlc3MnKSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBFQ1IgUkVQT1NJVE9SWVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gQ3JlYXRlIEVDUiByZXBvc2l0b3J5IGZvciB0aGUgYXBwXG4gICAgY29uc3QgZWNyUmVwb3NpdG9yeSA9IG5ldyBlY3IuUmVwb3NpdG9yeSh0aGlzLCAnTmFpbEl0RUNSUmVwb3NpdG9yeScsIHtcbiAgICAgIHJlcG9zaXRvcnlOYW1lOiBgbmFpbGl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fWAsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBGb3IgZGV2ZWxvcG1lbnQgLSBjaGFuZ2UgZm9yIHByb2R1Y3Rpb25cbiAgICAgIGltYWdlVGFnTXV0YWJpbGl0eTogZWNyLlRhZ011dGFiaWxpdHkuTVVUQUJMRSxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IGFjY2VzcyByb2xlIHRvIHB1bGwgZnJvbSBFQ1JcbiAgICBlY3JSZXBvc2l0b3J5LmdyYW50UHVsbChhY2Nlc3NSb2xlKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEFQUCBSVU5ORVIgU0VSVklDRVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gQXBwIFJ1bm5lciBzZXJ2aWNlIGNvbmZpZ3VyYXRpb25cbiAgICB0aGlzLmFwcFJ1bm5lclNlcnZpY2UgPSBuZXcgYXBwcnVubmVyLkNmblNlcnZpY2UodGhpcywgJ05haWxJdEFwcFJ1bm5lclNlcnZpY2UnLCB7XG4gICAgICBzZXJ2aWNlTmFtZTogYG5haWxpdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH1gLFxuICAgICAgc291cmNlQ29uZmlndXJhdGlvbjogZ2l0aHViQ29ubmVjdGlvbkFybiA/IHtcbiAgICAgICAgLy8gR2l0SHViIHNvdXJjZSBjb25maWd1cmF0aW9uXG4gICAgICAgIGF1dG9EZXBsb3ltZW50c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIGNvbm5lY3Rpb25Bcm46IGdpdGh1YkNvbm5lY3Rpb25Bcm4sXG4gICAgICAgIH0sXG4gICAgICAgIGNvZGVSZXBvc2l0b3J5OiB7XG4gICAgICAgICAgcmVwb3NpdG9yeVVybDogJ2h0dHBzOi8vZ2l0aHViLmNvbS9rZW5ueWN6YWR6ZWNrL25haWxpdCcsXG4gICAgICAgICAgc291cmNlQ29kZVZlcnNpb246IHtcbiAgICAgICAgICAgIHR5cGU6ICdCUkFOQ0gnLFxuICAgICAgICAgICAgdmFsdWU6IGVudkNvbmZpZy5hbXBsaWZ5QnJhbmNoLCAvLyBkZXZlbG9wLCBzdGFnaW5nLCBvciBtYWluXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb2RlQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgY29uZmlndXJhdGlvblNvdXJjZTogJ1JFUE9TSVRPUlknLCAvLyBVc2UgYXBwcnVubmVyLnlhbWwgZnJvbSByZXBvXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0gOiB7XG4gICAgICAgIC8vIEVDUiBmYWxsYmFjayBjb25maWd1cmF0aW9uXG4gICAgICAgIGltYWdlUmVwb3NpdG9yeToge1xuICAgICAgICAgIGltYWdlSWRlbnRpZmllcjogJ3B1YmxpYy5lY3IuYXdzL2F3cy1jb250YWluZXJzL2hlbGxvLWFwcC1ydW5uZXI6bGF0ZXN0JyxcbiAgICAgICAgICBpbWFnZVJlcG9zaXRvcnlUeXBlOiAnRUNSX1BVQkxJQycsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgaW5zdGFuY2VDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIGNwdTogJzAuMjUgdkNQVScsXG4gICAgICAgIG1lbW9yeTogJzAuNSBHQicsXG4gICAgICAgIGluc3RhbmNlUm9sZUFybjogaW5zdGFuY2VSb2xlLnJvbGVBcm4sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gT1VUUFVUU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gQWRkIG91dHB1dHNcbiAgICB0aGlzLmFkZE91dHB1dHMoZW52Q29uZmlnKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFRBR1NcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUHJvamVjdCcsICdOYWlsSXQnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnTWFuYWdlZEJ5JywgJ0NESycpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnRGF0YWJhc2VQcm92aWRlcicsICdOZW9uJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdIb3N0aW5nUHJvdmlkZXInLCAnQXBwUnVubmVyJyk7XG4gIH1cblxuICBwcml2YXRlIGFkZE91dHB1dHMoZW52Q29uZmlnOiB7IHJlc291cmNlU3VmZml4OiBzdHJpbmcgfSkge1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcHBSdW5uZXJTZXJ2aWNlVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7dGhpcy5hcHBSdW5uZXJTZXJ2aWNlLmF0dHJTZXJ2aWNlVXJsfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcCBSdW5uZXIgc2VydmljZSBVUkwnLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tQXBwUnVubmVyVXJsYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcHBSdW5uZXJTZXJ2aWNlQXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMuYXBwUnVubmVyU2VydmljZS5hdHRyU2VydmljZUFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwIFJ1bm5lciBzZXJ2aWNlIEFSTicsXG4gICAgICBleHBvcnROYW1lOiBgTmFpbEl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1BcHBSdW5uZXJBcm5gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwcFJ1bm5lclNlcnZpY2VJZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFwcFJ1bm5lclNlcnZpY2UuYXR0clNlcnZpY2VJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwIFJ1bm5lciBzZXJ2aWNlIElEJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LUFwcFJ1bm5lclNlcnZpY2VJZGAsXG4gICAgfSk7XG4gIH1cbn0gIl19