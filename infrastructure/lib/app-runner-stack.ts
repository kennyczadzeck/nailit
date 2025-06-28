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

    const { environment, envConfig, secretArns } = props;

    // Get GitHub connection ARN from context or props
    const githubConnectionArn = props.githubConnectionArn || 
                               this.node.tryGetContext('githubConnectionArn');

    // =================================
    // IAM ROLE FOR APP RUNNER INSTANCE
    // =================================

    // Instance role for App Runner service - this is the correct role for GitHub sources
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
            configurationSource: 'API', // Use inline configuration for environment-specific settings
            codeConfigurationValues: this.getCodeConfiguration(environment, envConfig, secretArns),
          },
        },
      } : {
        // Fallback configuration - this shouldn't be used
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
    ];

    const secrets: apprunner.CfnService.KeyValuePairProperty[] = [];

    // Add secrets if provided
    if (secretArns) {
      secrets.push(
        { name: 'DATABASE_URL', value: `${secretArns.databaseSecretArn}` },
        { name: 'NEXTAUTH_SECRET', value: `${secretArns.nextauthSecretArn}` },
        { name: 'NEXTAUTH_URL', value: `${secretArns.nextauthUrlArn}` },
        { name: 'GOOGLE_CLIENT_ID', value: `${secretArns.googleClientIdArn}` },
        { name: 'GOOGLE_CLIENT_SECRET', value: `${secretArns.googleClientSecretArn}` },
        { name: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', value: `${secretArns.apiKeysSecretArn}` },
      );
    }

    // Build command that retrieves Google Maps API key from secrets during build
    const buildCommand = secretArns 
      ? `export NEXT_PUBLIC_COMMIT_HASH=$(git rev-parse --short HEAD) && export NEXT_PUBLIC_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ") && export NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$(aws secretsmanager get-secret-value --secret-id nailit-google-maps-api-key-${environment} --query SecretString --output text --region us-east-1) && npm ci --ignore-scripts --legacy-peer-deps && npx prisma generate && DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" NEXTAUTH_SECRET="dummy-secret-for-build" NEXTAUTH_URL="http://localhost:3000" NODE_ENV="production" npm run build`
      : 'export NEXT_PUBLIC_COMMIT_HASH=$(git rev-parse --short HEAD) && export NEXT_PUBLIC_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ") && npm ci --ignore-scripts --legacy-peer-deps && npx prisma generate && DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" NEXTAUTH_SECRET="dummy-secret-for-build" NEXTAUTH_URL="http://localhost:3000" NODE_ENV="production" npm run build';

    return {
      runtime: 'NODEJS_22',
      buildCommand,
      startCommand: 'npm start',
      runtimeEnvironmentVariables: envVars,
      runtimeEnvironmentSecrets: secrets,
    };
  }

  private addOutputs(envConfig: { resourceSuffix: string }) {
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