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
            healthCheckConfiguration: {
                protocol: 'HTTP',
                path: '/',
                interval: 20,
                timeout: 10,
                healthyThreshold: 1,
                unhealthyThreshold: 3,
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
                        runtimeEnvironmentVariables: this.getRuntimeEnvironmentVariables(),
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
    getRuntimeEnvironmentVariables() {
        return [
            { name: 'NODE_ENV', value: 'production' },
            { name: 'PORT', value: '3000' },
            { name: 'HOSTNAME', value: '0.0.0.0' },
            // Security: Disable debug endpoints in production
            { name: 'DISABLE_DEBUG_ENDPOINTS', value: 'true' },
            // Enable security headers in production
            { name: 'SECURITY_HEADERS_ENABLED', value: 'true' },
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
        // Build command with NEXT_PUBLIC environment variables from AWS Secrets Manager
        const buildCommand = [
            'npm ci --ignore-scripts --legacy-peer-deps',
            'npx prisma generate',
            'echo "=== Building application with secure environment ==="',
            // Get API key from secrets manager for build
            secretArns ? `export NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$(aws secretsmanager get-secret-value --secret-id ${secretArns.apiKeysSecretArn} --query SecretString --output text)` : '',
            'export NEXT_PUBLIC_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")',
            'export DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"',
            'export NEXTAUTH_SECRET="dummy-secret-for-build"',
            'export NEXTAUTH_URL="http://localhost:3000"',
            'export NODE_ENV="production"',
            'npm run build'
        ].filter(cmd => cmd !== '').join(' && ');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXJ1bm5lci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2FwcC1ydW5uZXItc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMscUVBQXVEO0FBQ3ZELHlEQUEyQztBQXNCM0MsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFHM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEwQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFdkUsa0RBQWtEO1FBQ2xELE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLG1CQUFtQjtZQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBRTFFLGtEQUFrRDtRQUNsRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQztRQUU3RSxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixjQUFjLGFBQWEsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUVwRixvQ0FBb0M7UUFDcEMsbUNBQW1DO1FBQ25DLG9DQUFvQztRQUVwQyx1Q0FBdUM7UUFDdkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMvRCxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsK0JBQStCLENBQUM7WUFDcEUsV0FBVyxFQUFFLDJDQUEyQztTQUN6RCxDQUFDLENBQUM7UUFFSCxnREFBZ0Q7UUFDaEQsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdB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QUFxQixFQUFFLEVBQUUsQ0FDL0UsQ0FBQztTQUNIO1FBRUQsZ0ZBQWdGO1FBQ2hGLE1BQU0sWUFBWSxHQUFHO1lBQ25CLDRDQUE0QztZQUM1QyxxQkFBcUI7WUFDckIsNkRBQTZEO1lBQzdELDZDQUE2QztZQUM3QyxVQUFVLENBQUMsQ0FBQyxDQUFDLDRGQUE0RixVQUFVLENBQUMsZ0JBQWdCLHNDQUFzQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQy9LLG9FQUFvRTtZQUNwRSxxRUFBcUU7WUFDckUsaURBQWlEO1lBQ2pELDZDQUE2QztZQUM3Qyw4QkFBOEI7WUFDOUIsZUFBZTtTQUNoQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFekMsT0FBTztZQUNMLE9BQU8sRUFBRSxXQUFXO1lBQ3BCLFlBQVk7WUFDWixZQUFZLEVBQUUsV0FBVztZQUN6QiwyQkFBMkIsRUFBRSxPQUFPO1lBQ3BDLHlCQUF5QixFQUFFLE9BQU87U0FDbkMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQWpTRCx3Q0FpU0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgYXBwcnVubmVyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcHBydW5uZXInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmludGVyZmFjZSBBcHBSdW5uZXJTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICBlbnZDb25maWc6IHtcbiAgICBhbXBsaWZ5QnJhbmNoOiBzdHJpbmc7XG4gICAgZGF0YWJhc2VCcmFuY2g6IHN0cmluZztcbiAgICByZXNvdXJjZVN1ZmZpeDogc3RyaW5nO1xuICB9O1xuICBnaXRodWJDb25uZWN0aW9uQXJuPzogc3RyaW5nOyAvLyBPcHRpb25hbCBHaXRIdWIgY29ubmVjdGlvbiBBUk5cbiAgZWNyUmVwb3NpdG9yeVVyaT86IHN0cmluZzsgLy8gT3B0aW9uYWwgRUNSIHJlcG9zaXRvcnkgVVJJIGZvciBEb2NrZXItYmFzZWQgZGVwbG95bWVudFxuICBzZWNyZXRBcm5zPzoge1xuICAgIGRhdGFiYXNlU2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgbmV4dGF1dGhTZWNyZXRBcm46IHN0cmluZztcbiAgICBuZXh0YXV0aFVybEFybjogc3RyaW5nO1xuICAgIGdvb2dsZUNsaWVudElkQXJuOiBzdHJpbmc7XG4gICAgZ29vZ2xlQ2xpZW50U2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgYXBpS2V5c1NlY3JldEFybjogc3RyaW5nO1xuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgQXBwUnVubmVyU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgYXBwUnVubmVyU2VydmljZTogYXBwcnVubmVyLkNmblNlcnZpY2U7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwcFJ1bm5lclN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQsIGVudkNvbmZpZywgc2VjcmV0QXJucywgZWNyUmVwb3NpdG9yeVVyaSB9ID0gcHJvcHM7XG5cbiAgICAvLyBHZXQgR2l0SHViIGNvbm5lY3Rpb24gQVJOIGZyb20gY29udGV4dCBvciBwcm9wc1xuICAgIGNvbnN0IGdpdGh1YkNvbm5lY3Rpb25Bcm4gPSBwcm9wcy5naXRodWJDb25uZWN0aW9uQXJuIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubm9kZS50cnlHZXRDb250ZXh0KCdnaXRodWJDb25uZWN0aW9uQXJuJyk7XG5cbiAgICAvLyBEZXRlcm1pbmUgZGVwbG95bWVudCBtb2RlOiAnZG9ja2VyJyBvciAnc291cmNlJ1xuICAgIGNvbnN0IGRlcGxveW1lbnRNb2RlID0gdGhpcy5ub2RlLnRyeUdldENvbnRleHQoJ2RlcGxveW1lbnRNb2RlJykgfHwgJ3NvdXJjZSc7XG4gICAgXG4gICAgY29uc29sZS5sb2coYPCfmoAgRGVwbG95aW5nIEFwcCBSdW5uZXIgaW4gJHtkZXBsb3ltZW50TW9kZX0gbW9kZSBmb3IgJHtlbnZpcm9ubWVudH1gKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIElBTSBST0xFIEZPUiBBUFAgUlVOTkVSIElOU1RBTkNFXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvLyBJbnN0YW5jZSByb2xlIGZvciBBcHAgUnVubmVyIHNlcnZpY2VcbiAgICBjb25zdCBpbnN0YW5jZVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0FwcFJ1bm5lckluc3RhbmNlUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCd0YXNrcy5hcHBydW5uZXIuYW1hem9uYXdzLmNvbScpLFxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gcm9sZSBmb3IgQXBwIFJ1bm5lciBzZXJ2aWNlIGluc3RhbmNlcycsXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgY29tcHJlaGVuc2l2ZSBDbG91ZFdhdGNoIExvZ3MgcGVybWlzc2lvbnNcbiAgICBpbnN0YW5jZVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXG4gICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXG4gICAgICAgICdsb2dzOkRlc2NyaWJlTG9nR3JvdXBzJyxcbiAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dTdHJlYW1zJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEFDQ0VTUyBST0xFIEZPUiBFQ1IgKERPQ0tFUiBNT0RFKVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gQWNjZXNzIHJvbGUgZm9yIEVDUiAocmVxdWlyZWQgZm9yIERvY2tlciBkZXBsb3ltZW50KVxuICAgIGxldCBhY2Nlc3NSb2xlOiBpYW0uUm9sZSB8IHVuZGVmaW5lZDtcbiAgICBpZiAoZGVwbG95bWVudE1vZGUgPT09ICdkb2NrZXInICYmIGVjclJlcG9zaXRvcnlVcmkpIHtcbiAgICAgIGFjY2Vzc1JvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0FwcFJ1bm5lckFjY2Vzc1JvbGUnLCB7XG4gICAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdidWlsZC5hcHBydW5uZXIuYW1hem9uYXdzLmNvbScpLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0FjY2VzcyByb2xlIGZvciBBcHAgUnVubmVyIHRvIHB1bGwgZnJvbSBFQ1InLFxuICAgICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NBcHBSdW5uZXJTZXJ2aWNlUG9saWN5Rm9yRUNSQWNjZXNzJyksXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBZGQgc2VjcmV0cyBtYW5hZ2VyIHBlcm1pc3Npb25zIGZvciBvdXIgaW5kaXZpZHVhbCBzZWNyZXRzXG4gICAgaWYgKHNlY3JldEFybnMpIHtcbiAgICAgIGluc3RhbmNlUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScsXG4gICAgICAgICAgJ2ttczpEZWNyeXB0JyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgc2VjcmV0QXJucy5kYXRhYmFzZVNlY3JldEFybixcbiAgICAgICAgICBzZWNyZXRBcm5zLm5leHRhdXRoU2VjcmV0QXJuLFxuICAgICAgICAgIHNlY3JldEFybnMubmV4dGF1dGhVcmxBcm4sXG4gICAgICAgICAgc2VjcmV0QXJucy5nb29nbGVDbGllbnRJZEFybixcbiAgICAgICAgICBzZWNyZXRBcm5zLmdvb2dsZUNsaWVudFNlY3JldEFybixcbiAgICAgICAgICBzZWNyZXRBcm5zLmFwaUtleXNTZWNyZXRBcm4sXG4gICAgICAgIF0sXG4gICAgICB9KSk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQVBQIFJVTk5FUiBTRVJWSUNFXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvLyBBcHAgUnVubmVyIHNlcnZpY2UgY29uZmlndXJhdGlvblxuICAgIHRoaXMuYXBwUnVubmVyU2VydmljZSA9IG5ldyBhcHBydW5uZXIuQ2ZuU2VydmljZSh0aGlzLCAnTmFpbEl0QXBwUnVubmVyU2VydmljZScsIHtcbiAgICAgIHNlcnZpY2VOYW1lOiBgbmFpbGl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fWAsXG4gICAgICBzb3VyY2VDb25maWd1cmF0aW9uOiB0aGlzLmdldFNvdXJjZUNvbmZpZ3VyYXRpb24oZGVwbG95bWVudE1vZGUsIGdpdGh1YkNvbm5lY3Rpb25Bcm4sIGVjclJlcG9zaXRvcnlVcmksIGVudmlyb25tZW50LCBlbnZDb25maWcsIHNlY3JldEFybnMsIGFjY2Vzc1JvbGUpLFxuICAgICAgaW5zdGFuY2VDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIGNwdTogJzAuMjUgdkNQVScsXG4gICAgICAgIG1lbW9yeTogJzAuNSBHQicsXG4gICAgICAgIGluc3RhbmNlUm9sZUFybjogaW5zdGFuY2VSb2xlLnJvbGVBcm4sXG4gICAgICB9LFxuICAgICAgaGVhbHRoQ2hlY2tDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIHByb3RvY29sOiAnSFRUUCcsXG4gICAgICAgIHBhdGg6ICcvJyxcbiAgICAgICAgaW50ZXJ2YWw6IDIwLFxuICAgICAgICB0aW1lb3V0OiAxMCxcbiAgICAgICAgaGVhbHRoeVRocmVzaG9sZDogMSxcbiAgICAgICAgdW5oZWFsdGh5VGhyZXNob2xkOiAzLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIE9VVFBVVFNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIEFkZCBvdXRwdXRzXG4gICAgdGhpcy5hZGRPdXRwdXRzKGVudkNvbmZpZywgZGVwbG95bWVudE1vZGUpO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gVEFHU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdQcm9qZWN0JywgJ05haWxJdCcpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudCk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdNYW5hZ2VkQnknLCAnQ0RLJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdEYXRhYmFzZVByb3ZpZGVyJywgJ05lb24nKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0hvc3RpbmdQcm92aWRlcicsICdBcHBSdW5uZXInKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0RlcGxveW1lbnRNb2RlJywgZGVwbG95bWVudE1vZGUpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTb3VyY2VDb25maWd1cmF0aW9uKFxuICAgIGRlcGxveW1lbnRNb2RlOiBzdHJpbmcsXG4gICAgZ2l0aHViQ29ubmVjdGlvbkFybjogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIGVjclJlcG9zaXRvcnlVcmk6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBlbnZpcm9ubWVudDogc3RyaW5nLFxuICAgIGVudkNvbmZpZzogeyBhbXBsaWZ5QnJhbmNoOiBzdHJpbmc7IHJlc291cmNlU3VmZml4OiBzdHJpbmcgfSxcbiAgICBzZWNyZXRBcm5zPzoge1xuICAgICAgZGF0YWJhc2VTZWNyZXRBcm46IHN0cmluZztcbiAgICAgIG5leHRhdXRoU2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgICBuZXh0YXV0aFVybEFybjogc3RyaW5nO1xuICAgICAgZ29vZ2xlQ2xpZW50SWRBcm46IHN0cmluZztcbiAgICAgIGdvb2dsZUNsaWVudFNlY3JldEFybjogc3RyaW5nO1xuICAgICAgYXBpS2V5c1NlY3JldEFybjogc3RyaW5nO1xuICAgIH0sXG4gICAgYWNjZXNzUm9sZT86IGlhbS5Sb2xlXG4gICk6IGFwcHJ1bm5lci5DZm5TZXJ2aWNlLlNvdXJjZUNvbmZpZ3VyYXRpb25Qcm9wZXJ0eSB7XG4gICAgXG4gICAgaWYgKGRlcGxveW1lbnRNb2RlID09PSAnZG9ja2VyJyAmJiBlY3JSZXBvc2l0b3J5VXJpICYmIGFjY2Vzc1JvbGUpIHtcbiAgICAgIC8vIERvY2tlci1iYXNlZCBkZXBsb3ltZW50XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpbWFnZVJlcG9zaXRvcnk6IHtcbiAgICAgICAgICBpbWFnZUlkZW50aWZpZXI6IGAke2VjclJlcG9zaXRvcnlVcml9OmxhdGVzdGAsXG4gICAgICAgICAgaW1hZ2VSZXBvc2l0b3J5VHlwZTogJ0VDUicsXG4gICAgICAgICAgaW1hZ2VDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICBwb3J0OiAnMzAwMCcsXG4gICAgICAgICAgICBydW50aW1lRW52aXJvbm1lbnRWYXJpYWJsZXM6IHRoaXMuZ2V0UnVudGltZUVudmlyb25tZW50VmFyaWFibGVzKCksXG4gICAgICAgICAgICBydW50aW1lRW52aXJvbm1lbnRTZWNyZXRzOiB0aGlzLmdldFJ1bnRpbWVFbnZpcm9ubWVudFNlY3JldHMoc2VjcmV0QXJucyksXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgYXV0aGVudGljYXRpb25Db25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgYWNjZXNzUm9sZUFybjogYWNjZXNzUm9sZS5yb2xlQXJuLFxuICAgICAgICB9LFxuICAgICAgICBhdXRvRGVwbG95bWVudHNFbmFibGVkOiBmYWxzZSwgLy8gTWFudWFsIGRlcGxveW1lbnQgdmlhIEdpdEh1YiBBY3Rpb25zXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTb3VyY2UgY29kZS1iYXNlZCBkZXBsb3ltZW50IChsZWdhY3kpXG4gICAgICByZXR1cm4gZ2l0aHViQ29ubmVjdGlvbkFybiA/IHtcbiAgICAgICAgYXV0b0RlcGxveW1lbnRzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgYXV0aGVudGljYXRpb25Db25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgY29ubmVjdGlvbkFybjogZ2l0aHViQ29ubmVjdGlvbkFybixcbiAgICAgICAgfSxcbiAgICAgICAgY29kZVJlcG9zaXRvcnk6IHtcbiAgICAgICAgICByZXBvc2l0b3J5VXJsOiAnaHR0cHM6Ly9naXRodWIuY29tL2tlbm55Y3phZHplY2svbmFpbGl0JyxcbiAgICAgICAgICBzb3VyY2VDb2RlVmVyc2lvbjoge1xuICAgICAgICAgICAgdHlwZTogJ0JSQU5DSCcsXG4gICAgICAgICAgICB2YWx1ZTogZW52Q29uZmlnLmFtcGxpZnlCcmFuY2gsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb2RlQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgY29uZmlndXJhdGlvblNvdXJjZTogJ0FQSScsXG4gICAgICAgICAgICBjb2RlQ29uZmlndXJhdGlvblZhbHVlczogdGhpcy5nZXRDb2RlQ29uZmlndXJhdGlvbihlbnZpcm9ubWVudCwgZW52Q29uZmlnLCBzZWNyZXRBcm5zKSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSA6IHtcbiAgICAgICAgLy8gRmFsbGJhY2sgY29uZmlndXJhdGlvblxuICAgICAgICBpbWFnZVJlcG9zaXRvcnk6IHtcbiAgICAgICAgICBpbWFnZUlkZW50aWZpZXI6ICdwdWJsaWMuZWNyLmF3cy9hd3MtY29udGFpbmVycy9oZWxsby1hcHAtcnVubmVyOmxhdGVzdCcsXG4gICAgICAgICAgaW1hZ2VSZXBvc2l0b3J5VHlwZTogJ0VDUl9QVUJMSUMnLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFJ1bnRpbWVFbnZpcm9ubWVudFZhcmlhYmxlcygpOiBhcHBydW5uZXIuQ2ZuU2VydmljZS5LZXlWYWx1ZVBhaXJQcm9wZXJ0eVtdIHtcbiAgICByZXR1cm4gW1xuICAgICAgeyBuYW1lOiAnTk9ERV9FTlYnLCB2YWx1ZTogJ3Byb2R1Y3Rpb24nIH0sXG4gICAgICB7IG5hbWU6ICdQT1JUJywgdmFsdWU6ICczMDAwJyB9LFxuICAgICAgeyBuYW1lOiAnSE9TVE5BTUUnLCB2YWx1ZTogJzAuMC4wLjAnIH0sXG4gICAgICAvLyBTZWN1cml0eTogRGlzYWJsZSBkZWJ1ZyBlbmRwb2ludHMgaW4gcHJvZHVjdGlvblxuICAgICAgeyBuYW1lOiAnRElTQUJMRV9ERUJVR19FTkRQT0lOVFMnLCB2YWx1ZTogJ3RydWUnIH0sXG4gICAgICAvLyBFbmFibGUgc2VjdXJpdHkgaGVhZGVycyBpbiBwcm9kdWN0aW9uXG4gICAgICB7IG5hbWU6ICdTRUNVUklUWV9IRUFERVJTX0VOQUJMRUQnLCB2YWx1ZTogJ3RydWUnIH0sXG4gICAgXTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UnVudGltZUVudmlyb25tZW50U2VjcmV0cyhzZWNyZXRBcm5zPzoge1xuICAgIGRhdGFiYXNlU2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgbmV4dGF1dGhTZWNyZXRBcm46IHN0cmluZztcbiAgICBuZXh0YXV0aFVybEFybjogc3RyaW5nO1xuICAgIGdvb2dsZUNsaWVudElkQXJuOiBzdHJpbmc7XG4gICAgZ29vZ2xlQ2xpZW50U2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgYXBpS2V5c1NlY3JldEFybjogc3RyaW5nO1xuICB9KTogYXBwcnVubmVyLkNmblNlcnZpY2UuS2V5VmFsdWVQYWlyUHJvcGVydHlbXSB7XG4gICAgaWYgKCFzZWNyZXRBcm5zKSByZXR1cm4gW107XG5cbiAgICByZXR1cm4gW1xuICAgICAgeyBuYW1lOiAnREFUQUJBU0VfVVJMJywgdmFsdWU6IGAke3NlY3JldEFybnMuZGF0YWJhc2VTZWNyZXRBcm59YCB9LFxuICAgICAgeyBuYW1lOiAnTkVYVEFVVEhfU0VDUkVUJywgdmFsdWU6IGAke3NlY3JldEFybnMubmV4dGF1dGhTZWNyZXRBcm59YCB9LFxuICAgICAgeyBuYW1lOiAnTkVYVEFVVEhfVVJMJywgdmFsdWU6IGAke3NlY3JldEFybnMubmV4dGF1dGhVcmxBcm59YCB9LFxuICAgICAgeyBuYW1lOiAnR09PR0xFX0NMSUVOVF9JRCcsIHZhbHVlOiBgJHtzZWNyZXRBcm5zLmdvb2dsZUNsaWVudElkQXJufWAgfSxcbiAgICAgIHsgbmFtZTogJ0dPT0dMRV9DTElFTlRfU0VDUkVUJywgdmFsdWU6IGAke3NlY3JldEFybnMuZ29vZ2xlQ2xpZW50U2VjcmV0QXJufWAgfSxcbiAgICBdO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRPdXRwdXRzKGVudkNvbmZpZzogeyByZXNvdXJjZVN1ZmZpeDogc3RyaW5nIH0sIGRlcGxveW1lbnRNb2RlOiBzdHJpbmcpIHtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBwUnVubmVyU2VydmljZVVybCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke3RoaXMuYXBwUnVubmVyU2VydmljZS5hdHRyU2VydmljZVVybH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdBcHAgUnVubmVyIHNlcnZpY2UgVVJMJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9LUFwcFJ1bm5lclVybGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBwUnVubmVyU2VydmljZUFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFwcFJ1bm5lclNlcnZpY2UuYXR0clNlcnZpY2VBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcCBSdW5uZXIgc2VydmljZSBBUk4nLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tQXBwUnVubmVyQXJuYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcHBSdW5uZXJTZXJ2aWNlSWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hcHBSdW5uZXJTZXJ2aWNlLmF0dHJTZXJ2aWNlSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcCBSdW5uZXIgc2VydmljZSBJRCcsXG4gICAgICBleHBvcnROYW1lOiBgTmFpbEl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1BcHBSdW5uZXJTZXJ2aWNlSWRgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RlcGxveW1lbnRNb2RlJywge1xuICAgICAgdmFsdWU6IGRlcGxveW1lbnRNb2RlLFxuICAgICAgZGVzY3JpcHRpb246ICdBcHAgUnVubmVyIGRlcGxveW1lbnQgbW9kZSAoc291cmNlIG9yIGRvY2tlciknLFxuICAgICAgZXhwb3J0TmFtZTogYE5haWxJdC0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH0tRGVwbG95bWVudE1vZGVgLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gTGVnYWN5IG1ldGhvZCBmb3Igc291cmNlIGNvZGUgZGVwbG95bWVudHNcbiAgcHJpdmF0ZSBnZXRDb2RlQ29uZmlndXJhdGlvbihlbnZpcm9ubWVudDogc3RyaW5nLCBlbnZDb25maWc6IHsgcmVzb3VyY2VTdWZmaXg6IHN0cmluZyB9LCBzZWNyZXRBcm5zPzoge1xuICAgIGRhdGFiYXNlU2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgbmV4dGF1dGhTZWNyZXRBcm46IHN0cmluZztcbiAgICBuZXh0YXV0aFVybEFybjogc3RyaW5nO1xuICAgIGdvb2dsZUNsaWVudElkQXJuOiBzdHJpbmc7XG4gICAgZ29vZ2xlQ2xpZW50U2VjcmV0QXJuOiBzdHJpbmc7XG4gICAgYXBpS2V5c1NlY3JldEFybjogc3RyaW5nO1xuICB9KTogYXBwcnVubmVyLkNmblNlcnZpY2UuQ29kZUNvbmZpZ3VyYXRpb25WYWx1ZXNQcm9wZXJ0eSB7XG4gICAgY29uc3QgZW52VmFycyA9IFtcbiAgICAgIHsgbmFtZTogJ05PREVfRU5WJywgdmFsdWU6ICdwcm9kdWN0aW9uJyB9LFxuICAgICAgeyBuYW1lOiAnUE9SVCcsIHZhbHVlOiAnMzAwMCcgfSxcbiAgICAgIHsgbmFtZTogJ0FXU19SRUdJT04nLCB2YWx1ZTogJ3VzLWVhc3QtMScgfSxcbiAgICAgIHsgbmFtZTogJ05BSUxJVF9FTlZJUk9OTUVOVCcsIHZhbHVlOiBlbnZpcm9ubWVudCB9LFxuICAgICAgLy8gTm90ZTogTkVYVF9QVUJMSUNfR09PR0xFX01BUFNfQVBJX0tFWSBpcyBzZXQgaW4gYnVpbGRDb21tYW5kLCBub3QgcnVudGltZVxuICAgIF07XG5cbiAgICBjb25zdCBzZWNyZXRzOiBhcHBydW5uZXIuQ2ZuU2VydmljZS5LZXlWYWx1ZVBhaXJQcm9wZXJ0eVtdID0gW107XG5cbiAgICAvLyBBZGQgc2VjcmV0cyBpZiBwcm92aWRlZCAoc2VydmVyLXNpZGUgb25seSAtIG5vIGNsaWVudC1zaWRlIHNlY3JldHMpXG4gICAgaWYgKHNlY3JldEFybnMpIHtcbiAgICAgIHNlY3JldHMucHVzaChcbiAgICAgICAgeyBuYW1lOiAnREFUQUJBU0VfVVJMJywgdmFsdWU6IGAke3NlY3JldEFybnMuZGF0YWJhc2VTZWNyZXRBcm59YCB9LFxuICAgICAgICB7IG5hbWU6ICdORVhUQVVUSF9TRUNSRVQnLCB2YWx1ZTogYCR7c2VjcmV0QXJucy5uZXh0YXV0aFNlY3JldEFybn1gIH0sXG4gICAgICAgIHsgbmFtZTogJ05FWFRBVVRIX1VSTCcsIHZhbHVlOiBgJHtzZWNyZXRBcm5zLm5leHRhdXRoVXJsQXJufWAgfSxcbiAgICAgICAgeyBuYW1lOiAnR09PR0xFX0NMSUVOVF9JRCcsIHZhbHVlOiBgJHtzZWNyZXRBcm5zLmdvb2dsZUNsaWVudElkQXJufWAgfSxcbiAgICAgICAgeyBuYW1lOiAnR09PR0xFX0NMSUVOVF9TRUNSRVQnLCB2YWx1ZTogYCR7c2VjcmV0QXJucy5nb29nbGVDbGllbnRTZWNyZXRBcm59YCB9LFxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCBjb21tYW5kIHdpdGggTkVYVF9QVUJMSUMgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZyb20gQVdTIFNlY3JldHMgTWFuYWdlclxuICAgIGNvbnN0IGJ1aWxkQ29tbWFuZCA9IFtcbiAgICAgICducG0gY2kgLS1pZ25vcmUtc2NyaXB0cyAtLWxlZ2FjeS1wZWVyLWRlcHMnLFxuICAgICAgJ25weCBwcmlzbWEgZ2VuZXJhdGUnLFxuICAgICAgJ2VjaG8gXCI9PT0gQnVpbGRpbmcgYXBwbGljYXRpb24gd2l0aCBzZWN1cmUgZW52aXJvbm1lbnQgPT09XCInLFxuICAgICAgLy8gR2V0IEFQSSBrZXkgZnJvbSBzZWNyZXRzIG1hbmFnZXIgZm9yIGJ1aWxkXG4gICAgICBzZWNyZXRBcm5zID8gYGV4cG9ydCBORVhUX1BVQkxJQ19HT09HTEVfTUFQU19BUElfS0VZPSQoYXdzIHNlY3JldHNtYW5hZ2VyIGdldC1zZWNyZXQtdmFsdWUgLS1zZWNyZXQtaWQgJHtzZWNyZXRBcm5zLmFwaUtleXNTZWNyZXRBcm59IC0tcXVlcnkgU2VjcmV0U3RyaW5nIC0tb3V0cHV0IHRleHQpYCA6ICcnLFxuICAgICAgJ2V4cG9ydCBORVhUX1BVQkxJQ19CVUlMRF9USU1FPSQoZGF0ZSAtdSArXCIlWS0lbS0lZFQlSDolTTolUy4lM05aXCIpJyxcbiAgICAgICdleHBvcnQgREFUQUJBU0VfVVJMPVwicG9zdGdyZXNxbDovL2R1bW15OmR1bW15QGxvY2FsaG9zdDo1NDMyL2R1bW15XCInLFxuICAgICAgJ2V4cG9ydCBORVhUQVVUSF9TRUNSRVQ9XCJkdW1teS1zZWNyZXQtZm9yLWJ1aWxkXCInLFxuICAgICAgJ2V4cG9ydCBORVhUQVVUSF9VUkw9XCJodHRwOi8vbG9jYWxob3N0OjMwMDBcIicsXG4gICAgICAnZXhwb3J0IE5PREVfRU5WPVwicHJvZHVjdGlvblwiJyxcbiAgICAgICducG0gcnVuIGJ1aWxkJ1xuICAgIF0uZmlsdGVyKGNtZCA9PiBjbWQgIT09ICcnKS5qb2luKCcgJiYgJyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcnVudGltZTogJ05PREVKU18yMicsXG4gICAgICBidWlsZENvbW1hbmQsXG4gICAgICBzdGFydENvbW1hbmQ6ICducG0gc3RhcnQnLFxuICAgICAgcnVudGltZUVudmlyb25tZW50VmFyaWFibGVzOiBlbnZWYXJzLFxuICAgICAgcnVudGltZUVudmlyb25tZW50U2VjcmV0czogc2VjcmV0cyxcbiAgICB9O1xuICB9XG59ICJdfQ==