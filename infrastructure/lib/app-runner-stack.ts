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
  githubConnectionArn?: string; // Optional GitHub connection ARN
  ecrRepositoryUri?: string; // Optional ECR repository URI for Docker-based deployment
  secretArns?: {
    databaseSecretArn: string;
    nextauthSecretArn: string;
    nextauthUrlArn: string;
    googleClientIdArn: string;
    googleClientSecretArn: string;
    apiKeysSecretArn: string;
  };
}

export class AppRunnerStack extends cdk.Stack {
  public readonly appRunnerService: apprunner.CfnService;

  constructor(scope: Construct, id: string, props: AppRunnerStackProps) {
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

  private getSourceConfiguration(
    deploymentMode: string,
    githubConnectionArn: string | undefined,
    ecrRepositoryUri: string | undefined,
    environment: string,
    envConfig: { amplifyBranch: string; resourceSuffix: string },
    secretArns?: {
      databaseSecretArn: string;
      nextauthSecretArn: string;
      nextauthUrlArn: string;
      googleClientIdArn: string;
      googleClientSecretArn: string;
      apiKeysSecretArn: string;
    }
  ): apprunner.CfnService.SourceConfigurationProperty {
    
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
    } else {
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

  private getRuntimeEnvironmentVariables(environment: string): apprunner.CfnService.KeyValuePairProperty[] {
    return [
      { name: 'NODE_ENV', value: 'production' },
      { name: 'PORT', value: '3000' },
      { name: 'AWS_REGION', value: 'us-east-1' },
      { name: 'NAILIT_ENVIRONMENT', value: environment },
    ];
  }

  private getRuntimeEnvironmentSecrets(secretArns?: {
    databaseSecretArn: string;
    nextauthSecretArn: string;
    nextauthUrlArn: string;
    googleClientIdArn: string;
    googleClientSecretArn: string;
    apiKeysSecretArn: string;
  }): apprunner.CfnService.KeyValuePairProperty[] {
    if (!secretArns) return [];

    return [
      { name: 'DATABASE_URL', value: `${secretArns.databaseSecretArn}` },
      { name: 'NEXTAUTH_SECRET', value: `${secretArns.nextauthSecretArn}` },
      { name: 'NEXTAUTH_URL', value: `${secretArns.nextauthUrlArn}` },
      { name: 'GOOGLE_CLIENT_ID', value: `${secretArns.googleClientIdArn}` },
      { name: 'GOOGLE_CLIENT_SECRET', value: `${secretArns.googleClientSecretArn}` },
    ];
  }

  private addOutputs(envConfig: { resourceSuffix: string }, deploymentMode: string) {
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
  private getCodeConfiguration(environment: string, envConfig: { resourceSuffix: string }, secretArns?: {
    databaseSecretArn: string;
    nextauthSecretArn: string;
    nextauthUrlArn: string;
    googleClientIdArn: string;
    googleClientSecretArn: string;
    apiKeysSecretArn: string;
  }): apprunner.CfnService.CodeConfigurationValuesProperty {
    const envVars = [
      { name: 'NODE_ENV', value: 'production' },
      { name: 'PORT', value: '3000' },
      { name: 'AWS_REGION', value: 'us-east-1' },
      { name: 'NAILIT_ENVIRONMENT', value: environment },
      // Note: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set in buildCommand, not runtime
    ];

    const secrets: apprunner.CfnService.KeyValuePairProperty[] = [];

    // Add secrets if provided (server-side only - no client-side secrets)
    if (secretArns) {
      secrets.push(
        { name: 'DATABASE_URL', value: `${secretArns.databaseSecretArn}` },
        { name: 'NEXTAUTH_SECRET', value: `${secretArns.nextauthSecretArn}` },
        { name: 'NEXTAUTH_URL', value: `${secretArns.nextauthUrlArn}` },
        { name: 'GOOGLE_CLIENT_ID', value: `${secretArns.googleClientIdArn}` },
        { name: 'GOOGLE_CLIENT_SECRET', value: `${secretArns.googleClientSecretArn}` },
      );
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