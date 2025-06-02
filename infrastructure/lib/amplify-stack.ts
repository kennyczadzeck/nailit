import * as cdk from 'aws-cdk-lib';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface AmplifyStackProps extends cdk.StackProps {
  repositoryUrl: string;
  accessToken: string; // GitHub personal access token
  domainName?: string; // Optional custom domain
  environments: {
    [key: string]: {
      branchName: string;
      environmentVariables: { [key: string]: string };
      subdomain?: string;
    };
  };
}

export class AmplifyStack extends cdk.Stack {
  public readonly app: amplify.CfnApp;
  public readonly branches: { [key: string]: amplify.CfnBranch };

  constructor(scope: Construct, id: string, props: AmplifyStackProps) {
    super(scope, id, props);

    // Amplify Service Role
    const amplifyRole = new iam.Role(this, 'AmplifyServiceRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'),
      ],
    });

    // Amplify App
    this.app = new amplify.CfnApp(this, 'NailItApp', {
      name: 'nailit',
      repository: props.repositoryUrl,
      accessToken: props.accessToken,
      platform: 'WEB_COMPUTE',
      iamServiceRole: amplifyRole.roleArn,
      
      // Build Settings (equivalent to amplify.yml)
      buildSpec: JSON.stringify({
        version: 1,
        frontend: {
          phases: {
            preBuild: {
              commands: [
                'echo "Environment variables check..."',
                'echo "DATABASE_URL exists:" $DATABASE_URL',
                'echo "DATABASE_MIGRATION_URL exists:" $DATABASE_MIGRATION_URL', 
                'echo "NEXTAUTH_URL exists:" $NEXTAUTH_URL',
                // Environment detection logic
                'if [[ "$DATABASE_URL" == *"misty-frog"* ]]; then',
                '  echo "🚀 PRODUCTION ENVIRONMENT - Formal migration workflow"',
                '  export ENVIRONMENT="production"',
                'elif [[ "$DATABASE_URL" == *"raspy-sound"* ]]; then',
                '  echo "🧪 STAGING ENVIRONMENT - Formal migration workflow"', 
                '  export ENVIRONMENT="staging"',
                'elif [[ "$DATABASE_URL" == *"still-paper"* ]]; then',
                '  echo "🛠️ DEVELOPMENT ENVIRONMENT - Rapid iteration workflow"',
                '  export ENVIRONMENT="development"',
                'else',
                '  echo "❓ UNKNOWN ENVIRONMENT - Defaulting to production workflow"',
                '  export ENVIRONMENT="production"',
                'fi',
                'npm install --legacy-peer-deps',
                // Environment-specific database strategy
                'if [[ "$ENVIRONMENT" == "development" ]]; then',
                '  echo "Pushing schema changes to development database..."',
                '  npx prisma db push --accept-data-loss',
                'else',
                '  echo "Running Prisma migrations ($ENVIRONMENT)..."', 
                '  npx prisma migrate deploy',
                'fi',
                'echo "Generating Prisma client..."',
                'npx prisma generate',
              ],
            },
            build: {
              commands: ['npm run build -- --no-lint'],
            },
          },
          artifacts: {
            baseDirectory: '.next',
            files: ['**/*'],
          },
        },
      }),
      
      // Environment Variables (common to all branches)
      environmentVariables: [
        { name: 'AMPLIFY_MONOREPO_APP_ROOT', value: '.' },
        { name: 'AMPLIFY_DIFF_DEPLOY', value: 'false' },
        { name: '_LIVE_UPDATES', value: '[{"name":"Next.js SSR Streaming","pkg":"next","type":"framework","version":"latest"}]' },
      ],
    });

    // Create branches for each environment
    this.branches = {};
    
    Object.entries(props.environments).forEach(([envName, config]) => {
      const branch = new amplify.CfnBranch(this, `${envName}Branch`, {
        appId: this.app.attrAppId,
        branchName: config.branchName,
        
        // Environment-specific variables
        environmentVariables: Object.entries(config.environmentVariables).map(([key, value]) => ({
          name: key,
          value: value,
        })),
        
        // Branch configuration
        enableAutoBuild: true,
        enablePullRequestPreview: envName !== 'production',
        framework: 'Next.js - SSR',
        stage: envName === 'production' ? 'PRODUCTION' : 'DEVELOPMENT',
      });
      
      this.branches[envName] = branch;
      
      // TODO: Custom domain configuration (disabled for now due to CDK version compatibility)
      // if (props.domainName && config.subdomain) {
      //   new amplify.CfnDomainAssociation(this, `${envName}Domain`, {
      //     appId: this.app.attrAppId,
      //     domainName: props.domainName,
      //     subDomainSettings: [
      //       {
      //         branchName: config.branchName,
      //         prefix: config.subdomain,
      //       },
      //     ],
      //   });
      // }
    });

    // Outputs
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: this.app.attrAppId,
      description: 'Amplify App ID',
    });

    Object.entries(this.branches).forEach(([envName, branch]) => {
      new cdk.CfnOutput(this, `${envName}BranchUrl`, {
        value: `https://${branch.branchName}.${this.app.attrDefaultDomain}`,
        description: `${envName} environment URL`,
      });
    });
  }
} 