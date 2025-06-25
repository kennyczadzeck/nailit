import * as cdk from 'aws-cdk-lib';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
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
    const accountId = props.env?.account || this.account;
    const region = props.env?.region || 'us-east-1';

    // Get GitHub connection ARN from context or props
    const githubConnectionArn = props.githubConnectionArn || 
                               this.node.tryGetContext('githubConnectionArn');

    // =================================
    // IAM ROLE FOR APP RUNNER
    // =================================

    // Create the IAM role for App Runner service
    const appRunnerRole = new iam.Role(this, 'AppRunnerServiceRole', {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
      description: 'IAM role for App Runner service',
    });

    // Add CloudWatch Logs permissions
    appRunnerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:CreateLogGroup',
      ],
      resources: ['*'],
    }));

    // TODO: Re-enable secrets manager permissions when secrets integration is working
    // if (secretArns) {
    //   appRunnerRole.addToPolicy(new iam.PolicyStatement({
    //     effect: iam.Effect.ALLOW,
    //     actions: [
    //       'secretsmanager:GetSecretValue',
    //       'kms:Decrypt',
    //     ],
    //     resources: [
    //       secretArns.databaseSecretArn,
    //       secretArns.nextauthSecretArn,
    //       secretArns.nextauthUrlArn,
    //       secretArns.googleClientIdArn,
    //       secretArns.googleClientSecretArn,
    //       secretArns.apiKeysSecretArn,
    //     ],
    //   }));
    // }

    // =================================
    // ECR REPOSITORY
    // =================================

    // Create ECR repository for the app
    const ecrRepository = new ecr.Repository(this, 'NailItECRRepository', {
      repositoryName: `nailit-${envConfig.resourceSuffix}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development - change for production
      imageTagMutability: ecr.TagMutability.MUTABLE,
    });

    // Grant access role to pull from ECR
    ecrRepository.grantPull(appRunnerRole);

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
        instanceRoleArn: appRunnerRole.roleArn,
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