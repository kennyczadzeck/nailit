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
        // Add ECR permissions for Docker deployment mode
        if (deploymentMode === 'docker' && ecrRepositoryUri) {
            instanceRole.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ecr:GetAuthorizationToken',
                    'ecr:BatchCheckLayerAvailability',
                    'ecr:GetDownloadUrlForLayer',
                    'ecr:BatchGetImage',
                ],
                resources: ['*'],
            }));
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
            sourceConfiguration: this.getSourceConfiguration(deploymentMode, githubConnectionArn, ecrRepositoryUri, environment, envConfig, secretArns),
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
    getSourceConfiguration(deploymentMode, githubConnectionArn, ecrRepositoryUri, environment, envConfig, secretArns) {
        if (deploymentMode === 'docker' && ecrRepositoryUri) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXJ1bm5lci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2FwcC1ydW5uZXItc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMscUVBQXVEO0FBQ3ZELHlEQUEyQztBQXNCM0MsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFHM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEwQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFdkUsa0RBQWtEO1FBQ2xELE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLG1CQUFtQjtZQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBRTFFLGtEQUFrRDtRQUNsRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQztRQUU3RSxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixjQUFjLGFBQWEsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUVwRixvQ0FBb0M7UUFDcEMsbUNBQW1DO1FBQ25DLG9DQUFvQztRQUVwQyx1Q0FBdUM7UUFDdkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMvRCxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsK0JBQStCLENBQUM7WUFDcEUsV0FBVyxFQUFFLDJDQUEyQztTQUN6RCxDQUFDLENBQUM7UUFFSCxnREFBZ0Q7UUFDaEQsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdB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ay1saWInO1xuaW1wb3J0ICogYXMgYXBwcnVubmVyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcHBydW5uZXInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmludGVyZmFjZSBBcHBSdW5uZXJTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICBlbnZDb25maWc6IHtcbiAgICBhbXBsaWZ5QnJhbmNoOiBzdHJpbmc7XG4gICAgZGF0YWJhc2VCcmFuY2g6IHN0cmluZztcbiAgICByZXNvdXJjZVN1ZmZpeDogc3RyaW5nO1xuICB9O1xuICBnaXRodWJDb25uZWN0aW9uQXJuPzogc3RyaW5nOyAvLyBPcHRpb25hbCBHaXRIdWIgY29ubmVjdGlvbiBBUk5cbiAgZWNyUmVwb3NpdG9yeVVyaT86IHN0cmluZzsgLy8gT3B0aW9uYWwgRUNSIHJlcG9zaXRvcnkgVVJJIGZvciBEb2NrZXItYmFzZWQgZGVwbG95bWVudFxuICBzZWNyZXRBcm5zPzoge1xuICAgIGRhdGFiYXNlU2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgbmV4dGF1dGhTZWNyZXRBcm46IHN0cmluZztcbiAgICBuZXh0YXV0aFVybEFybjogc3RyaW5nO1xuICAgIGdvb2dsZUNsaWVudElkQXJuOiBzdHJpbmc7XG4gICAgZ29vZ2xlQ2xpZW50U2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgYXBpS2V5c1NlY3JldEFybjogc3RyaW5nO1xuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgQXBwUnVubmVyU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgYXBwUnVubmVyU2VydmljZTogYXBwcnVubmVyLkNmblNlcnZpY2U7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwcFJ1bm5lclN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQsIGVudkNvbmZpZywgc2VjcmV0QXJucywgZWNyUmVwb3NpdG9yeVVyaSB9ID0gcHJvcHM7XG5cbiAgICAvLyBHZXQgR2l0SHViIGNvbm5lY3Rpb24gQVJOIGZyb20gY29udGV4dCBvciBwcm9wc1xuICAgIGNvbnN0IGdpdGh1YkNvbm5lY3Rpb25Bcm4gPSBwcm9wcy5naXRodWJDb25uZWN0aW9uQXJuIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS50cnlHZXRDb250ZXh0KCdnaXRodWJDb25uZWN0aW9uQXJuJyk7XG5cbiAgICAvLyBEZXRlcm1pbmUgZGVwbG95bWVudCBtb2RlOiAnZG9ja2VyJyBvciAnc291cmNlJ1xuICAgIGNvbnN0IGRlcGxveW1lbnRNb2RlID0gdGhpcy5ub2RlLnRyeUdldENvbnRleHQoJ2RlcGxveW1lbnRNb2RlJykgfHwgJ3NvdXJjZSc7XG4gICAgXG4gICAgY29uc29sZS5sb2coYPCfmoAgRGVwbG95aW5nIEFwcCBSdW5uZXIgaW4gJHtkZXBsb3ltZW50TW9kZX0gbW9kZSBmb3IgJHtlbnZpcm9ubWVudH1gKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIElBTSBST0xFIEZPUiBBUFAgUlVOTkVSIElOU1RBTkNFXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvLyBJbnN0YW5jZSByb2xlIGZvciBBcHAgUnVubmVyIHNlcnZpY2VcbiAgICBjb25zdCBpbnN0YW5jZVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0FwcFJ1bm5lckluc3RhbmNlUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCd0YXNrcy5hcHBydW5uZXIuYW1hem9uYXdzLmNvbScpLFxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gcm9sZSBmb3IgQXBwIFJ1bm5lciBzZXJ2aWNlIGluc3RhbmNlcycsXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgY29tcHJlaGVuc2l2ZSBDbG91ZFdhdGNoIExvZ3MgcGVybWlzc2lvbnNcbiAgICBpbnN0YW5jZVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXG4gICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXG4gICAgICAgICdsb2dzOkRlc2NyaWJlTG9nR3JvdXBzJyxcbiAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dTdHJlYW1zJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pKTtcblxuICAgIC8vIEFkZCBFQ1IgcGVybWlzc2lvbnMgZm9yIERvY2tlciBkZXBsb3ltZW50IG1vZGVcbiAgICBpZiAoZGVwbG95bWVudE1vZGUgPT09ICdkb2NrZXInICYmIGVjclJlcG9zaXRvcnlVcmkpIHtcbiAgICAgIGluc3RhbmNlUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdlY3I6R2V0QXV0aG9yaXphdGlvblRva2VuJyxcbiAgICAgICAgICAnZWNyOkJhdGNoQ2hlY2tMYXllckF2YWlsYWJpbGl0eScsXG4gICAgICAgICAgJ2VjcjpHZXREb3dubG9hZFVybEZvckxheWVyJyxcbiAgICAgICAgICAnZWNyOkJhdGNoR2V0SW1hZ2UnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgfSkpO1xuICAgIH1cblxuICAgIC8vIEFkZCBzZWNyZXRzIG1hbmFnZXIgcGVybWlzc2lvbnMgZm9yIG91ciBpbmRpdmlkdWFsIHNlY3JldHNcbiAgICBpZiAoc2VjcmV0QXJucykge1xuICAgICAgaW5zdGFuY2VSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkdldFNlY3JldFZhbHVlJyxcbiAgICAgICAgICAna21zOkRlY3J5cHQnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBzZWNyZXRBcm5zLmRhdGFiYXNlU2VjcmV0QXJuLFxuICAgICAgICAgIHNlY3JldEFybnMubmV4dGF1dGhTZWNyZXRBcm4sXG4gICAgICAgICAgc2VjcmV0QXJucy5uZXh0YXV0aFVybEFybixcbiAgICAgICAgICBzZWNyZXRBcm5zLmdvb2dsZUNsaWVudElkQXJuLFxuICAgICAgICAgIHNlY3JldEFybnMuZ29vZ2xlQ2xpZW50U2VjcmV0QXJuLFxuICAgICAgICAgIHNlY3JldEFybnMuYXBpS2V5c1NlY3JldEFybixcbiAgICAgICAgXSxcbiAgICAgIH0pKTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBBUFAgUlVOTkVSIFNFUlZJQ0VcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIEFwcCBSdW5uZXIgc2VydmljZSBjb25maWd1cmF0aW9uXG4gICAgdGhpcy5hcHBSdW5uZXJTZXJ2aWNlID0gbmV3IGFwcHJ1bm5lci5DZm5TZXJ2aWNlKHRoaXMsICdOYWlsSXRBcHBSdW5uZXJTZXJ2aWNlJywge1xuICAgICAgc2VydmljZU5hbWU6IGBuYWlsaXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9YCxcbiAgICAgIHNvdXJjZUNvbmZpZ3VyYXRpb246IHRoaXMuZ2V0U291cmNlQ29uZmlndXJhdGlvbihkZXBsb3ltZW50TW9kZSwgZ2l0aHViQ29ubmVjdGlvbkFybiwgZWNyUmVwb3NpdG9yeVVyaSwgZW52aXJvbm1lbnQsIGVudkNvbmZpZywgc2VjcmV0QXJucyksXG4gICAgICBpbnN0YW5jZUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgY3B1OiAnMC4yNSB2Q1BVJyxcbiAgICAgICAgbWVtb3J5OiAnMC41IEdCJyxcbiAgICAgICAgaW5zdGFuY2VSb2xlQXJuOiBpbnN0YW5jZVJvbGUucm9sZUFybixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBPVVRQVVRTXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvLyBBZGQgb3V0cHV0c1xuICAgIHRoaXMuYWRkT3V0cHV0cyhlbnZDb25maWcsIGRlcGxveW1lbnRNb2RlKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFRBR1NcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUHJvamVjdCcsICdOYWlsSXQnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnTWFuYWdlZEJ5JywgJ0NESycpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnRGF0YWJhc2VQcm92aWRlcicsICdOZW9uJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdIb3N0aW5nUHJvdmlkZXInLCAnQXBwUnVubmVyJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdEZXBsb3ltZW50TW9kZScsIGRlcGxveW1lbnRNb2RlKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U291cmNlQ29uZmlndXJhdGlvbihcbiAgICBkZXBsb3ltZW50TW9kZTogc3RyaW5nLFxuICAgIGdpdGh1YkNvbm5lY3Rpb25Bcm46IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBlY3JSZXBvc2l0b3J5VXJpOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgZW52aXJvbm1lbnQ6IHN0cmluZyxcbiAgICBlbnZDb25maWc6IHsgYW1wbGlmeUJyYW5jaDogc3RyaW5nOyByZXNvdXJjZVN1ZmZpeDogc3RyaW5nIH0sXG4gICAgc2VjcmV0QXJucz86IHtcbiAgICAgIGRhdGFiYXNlU2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgICBuZXh0YXV0aFNlY3JldEFybjogc3RyaW5nO1xuICAgICAgbmV4dGF1dGhVcmxBcm46IHN0cmluZztcbiAgICAgIGdvb2dsZUNsaWVudElkQXJuOiBzdHJpbmc7XG4gICAgICBnb29nbGVDbGllbnRTZWNyZXRBcm46IHN0cmluZztcbiAgICAgIGFwaUtleXNTZWNyZXRBcm46IHN0cmluZztcbiAgICB9XG4gICk6IGFwcHJ1bm5lci5DZm5TZXJ2aWNlLlNvdXJjZUNvbmZpZ3VyYXRpb25Qcm9wZXJ0eSB7XG4gICAgXG4gICAgaWYgKGRlcGxveW1lbnRNb2RlID09PSAnZG9ja2VyJyAmJiBlY3JSZXBvc2l0b3J5VXJpKSB7XG4gICAgICAvLyBEb2NrZXItYmFzZWQgZGVwbG95bWVudFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaW1hZ2VSZXBvc2l0b3J5OiB7XG4gICAgICAgICAgaW1hZ2VJZGVudGlmaWVyOiBgJHtlY3JSZXBvc2l0b3J5VXJpfTpsYXRlc3RgLFxuICAgICAgICAgIGltYWdlUmVwb3NpdG9yeVR5cGU6ICdFQ1InLFxuICAgICAgICAgIGltYWdlQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgcG9ydDogJzMwMDAnLFxuICAgICAgICAgICAgcnVudGltZUVudmlyb25tZW50VmFyaWFibGVzOiB0aGlzLmdldFJ1bnRpbWVFbnZpcm9ubWVudFZhcmlhYmxlcyhlbnZpcm9ubWVudCksXG4gICAgICAgICAgICBydW50aW1lRW52aXJvbm1lbnRTZWNyZXRzOiB0aGlzLmdldFJ1bnRpbWVFbnZpcm9ubWVudFNlY3JldHMoc2VjcmV0QXJucyksXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgYXV0b0RlcGxveW1lbnRzRW5hYmxlZDogZmFsc2UsIC8vIE1hbnVhbCBkZXBsb3ltZW50IHZpYSBHaXRIdWIgQWN0aW9uc1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU291cmNlIGNvZGUtYmFzZWQgZGVwbG95bWVudCAobGVnYWN5KVxuICAgICAgcmV0dXJuIGdpdGh1YkNvbm5lY3Rpb25Bcm4gPyB7XG4gICAgICAgIGF1dG9EZXBsb3ltZW50c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIGNvbm5lY3Rpb25Bcm46IGdpdGh1YkNvbm5lY3Rpb25Bcm4sXG4gICAgICAgIH0sXG4gICAgICAgIGNvZGVSZXBvc2l0b3J5OiB7XG4gICAgICAgICAgcmVwb3NpdG9yeVVybDogJ2h0dHBzOi8vZ2l0aHViLmNvbS9rZW5ueWN6YWR6ZWNrL25haWxpdCcsXG4gICAgICAgICAgc291cmNlQ29kZVZlcnNpb246IHtcbiAgICAgICAgICAgIHR5cGU6ICdCUkFOQ0gnLFxuICAgICAgICAgICAgdmFsdWU6IGVudkNvbmZpZy5hbXBsaWZ5QnJhbmNoLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29kZUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIGNvbmZpZ3VyYXRpb25Tb3VyY2U6ICdBUEknLFxuICAgICAgICAgICAgY29kZUNvbmZpZ3VyYXRpb25WYWx1ZXM6IHRoaXMuZ2V0Q29kZUNvbmZpZ3VyYXRpb24oZW52aXJvbm1lbnQsIGVudkNvbmZpZywgc2VjcmV0QXJucyksXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0gOiB7XG4gICAgICAgIC8vIEZhbGxiYWNrIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaW1hZ2VSZXBvc2l0b3J5OiB7XG4gICAgICAgICAgaW1hZ2VJZGVudGlmaWVyOiAncHVibGljLmVjci5hd3MvYXdzLWNvbnRhaW5lcnMvaGVsbG8tYXBwLXJ1bm5lcjpsYXRlc3QnLFxuICAgICAgICAgIGltYWdlUmVwb3NpdG9yeVR5cGU6ICdFQ1JfUFVCTElDJyxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRSdW50aW1lRW52aXJvbm1lbnRWYXJpYWJsZXMoZW52aXJvbm1lbnQ6IHN0cmluZyk6IGFwcHJ1bm5lci5DZm5TZXJ2aWNlLktleVZhbHVlUGFpclByb3BlcnR5W10ge1xuICAgIHJldHVybiBbXG4gICAgICB7IG5hbWU6ICdOT0RFX0VOVicsIHZhbHVlOiAncHJvZHVjdGlvbicgfSxcbiAgICAgIHsgbmFtZTogJ1BPUlQnLCB2YWx1ZTogJzMwMDAnIH0sXG4gICAgICB7IG5hbWU6ICdBV1NfUkVHSU9OJywgdmFsdWU6ICd1cy1lYXN0LTEnIH0sXG4gICAgICB7IG5hbWU6ICdOQUlMSVRfRU5WSVJPTk1FTlQnLCB2YWx1ZTogZW52aXJvbm1lbnQgfSxcbiAgICBdO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSdW50aW1lRW52aXJvbm1lbnRTZWNyZXRzKHNlY3JldEFybnM/OiB7XG4gICAgZGF0YWJhc2VTZWNyZXRBcm46IHN0cmluZztcbiAgICBuZXh0YXV0aFNlY3JldEFybjogc3RyaW5nO1xuICAgIG5leHRhdXRoVXJsQXJuOiBzdHJpbmc7XG4gICAgZ29vZ2xlQ2xpZW50SWRBcm46IHN0cmluZztcbiAgICBnb29nbGVDbGllbnRTZWNyZXRBcm46IHN0cmluZztcbiAgICBhcGlLZXlzU2VjcmV0QXJuOiBzdHJpbmc7XG4gIH0pOiBhcHBydW5uZXIuQ2ZuU2VydmljZS5LZXlWYWx1ZVBhaXJQcm9wZXJ0eVtdIHtcbiAgICBpZiAoIXNlY3JldEFybnMpIHJldHVybiBbXTtcblxuICAgIHJldHVybiBbXG4gICAgICB7IG5hbWU6ICdEQVRBQkFTRV9VUkwnLCB2YWx1ZTogYCR7c2VjcmV0QXJucy5kYXRhYmFzZVNlY3JldEFybn1gIH0sXG4gICAgICB7IG5hbWU6ICdORVhUQVVUSF9TRUNSRVQnLCB2YWx1ZTogYCR7c2VjcmV0QXJucy5uZXh0YXV0aFNlY3JldEFybn1gIH0sXG4gICAgICB7IG5hbWU6ICdORVhUQVVUSF9VUkwnLCB2YWx1ZTogYCR7c2VjcmV0QXJucy5uZXh0YXV0aFVybEFybn1gIH0sXG4gICAgICB7IG5hbWU6ICdHT09HTEVfQ0xJRU5UX0lEJywgdmFsdWU6IGAke3NlY3JldEFybnMuZ29vZ2xlQ2xpZW50SWRBcm59YCB9LFxuICAgICAgeyBuYW1lOiAnR09PR0xFX0NMSUVOVF9TRUNSRVQnLCB2YWx1ZTogYCR7c2VjcmV0QXJucy5nb29nbGVDbGllbnRTZWNyZXRBcm59YCB9LFxuICAgIF07XG4gIH1cblxuICBwcml2YXRlIGFkZE91dHB1dHMoZW52Q29uZmlnOiB7IHJlc291cmNlU3VmZml4OiBzdHJpbmcgfSwgZGVwbG95bWVudE1vZGU6IHN0cmluZykge1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcHBSdW5uZXJTZXJ2aWNlVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7dGhpcy5hcHBSdW5uZXJTZXJ2aWNlLmF0dHJTZXJ2aWNlVXJsfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcCBSdW5uZXIgc2VydmljZSBVUkwnLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tQXBwUnVubmVyVXJsYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcHBSdW5uZXJTZXJ2aWNlQXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMuYXBwUnVubmVyU2VydmljZS5hdHRyU2VydmljZUFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwIFJ1bm5lciBzZXJ2aWNlIEFSTicsXG4gICAgICBleHBvcnROYW1lOiBgTmFpbEl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1BcHBSdW5uZXJBcm5gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwcFJ1bm5lclNlcnZpY2VJZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFwcFJ1bm5lclNlcnZpY2UuYXR0clNlcnZpY2VJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwIFJ1bm5lciBzZXJ2aWNlIElEJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LUFwcFJ1bm5lclNlcnZpY2VJZGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGVwbG95bWVudE1vZGUnLCB7XG4gICAgICB2YWx1ZTogZGVwbG95bWVudE1vZGUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcCBSdW5uZXIgZGVwbG95bWVudCBtb2RlIChzb3VyY2Ugb3IgZG9ja2VyKScsXG4gICAgICBleHBvcnROYW1lOiBgTmFpbEl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1EZXBsb3ltZW50TW9kZWAsXG4gICAgfSk7XG4gIH1cblxuICAvLyBMZWdhY3kgbWV0aG9kIGZvciBzb3VyY2UgY29kZSBkZXBsb3ltZW50c1xuICBwcml2YXRlIGdldENvZGVDb25maWd1cmF0aW9uKGVudmlyb25tZW50OiBzdHJpbmcsIGVudkNvbmZpZzogeyByZXNvdXJjZVN1ZmZpeDogc3RyaW5nIH0sIHNlY3JldEFybnM/OiB7XG4gICAgZGF0YWJhc2VTZWNyZXRBcm46IHN0cmluZztcbiAgICBuZXh0YXV0aFNlY3JldEFybjogc3RyaW5nO1xuICAgIG5leHRhdXRoVXJsQXJuOiBzdHJpbmc7XG4gICAgZ29vZ2xlQ2xpZW50SWRBcm46IHN0cmluZztcbiAgICBnb29nbGVDbGllbnRTZWNyZXRBcm46IHN0cmluZztcbiAgICBhcGlLZXlzU2VjcmV0QXJuOiBzdHJpbmc7XG4gIH0pOiBhcHBydW5uZXIuQ2ZuU2VydmljZS5Db2RlQ29uZmlndXJhdGlvblZhbHVlc1Byb3BlcnR5IHtcbiAgICBjb25zdCBlbnZWYXJzID0gW1xuICAgICAgeyBuYW1lOiAnTk9ERV9FTlYnLCB2YWx1ZTogJ3Byb2R1Y3Rpb24nIH0sXG4gICAgICB7IG5hbWU6ICdQT1JUJywgdmFsdWU6ICczMDAwJyB9LFxuICAgICAgeyBuYW1lOiAnQVdTX1JFR0lPTicsIHZhbHVlOiAndXMtZWFzdC0xJyB9LFxuICAgICAgeyBuYW1lOiAnTkFJTElUX0VOVklST05NRU5UJywgdmFsdWU6IGVudmlyb25tZW50IH0sXG4gICAgICAvLyBOb3RlOiBORVhUX1BVQkxJQ19HT09HTEVfTUFQU19BUElfS0VZIGlzIHNldCBpbiBidWlsZENvbW1hbmQsIG5vdCBydW50aW1lXG4gICAgXTtcblxuICAgIGNvbnN0IHNlY3JldHM6IGFwcHJ1bm5lci5DZm5TZXJ2aWNlLktleVZhbHVlUGFpclByb3BlcnR5W10gPSBbXTtcblxuICAgIC8vIEFkZCBzZWNyZXRzIGlmIHByb3ZpZGVkIChzZXJ2ZXItc2lkZSBvbmx5IC0gbm8gY2xpZW50LXNpZGUgc2VjcmV0cylcbiAgICBpZiAoc2VjcmV0QXJucykge1xuICAgICAgc2VjcmV0cy5wdXNoKFxuICAgICAgICB7IG5hbWU6ICdEQVRBQkFTRV9VUkwnLCB2YWx1ZTogYCR7c2VjcmV0QXJucy5kYXRhYmFzZVNlY3JldEFybn1gIH0sXG4gICAgICAgIHsgbmFtZTogJ05FWFRBVVRIX1NFQ1JFVCcsIHZhbHVlOiBgJHtzZWNyZXRBcm5zLm5leHRhdXRoU2VjcmV0QXJufWAgfSxcbiAgICAgICAgeyBuYW1lOiAnTkVYVEFVVEhfVVJMJywgdmFsdWU6IGAke3NlY3JldEFybnMubmV4dGF1dGhVcmxBcm59YCB9LFxuICAgICAgICB7IG5hbWU6ICdHT09HTEVfQ0xJRU5UX0lEJywgdmFsdWU6IGAke3NlY3JldEFybnMuZ29vZ2xlQ2xpZW50SWRBcm59YCB9LFxuICAgICAgICB7IG5hbWU6ICdHT09HTEVfQ0xJRU5UX1NFQ1JFVCcsIHZhbHVlOiBgJHtzZWNyZXRBcm5zLmdvb2dsZUNsaWVudFNlY3JldEFybn1gIH0sXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIGNvbW1hbmQgd2l0aCBORVhUX1BVQkxJQyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgcHJvcGVybHkgc2V0IGZvciBOZXh0LmpzIGJ1aWxkLXRpbWUgZW1iZWRkaW5nXG4gICAgY29uc3QgYnVpbGRDb21tYW5kID0gW1xuICAgICAgJ25wbSBjaSAtLWlnbm9yZS1zY3JpcHRzIC0tbGVnYWN5LXBlZXItZGVwcycsXG4gICAgICAnbnB4IHByaXNtYSBnZW5lcmF0ZScsXG4gICAgICAnZWNobyBcIj09PSBERUJVRzogRW52aXJvbm1lbnQgVmFyaWFibGVzIER1cmluZyBCdWlsZCA9PT1cIicsXG4gICAgICAnbm9kZSBkZWJ1Zy1lbnYuanMnLFxuICAgICAgJ2VjaG8gXCI9PT0gREVCVUc6IEFib3V0IHRvIHJ1biBucG0gYnVpbGQgd2l0aCBORVhUX1BVQkxJQyB2YXJzID09PVwiJyxcbiAgICAgICdORVhUX1BVQkxJQ19CVUlMRF9USU1FPSQoZGF0ZSAtdSArXCIlWS0lbS0lZFQlSDolTTolUy4lM05aXCIpIE5FWFRfUFVCTElDX0dPT0dMRV9NQVBTX0FQSV9LRVk9XCJBSXphU3lEQ0xSYmYxTmY2TnhWNFBxT185Mi1xMXdFMXJDTk9hdzBcIiBEQVRBQkFTRV9VUkw9XCJwb3N0Z3Jlc3FsOi8vZHVtbXk6ZHVtbXlAbG9jYWxob3N0OjU0MzIvZHVtbXlcIiBORVhUQVVUSF9TRUNSRVQ9XCJkdW1teS1zZWNyZXQtZm9yLWJ1aWxkXCIgTkVYVEFVVEhfVVJMPVwiaHR0cDovL2xvY2FsaG9zdDozMDAwXCIgTk9ERV9FTlY9XCJwcm9kdWN0aW9uXCIgbnBtIHJ1biBidWlsZCdcbiAgICBdLmpvaW4oJyAmJiAnKTtcblxuICAgIHJldHVybiB7XG4gICAgICBydW50aW1lOiAnTk9ERUpTXzIyJyxcbiAgICAgIGJ1aWxkQ29tbWFuZCxcbiAgICAgIHN0YXJ0Q29tbWFuZDogJ25wbSBzdGFydCcsXG4gICAgICBydW50aW1lRW52aXJvbm1lbnRWYXJpYWJsZXM6IGVudlZhcnMsXG4gICAgICBydW50aW1lRW52aXJvbm1lbnRTZWNyZXRzOiBzZWNyZXRzLFxuICAgIH07XG4gIH1cbn0gIl19