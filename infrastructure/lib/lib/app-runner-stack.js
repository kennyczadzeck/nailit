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
class AppRunnerStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment, envConfig, secretArns, ecrRepositoryUri } = props;
        // Get GitHub connection ARN from context or props
        const githubConnectionArn = props.githubConnectionArn ||
            this.node.tryGetContext('githubConnectionArn');
        // Determine deployment mode: 'docker' or 'source'
        const deploymentMode = this.node.tryGetContext('deploymentMode') || 'source';
        console.log(`🚀 Deploying App Runner in ${deploymentMode} mode for ${environment}`);
        // =================================
        // IAM ROLE FOR APP RUNNER INSTANCE
        // =================================
        // Instance role for App Runner service
        const instanceRole = new iam.Role(this, 'AppRunnerInstanceRole', {
            assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
            description: 'IAM role for App Runner service instances',
        });
        // Add comprehensive CloudWatch Logs permissions
        instanceRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
            ],
            resources: ['*'],
        }));
        // =================================
        // ACCESS ROLE FOR ECR (DOCKER MODE)
        // =================================
        // Access role for ECR (required for Docker deployment)
        let accessRole;
        if (deploymentMode === 'docker' && ecrRepositoryUri) {
            accessRole = new iam.Role(this, 'AppRunnerAccessRole', {
                assumedBy: new iam.ServicePrincipal('build.apprunner.amazonaws.com'),
                description: 'Access role for App Runner to pull from ECR',
                managedPolicies: [
                    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSAppRunnerServicePolicyForECRAccess'),
                ],
            });
        }
        // Add secrets manager permissions for our individual secrets
        if (secretArns) {
            instanceRole.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'secretsmanager:GetSecretValue',
                    'kms:Decrypt',
                ],
                resources: [
                    secretArns.databaseSecretArn,
                    secretArns.nextauthSecretArn,
                    secretArns.nextauthUrlArn,
                    secretArns.googleClientIdArn,
                    secretArns.googleClientSecretArn,
                    secretArns.apiKeysSecretArn,
                ],
            }));
        }
        // =================================
        // APP RUNNER SERVICE
        // =================================
        // App Runner service configuration
        this.appRunnerService = new apprunner.CfnService(this, 'NailItAppRunnerService', {
            serviceName: `nailit-${envConfig.resourceSuffix}`,
            sourceConfiguration: this.getSourceConfiguration(deploymentMode, githubConnectionArn, ecrRepositoryUri, environment, envConfig, secretArns, accessRole),
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
        this.addOutputs(envConfig, deploymentMode);
        // =================================
        // TAGS
        // =================================
        cdk.Tags.of(this).add('Project', 'NailIt');
        cdk.Tags.of(this).add('Environment', environment);
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
        cdk.Tags.of(this).add('DatabaseProvider', 'Neon');
        cdk.Tags.of(this).add('HostingProvider', 'AppRunner');
        cdk.Tags.of(this).add('DeploymentMode', deploymentMode);
    }
    getSourceConfiguration(deploymentMode, githubConnectionArn, ecrRepositoryUri, environment, envConfig, secretArns, accessRole) {
        if (deploymentMode === 'docker' && ecrRepositoryUri && accessRole) {
            // Docker-based deployment
            return {
                imageRepository: {
                    imageIdentifier: `${ecrRepositoryUri}:latest`,
                    imageRepositoryType: 'ECR',
                    imageConfiguration: {
                        port: '3000',
                        runtimeEnvironmentVariables: this.getRuntimeEnvironmentVariables(environment),
                        runtimeEnvironmentSecrets: this.getRuntimeEnvironmentSecrets(secretArns),
                    },
                },
                authenticationConfiguration: {
                    accessRoleArn: accessRole.roleArn,
                },
                autoDeploymentsEnabled: false, // Manual deployment via GitHub Actions
            };
        }
        else {
            // Source code-based deployment (legacy)
            return githubConnectionArn ? {
                autoDeploymentsEnabled: true,
                authenticationConfiguration: {
                    connectionArn: githubConnectionArn,
                },
                codeRepository: {
                    repositoryUrl: 'https://github.com/kennyczadzeck/nailit',
                    sourceCodeVersion: {
                        type: 'BRANCH',
                        value: envConfig.amplifyBranch,
                    },
                    codeConfiguration: {
                        configurationSource: 'API',
                        codeConfigurationValues: this.getCodeConfiguration(environment, envConfig, secretArns),
                    },
                },
            } : {
                // Fallback configuration
                imageRepository: {
                    imageIdentifier: 'public.ecr.aws/aws-containers/hello-app-runner:latest',
                    imageRepositoryType: 'ECR_PUBLIC',
                },
            };
        }
    }
    getRuntimeEnvironmentVariables(environment) {
        return [
            { name: 'NODE_ENV', value: 'production' },
            { name: 'PORT', value: '3000' },
            { name: 'AWS_REGION', value: 'us-east-1' },
            { name: 'NAILIT_ENVIRONMENT', value: environment },
        ];
    }
    getRuntimeEnvironmentSecrets(secretArns) {
        if (!secretArns)
            return [];
        return [
            { name: 'DATABASE_URL', value: `${secretArns.databaseSecretArn}` },
            { name: 'NEXTAUTH_SECRET', value: `${secretArns.nextauthSecretArn}` },
            { name: 'NEXTAUTH_URL', value: `${secretArns.nextauthUrlArn}` },
            { name: 'GOOGLE_CLIENT_ID', value: `${secretArns.googleClientIdArn}` },
            { name: 'GOOGLE_CLIENT_SECRET', value: `${secretArns.googleClientSecretArn}` },
        ];
    }
    addOutputs(envConfig, deploymentMode) {
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
        new cdk.CfnOutput(this, 'DeploymentMode', {
            value: deploymentMode,
            description: 'App Runner deployment mode (source or docker)',
            exportName: `NailIt-${envConfig.resourceSuffix}-DeploymentMode`,
        });
    }
    // Legacy method for source code deployments
    getCodeConfiguration(environment, envConfig, secretArns) {
        const envVars = [
            { name: 'NODE_ENV', value: 'production' },
            { name: 'PORT', value: '3000' },
            { name: 'AWS_REGION', value: 'us-east-1' },
            { name: 'NAILIT_ENVIRONMENT', value: environment },
            // Note: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set in buildCommand, not runtime
        ];
        const secrets = [];
        // Add secrets if provided (server-side only - no client-side secrets)
        if (secretArns) {
            secrets.push({ name: 'DATABASE_URL', value: `${secretArns.databaseSecretArn}` }, { name: 'NEXTAUTH_SECRET', value: `${secretArns.nextauthSecretArn}` }, { name: 'NEXTAUTH_URL', value: `${secretArns.nextauthUrlArn}` }, { name: 'GOOGLE_CLIENT_ID', value: `${secretArns.googleClientIdArn}` }, { name: 'GOOGLE_CLIENT_SECRET', value: `${secretArns.googleClientSecretArn}` });
        }
        // Build command with NEXT_PUBLIC environment variables properly set for Next.js build-time embedding
        const buildCommand = [
            'npm ci --ignore-scripts --legacy-peer-deps',
            'npx prisma generate',
            'echo "=== DEBUG: Environment Variables During Build ==="',
            'node debug-env.js',
            'echo "=== DEBUG: About to run npm build with NEXT_PUBLIC vars ==="',
            'NEXT_PUBLIC_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ") NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyDCLRbf1Nf6NxV4PqO_92-q1wE1rCNOaw0" DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" NEXTAUTH_SECRET="dummy-secret-for-build" NEXTAUTH_URL="http://localhost:3000" NODE_ENV="production" npm run build'
        ].join(' && ');
        return {
            runtime: 'NODEJS_22',
            buildCommand,
            startCommand: 'npm start',
            runtimeEnvironmentVariables: envVars,
            runtimeEnvironmentSecrets: secrets,
        };
    }
}
exports.AppRunnerStack = AppRunnerStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXJ1bm5lci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2FwcC1ydW5uZXItc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMscUVBQXVEO0FBQ3ZELHlEQUEyQztBQXNCM0MsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFHM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEwQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFdkUsa0RBQWtEO1FBQ2xELE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLG1CQUFtQjtZQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBRTFFLGtEQUFrRDtRQUNsRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQztRQUU3RSxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixjQUFjLGFBQWEsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUVwRixvQ0FBb0M7UUFDcEMsbUNBQW1DO1FBQ25DLG9DQUFvQztRQUVwQyx1Q0FBdUM7UUFDdkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMvRCxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsK0JBQStCLENBQUM7WUFDcEUsV0FBVyxFQUFFLDJDQUEyQztTQUN6RCxDQUFDLENBQUM7UUFFSCxnREFBZ0Q7UUFDaEQsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdB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WUFBWTtZQUNaLFlBQVksRUFBRSxXQUFXO1lBQ3pCLDJCQUEyQixFQUFFLE9BQU87WUFDcEMseUJBQXlCLEVBQUUsT0FBTztTQUNuQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBalJELHdDQWlSQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBhcHBydW5uZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwcHJ1bm5lcic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuaW50ZXJmYWNlIEFwcFJ1bm5lclN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIGVudkNvbmZpZzoge1xuICAgIGFtcGxpZnlCcmFuY2g6IHN0cmluZztcbiAgICBkYXRhYmFzZUJyYW5jaDogc3RyaW5nO1xuICAgIHJlc291cmNlU3VmZml4OiBzdHJpbmc7XG4gIH07XG4gIGdpdGh1YkNvbm5lY3Rpb25Bcm4/OiBzdHJpbmc7IC8vIE9wdGlvbmFsIEdpdEh1YiBjb25uZWN0aW9uIEFSTlxuICBlY3JSZXBvc2l0b3J5VXJpPzogc3RyaW5nOyAvLyBPcHRpb25hbCBFQ1IgcmVwb3NpdG9yeSBVUkkgZm9yIERvY2tlci1iYXNlZCBkZXBsb3ltZW50XG4gIHNlY3JldEFybnM/OiB7XG4gICAgZGF0YWJhc2VTZWNyZXRBcm46IHN0cmluZztcbiAgICBuZXh0YXV0aFNlY3JldEFybjogc3RyaW5nO1xuICAgIG5leHRhdXRoVXJsQXJuOiBzdHJpbmc7XG4gICAgZ29vZ2xlQ2xpZW50SWRBcm46IHN0cmluZztcbiAgICBnb29nbGVDbGllbnRTZWNyZXRBcm46IHN0cmluZztcbiAgICBhcGlLZXlzU2VjcmV0QXJuOiBzdHJpbmc7XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBBcHBSdW5uZXJTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBhcHBSdW5uZXJTZXJ2aWNlOiBhcHBydW5uZXIuQ2ZuU2VydmljZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXBwUnVubmVyU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgeyBlbnZpcm9ubWVudCwgZW52Q29uZmlnLCBzZWNyZXRBcm5zLCBlY3JSZXBvc2l0b3J5VXJpIH0gPSBwcm9wcztcblxuICAgIC8vIEdldCBHaXRIdWIgY29ubmVjdGlvbiBBUk4gZnJvbSBjb250ZXh0IG9yIHByb3BzXG4gICAgY29uc3QgZ2l0aHViQ29ubmVjdGlvbkFybiA9IHByb3BzLmdpdGh1YkNvbm5lY3Rpb25Bcm4gfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ub2RlLnRyeUdldENvbnRleHQoJ2dpdGh1YkNvbm5lY3Rpb25Bcm4nKTtcblxuICAgIC8vIERldGVybWluZSBkZXBsb3ltZW50IG1vZGU6ICdkb2NrZXInIG9yICdzb3VyY2UnXG4gICAgY29uc3QgZGVwbG95bWVudE1vZGUgPSB0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgnZGVwbG95bWVudE1vZGUnKSB8fCAnc291cmNlJztcbiAgICBcbiAgICBjb25zb2xlLmxvZyhg8J+agCBEZXBsb3lpbmcgQXBwIFJ1bm5lciBpbiAke2RlcGxveW1lbnRNb2RlfSBtb2RlIGZvciAke2Vudmlyb25tZW50fWApO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gSUFNIFJPTEUgRk9SIEFQUCBSVU5ORVIgSU5TVEFOQ0VcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIEluc3RhbmNlIHJvbGUgZm9yIEFwcCBSdW5uZXIgc2VydmljZVxuICAgIGNvbnN0IGluc3RhbmNlUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnQXBwUnVubmVySW5zdGFuY2VSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ3Rhc2tzLmFwcHJ1bm5lci5hbWF6b25hd3MuY29tJyksXG4gICAgICBkZXNjcmlwdGlvbjogJ0lBTSByb2xlIGZvciBBcHAgUnVubmVyIHNlcnZpY2UgaW5zdGFuY2VzJyxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBjb21wcmVoZW5zaXZlIENsb3VkV2F0Y2ggTG9ncyBwZXJtaXNzaW9uc1xuICAgIGluc3RhbmNlUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcbiAgICAgICAgJ2xvZ3M6UHV0TG9nRXZlbnRzJyxcbiAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dHcm91cHMnLFxuICAgICAgICAnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgfSkpO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQUNDRVNTIFJPTEUgRk9SIEVDUiAoRE9DS0VSIE1PREUpXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvLyBBY2Nlc3Mgcm9sZSBmb3IgRUNSIChyZXF1aXJlZCBmb3IgRG9ja2VyIGRlcGxveW1lbnQpXG4gICAgbGV0IGFjY2Vzc1JvbGU6IGlhbS5Sb2xlIHwgdW5kZWZpbmVkO1xuICAgIGlmIChkZXBsb3ltZW50TW9kZSA9PT0gJ2RvY2tlcicgJiYgZWNyUmVwb3NpdG9yeVVyaSkge1xuICAgICAgYWNjZXNzUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnQXBwUnVubmVyQWNjZXNzUm9sZScsIHtcbiAgICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2J1aWxkLmFwcHJ1bm5lci5hbWF6b25hd3MuY29tJyksXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQWNjZXNzIHJvbGUgZm9yIEFwcCBSdW5uZXIgdG8gcHVsbCBmcm9tIEVDUicsXG4gICAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0FwcFJ1bm5lclNlcnZpY2VQb2xpY3lGb3JFQ1JBY2Nlc3MnKSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCBzZWNyZXRzIG1hbmFnZXIgcGVybWlzc2lvbnMgZm9yIG91ciBpbmRpdmlkdWFsIHNlY3JldHNcbiAgICBpZiAoc2VjcmV0QXJucykge1xuICAgICAgaW5zdGFuY2VSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkdldFNlY3JldFZhbHVlJyxcbiAgICAgICAgICAna21zOkRlY3J5cHQnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBzZWNyZXRBcm5zLmRhdGFiYXNlU2VjcmV0QXJuLFxuICAgICAgICAgIHNlY3JldEFybnMubmV4dGF1dGhTZWNyZXRBcm4sXG4gICAgICAgICAgc2VjcmV0QXJucy5uZXh0YXV0aFVybEFybixcbiAgICAgICAgICBzZWNyZXRBcm5zLmdvb2dsZUNsaWVudElkQXJuLFxuICAgICAgICAgIHNlY3JldEFybnMuZ29vZ2xlQ2xpZW50U2VjcmV0QXJuLFxuICAgICAgICAgIHNlY3JldEFybnMuYXBpS2V5c1NlY3JldEFybixcbiAgICAgICAgXSxcbiAgICAgIH0pKTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBBUFAgUlVOTkVSIFNFUlZJQ0VcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIEFwcCBSdW5uZXIgc2VydmljZSBjb25maWd1cmF0aW9uXG4gICAgdGhpcy5hcHBSdW5uZXJTZXJ2aWNlID0gbmV3IGFwcHJ1bm5lci5DZm5TZXJ2aWNlKHRoaXMsICdOYWlsSXRBcHBSdW5uZXJTZXJ2aWNlJywge1xuICAgICAgc2VydmljZU5hbWU6IGBuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9YCxcbiAgICAgIHNvdXJjZUNvbmZpZ3VyYXRpb246IHRoaXMuZ2V0U291cmNlQ29uZmlndXJhdGlvbihkZXBsb3ltZW50TW9kZSwgZ2l0aHViQ29ubmVjdGlvbkFybiwgZWNyUmVwb3NpdG9yeVVyaSwgZW52aXJvbm1lbnQsIGVudkNvbmZpZywgc2VjcmV0QXJucywgYWNjZXNzUm9sZSksXG4gICAgICBpbnN0YW5jZUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgY3B1OiAnMC4yNSB2Q1BVJyxcbiAgICAgICAgbWVtb3J5OiAnMC41IEdCJyxcbiAgICAgICAgaW5zdGFuY2VSb2xlQXJuOiBpbnN0YW5jZVJvbGUucm9sZUFybixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBPVVRQVVRTXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvLyBBZGQgb3V0cHV0c1xuICAgIHRoaXMuYWRkT3V0cHV0cyhlbnZDb25maWcsIGRlcGxveW1lbnRNb2RlKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFRBR1NcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUHJvamVjdCcsICdOYWlsSXQnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnTWFuYWdlZEJ5JywgJ0NESycpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnRGF0YWJhc2VQcm92aWRlcicsICdOZW9uJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdIb3N0aW5nUHJvdmlkZXInLCAnQXBwUnVubmVyJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdEZXBsb3ltZW50TW9kZScsIGRlcGxveW1lbnRNb2RlKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U291cmNlQ29uZmlndXJhdGlvbihcbiAgICBkZXBsb3ltZW50TW9kZTogc3RyaW5nLFxuICAgIGdpdGh1YkNvbm5lY3Rpb25Bcm46IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBlY3JSZXBvc2l0b3J5VXJpOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgZW52aXJvbm1lbnQ6IHN0cmluZyxcbiAgICBlbnZDb25maWc6IHsgYW1wbGlmeUJyYW5jaDogc3RyaW5nOyByZXNvdXJjZVN1ZmZpeDogc3RyaW5nIH0sXG4gICAgc2VjcmV0QXJucz86IHtcbiAgICAgIGRhdGFiYXNlU2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgICBuZXh0YXV0aFNlY3JldEFybjogc3RyaW5nO1xuICAgICAgbmV4dGF1dGhVcmxBcm46IHN0cmluZztcbiAgICAgIGdvb2dsZUNsaWVudElkQXJuOiBzdHJpbmc7XG4gICAgICBnb29nbGVDbGllbnRTZWNyZXRBcm46IHN0cmluZztcbiAgICAgIGFwaUtleXNTZWNyZXRBcm46IHN0cmluZztcbiAgICB9LFxuICAgIGFjY2Vzc1JvbGU/OiBpYW0uUm9sZVxuICApOiBhcHBydW5uZXIuQ2ZuU2VydmljZS5Tb3VyY2VDb25maWd1cmF0aW9uUHJvcGVydHkge1xuICAgIFxuICAgIGlmIChkZXBsb3ltZW50TW9kZSA9PT0gJ2RvY2tlcicgJiYgZWNyUmVwb3NpdG9yeVVyaSAmJiBhY2Nlc3NSb2xlKSB7XG4gICAgICAvLyBEb2NrZXItYmFzZWQgZGVwbG95bWVudFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaW1hZ2VSZXBvc2l0b3J5OiB7XG4gICAgICAgICAgaW1hZ2VJZGVudGlmaWVyOiBgJHtlY3JSZXBvc2l0b3J5VXJpfTpsYXRlc3RgLFxuICAgICAgICAgIGltYWdlUmVwb3NpdG9yeVR5cGU6ICdFQ1InLFxuICAgICAgICAgIGltYWdlQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgcG9ydDogJzMwMDAnLFxuICAgICAgICAgICAgcnVudGltZUVudmlyb25tZW50VmFyaWFibGVzOiB0aGlzLmdldFJ1bnRpbWVFbnZpcm9ubWVudFZhcmlhYmxlcyhlbnZpcm9ubWVudCksXG4gICAgICAgICAgICBydW50aW1lRW52aXJvbm1lbnRTZWNyZXRzOiB0aGlzLmdldFJ1bnRpbWVFbnZpcm9ubWVudFNlY3JldHMoc2VjcmV0QXJucyksXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgYXV0aGVudGljYXRpb25Db25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgYWNjZXNzUm9sZUFybjogYWNjZXNzUm9sZS5yb2xlQXJuLFxuICAgICAgICB9LFxuICAgICAgICBhdXRvRGVwbG95bWVudHNFbmFibGVkOiBmYWxzZSwgLy8gTWFudWFsIGRlcGxveW1lbnQgdmlhIEdpdEh1YiBBY3Rpb25zXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTb3VyY2UgY29kZS1iYXNlZCBkZXBsb3ltZW50IChsZWdhY3kpXG4gICAgICByZXR1cm4gZ2l0aHViQ29ubmVjdGlvbkFybiA/IHtcbiAgICAgICAgYXV0b0RlcGxveW1lbnRzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgYXV0aGVudGljYXRpb25Db25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgY29ubmVjdGlvbkFybjogZ2l0aHViQ29ubmVjdGlvbkFybixcbiAgICAgICAgfSxcbiAgICAgICAgY29kZVJlcG9zaXRvcnk6IHtcbiAgICAgICAgICByZXBvc2l0b3J5VXJsOiAnaHR0cHM6Ly9naXRodWIuY29tL2tlbm55Y3phZHplY2svbmFpbGl0JyxcbiAgICAgICAgICBzb3VyY2VDb2RlVmVyc2lvbjoge1xuICAgICAgICAgICAgdHlwZTogJ0JSQU5DSCcsXG4gICAgICAgICAgICB2YWx1ZTogZW52Q29uZmlnLmFtcGxpZnlCcmFuY2gsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb2RlQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgY29uZmlndXJhdGlvblNvdXJjZTogJ0FQSScsXG4gICAgICAgICAgICBjb2RlQ29uZmlndXJhdGlvblZhbHVlczogdGhpcy5nZXRDb2RlQ29uZmlndXJhdGlvbihlbnZpcm9ubWVudCwgZW52Q29uZmlnLCBzZWNyZXRBcm5zKSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSA6IHtcbiAgICAgICAgLy8gRmFsbGJhY2sgY29uZmlndXJhdGlvblxuICAgICAgICBpbWFnZVJlcG9zaXRvcnk6IHtcbiAgICAgICAgICBpbWFnZUlkZW50aWZpZXI6ICdwdWJsaWMuZWNyLmF3cy9hd3MtY29udGFpbmVycy9oZWxsby1hcHAtcnVubmVyOmxhdGVzdCcsXG4gICAgICAgICAgaW1hZ2VSZXBvc2l0b3J5VHlwZTogJ0VDUl9QVUJMSUMnLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFJ1bnRpbWVFbnZpcm9ubWVudFZhcmlhYmxlcyhlbnZpcm9ubWVudDogc3RyaW5nKTogYXBwcnVubmVyLkNmblNlcnZpY2UuS2V5VmFsdWVQYWlyUHJvcGVydHlbXSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHsgbmFtZTogJ05PREVfRU5WJywgdmFsdWU6ICdwcm9kdWN0aW9uJyB9LFxuICAgICAgeyBuYW1lOiAnUE9SVCcsIHZhbHVlOiAnMzAwMCcgfSxcbiAgICAgIHsgbmFtZTogJ0FXU19SRUdJT04nLCB2YWx1ZTogJ3VzLWVhc3QtMScgfSxcbiAgICAgIHsgbmFtZTogJ05BSUxJVF9FTlZJUk9OTUVOVCcsIHZhbHVlOiBlbnZpcm9ubWVudCB9LFxuICAgIF07XG4gIH1cblxuICBwcml2YXRlIGdldFJ1bnRpbWVFbnZpcm9ubWVudFNlY3JldHMoc2VjcmV0QXJucz86IHtcbiAgICBkYXRhYmFzZVNlY3JldEFybjogc3RyaW5nO1xuICAgIG5leHRhdXRoU2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgbmV4dGF1dGhVcmxBcm46IHN0cmluZztcbiAgICBnb29nbGVDbGllbnRJZEFybjogc3RyaW5nO1xuICAgIGdvb2dsZUNsaWVudFNlY3JldEFybjogc3RyaW5nO1xuICAgIGFwaUtleXNTZWNyZXRBcm46IHN0cmluZztcbiAgfSk6IGFwcHJ1bm5lci5DZm5TZXJ2aWNlLktleVZhbHVlUGFpclByb3BlcnR5W10ge1xuICAgIGlmICghc2VjcmV0QXJucykgcmV0dXJuIFtdO1xuXG4gICAgcmV0dXJuIFtcbiAgICAgIHsgbmFtZTogJ0RBVEFCQVNFX1VSTCcsIHZhbHVlOiBgJHtzZWNyZXRBcm5zLmRhdGFiYXNlU2VjcmV0QXJufWAgfSxcbiAgICAgIHsgbmFtZTogJ05FWFRBVVRIX1NFQ1JFVCcsIHZhbHVlOiBgJHtzZWNyZXRBcm5zLm5leHRhdXRoU2VjcmV0QXJufWAgfSxcbiAgICAgIHsgbmFtZTogJ05FWFRBVVRIX1VSTCcsIHZhbHVlOiBgJHtzZWNyZXRBcm5zLm5leHRhdXRoVXJsQXJufWAgfSxcbiAgICAgIHsgbmFtZTogJ0dPT0dMRV9DTElFTlRfSUQnLCB2YWx1ZTogYCR7c2VjcmV0QXJucy5nb29nbGVDbGllbnRJZEFybn1gIH0sXG4gICAgICB7IG5hbWU6ICdHT09HTEVfQ0xJRU5UX1NFQ1JFVCcsIHZhbHVlOiBgJHtzZWNyZXRBcm5zLmdvb2dsZUNsaWVudFNlY3JldEFybn1gIH0sXG4gICAgXTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkT3V0cHV0cyhlbnZDb25maWc6IHsgcmVzb3VyY2VTdWZmaXg6IHN0cmluZyB9LCBkZXBsb3ltZW50TW9kZTogc3RyaW5nKSB7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwcFJ1bm5lclNlcnZpY2VVcmwnLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHt0aGlzLmFwcFJ1bm5lclNlcnZpY2UuYXR0clNlcnZpY2VVcmx9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwIFJ1bm5lciBzZXJ2aWNlIFVSTCcsXG4gICAgICBleHBvcnROYW1lOiBgTmFpbEl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1BcHBSdW5uZXJVcmxgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwcFJ1bm5lclNlcnZpY2VBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hcHBSdW5uZXJTZXJ2aWNlLmF0dHJTZXJ2aWNlQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdBcHAgUnVubmVyIHNlcnZpY2UgQVJOJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LUFwcFJ1bm5lckFybmAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBwUnVubmVyU2VydmljZUlkJywge1xuICAgICAgdmFsdWU6IHRoaXMuYXBwUnVubmVyU2VydmljZS5hdHRyU2VydmljZUlkLFxuICAgICAgZGVzY3JpcHRpb246ICdBcHAgUnVubmVyIHNlcnZpY2UgSUQnLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tQXBwUnVubmVyU2VydmljZUlkYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEZXBsb3ltZW50TW9kZScsIHtcbiAgICAgIHZhbHVlOiBkZXBsb3ltZW50TW9kZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwIFJ1bm5lciBkZXBsb3ltZW50IG1vZGUgKHNvdXJjZSBvciBkb2NrZXIpJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LURlcGxveW1lbnRNb2RlYCxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIExlZ2FjeSBtZXRob2QgZm9yIHNvdXJjZSBjb2RlIGRlcGxveW1lbnRzXG4gIHByaXZhdGUgZ2V0Q29kZUNvbmZpZ3VyYXRpb24oZW52aXJvbm1lbnQ6IHN0cmluZywgZW52Q29uZmlnOiB7IHJlc291cmNlU3VmZml4OiBzdHJpbmcgfSwgc2VjcmV0QXJucz86IHtcbiAgICBkYXRhYmFzZVNlY3JldEFybjogc3RyaW5nO1xuICAgIG5leHRhdXRoU2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgbmV4dGF1dGhVcmxBcm46IHN0cmluZztcbiAgICBnb29nbGVDbGllbnRJZEFybjogc3RyaW5nO1xuICAgIGdvb2dsZUNsaWVudFNlY3JldEFybjogc3RyaW5nO1xuICAgIGFwaUtleXNTZWNyZXRBcm46IHN0cmluZztcbiAgfSk6IGFwcHJ1bm5lci5DZm5TZXJ2aWNlLkNvZGVDb25maWd1cmF0aW9uVmFsdWVzUHJvcGVydHkge1xuICAgIGNvbnN0IGVudlZhcnMgPSBbXG4gICAgICB7IG5hbWU6ICdOT0RFX0VOVicsIHZhbHVlOiAncHJvZHVjdGlvbicgfSxcbiAgICAgIHsgbmFtZTogJ1BPUlQnLCB2YWx1ZTogJzMwMDAnIH0sXG4gICAgICB7IG5hbWU6ICdBV1NfUkVHSU9OJywgdmFsdWU6ICd1cy1lYXN0LTEnIH0sXG4gICAgICB7IG5hbWU6ICdOQUlMSVRfRU5WSVJPTk1FTlQnLCB2YWx1ZTogZW52aXJvbm1lbnQgfSxcbiAgICAgIC8vIE5vdGU6IE5FWFRfUFVCTElDX0dPT0dMRV9NQVBTX0FQSV9LRVkgaXMgc2V0IGluIGJ1aWxkQ29tbWFuZCwgbm90IHJ1bnRpbWVcbiAgICBdO1xuXG4gICAgY29uc3Qgc2VjcmV0czogYXBwcnVubmVyLkNmblNlcnZpY2UuS2V5VmFsdWVQYWlyUHJvcGVydHlbXSA9IFtdO1xuXG4gICAgLy8gQWRkIHNlY3JldHMgaWYgcHJvdmlkZWQgKHNlcnZlci1zaWRlIG9ubHkgLSBubyBjbGllbnQtc2lkZSBzZWNyZXRzKVxuICAgIGlmIChzZWNyZXRBcm5zKSB7XG4gICAgICBzZWNyZXRzLnB1c2goXG4gICAgICAgIHsgbmFtZTogJ0RBVEFCQVNFX1VSTCcsIHZhbHVlOiBgJHtzZWNyZXRBcm5zLmRhdGFiYXNlU2VjcmV0QXJufWAgfSxcbiAgICAgICAgeyBuYW1lOiAnTkVYVEFVVEhfU0VDUkVUJywgdmFsdWU6IGAke3NlY3JldEFybnMubmV4dGF1dGhTZWNyZXRBcm59YCB9LFxuICAgICAgICB7IG5hbWU6ICdORVhUQVVUSF9VUkwnLCB2YWx1ZTogYCR7c2VjcmV0QXJucy5uZXh0YXV0aFVybEFybn1gIH0sXG4gICAgICAgIHsgbmFtZTogJ0dPT0dMRV9DTElFTlRfSUQnLCB2YWx1ZTogYCR7c2VjcmV0QXJucy5nb29nbGVDbGllbnRJZEFybn1gIH0sXG4gICAgICAgIHsgbmFtZTogJ0dPT0dMRV9DTElFTlRfU0VDUkVUJywgdmFsdWU6IGAke3NlY3JldEFybnMuZ29vZ2xlQ2xpZW50U2VjcmV0QXJufWAgfSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gQnVpbGQgY29tbWFuZCB3aXRoIE5FWFRfUFVCTElDIGVudmlyb25tZW50IHZhcmlhYmxlcyBwcm9wZXJseSBzZXQgZm9yIE5leHQuanMgYnVpbGQtdGltZSBlbWJlZGRpbmdcbiAgICBjb25zdCBidWlsZENvbW1hbmQgPSBbXG4gICAgICAnbnBtIGNpIC0taWdub3JlLXNjcmlwdHMgLS1sZWdhY3ktcGVlci1kZXBzJyxcbiAgICAgICducHggcHJpc21hIGdlbmVyYXRlJyxcbiAgICAgICdlY2hvIFwiPT09IERFQlVHOiBFbnZpcm9ubWVudCBWYXJpYWJsZXMgRHVyaW5nIEJ1aWxkID09PVwiJyxcbiAgICAgICdub2RlIGRlYnVnLWVudi5qcycsXG4gICAgICAnZWNobyBcIj09PSBERUJVRzogQWJvdXQgdG8gcnVuIG5wbSBidWlsZCB3aXRoIE5FWFRfUFVCTElDIHZhcnMgPT09XCInLFxuICAgICAgJ05FWFRfUFVCTElDX0JVSUxEX1RJTUU9JChkYXRlIC11ICtcIiVZLSVtLSVkVCVIOiVNOiVTLiUzTlpcIikgTkVYVF9QVUJMSUNfR09PR0xFX01BUFNfQVBJX0tFWT1cIkFJemFTeURDTFJiZjFOZjZOeFY0UHFPXzkyLXExd0UxckNOT2F3MFwiIERBVEFCQVNFX1VSTD1cInBvc3RncmVzcWw6Ly9kdW1teTpkdW1teUBsb2NhbGhvc3Q6NTQzMi9kdW1teVwiIE5FWFRBVVRIX1NFQ1JFVD1cImR1bW15LXNlY3JldC1mb3ItYnVpbGRcIiBORVhUQVVUSF9VUkw9XCJodHRwOi8vbG9jYWxob3N0OjMwMDBcIiBOT0RFX0VOVj1cInByb2R1Y3Rpb25cIiBucG0gcnVuIGJ1aWxkJ1xuICAgIF0uam9pbignICYmICcpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJ1bnRpbWU6ICdOT0RFSlNfMjInLFxuICAgICAgYnVpbGRDb21tYW5kLFxuICAgICAgc3RhcnRDb21tYW5kOiAnbnBtIHN0YXJ0JyxcbiAgICAgIHJ1bnRpbWVFbnZpcm9ubWVudFZhcmlhYmxlczogZW52VmFycyxcbiAgICAgIHJ1bnRpbWVFbnZpcm9ubWVudFNlY3JldHM6IHNlY3JldHMsXG4gICAgfTtcbiAgfVxufSAiXX0=