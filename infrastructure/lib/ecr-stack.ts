import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

interface EcrStackProps extends cdk.StackProps {
  environment: string;
  envConfig: {
    resourceSuffix: string;
  };
}

export class EcrStack extends cdk.Stack {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);

    const { environment, envConfig } = props;

    // =================================
    // ECR REPOSITORY
    // =================================

    this.repository = new ecr.Repository(this, 'NailItRepository', {
      repositoryName: `nailit-${envConfig.resourceSuffix}`,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          // Keep last 10 images
          maxImageCount: 10,
          rulePriority: 2,
          description: 'Keep last 10 images',
        },
        {
          // Delete untagged images after 1 day - this rule must have highest priority
          maxImageAge: cdk.Duration.days(1),
          rulePriority: 1,
          description: 'Delete untagged images after 1 day',
          tagStatus: ecr.TagStatus.UNTAGGED,
        },
      ],
    });

    // =================================
    // OUTPUTS
    // =================================

    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: this.repository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: `NailIt-${envConfig.resourceSuffix}-RepositoryUri`,
    });

    new cdk.CfnOutput(this, 'RepositoryArn', {
      value: this.repository.repositoryArn,
      description: 'ECR Repository ARN',
      exportName: `NailIt-${envConfig.resourceSuffix}-RepositoryArn`,
    });

    // =================================
    // TAGS
    // =================================

    cdk.Tags.of(this).add('Project', 'NailIt');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Component', 'ECR');
  }
} 