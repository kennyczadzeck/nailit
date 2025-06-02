#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AmplifyStack } from '../lib/amplify-stack';
import { NailItInfrastructureStack } from '../lib/nailit-infrastructure-stack';

const app = new cdk.App();

// Environment configuration
const environments = {
  development: {
    branchName: 'develop',
    subdomain: 'develop',
    resourceSuffix: 'dev',
    databaseBranch: 'br-still-paper-a5tgtem8',
    environmentVariables: {
      DATABASE_URL: 'postgresql://neondb_owner:REDACTED@ep-still-paper-a5tgtem8-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
      DATABASE_MIGRATION_URL: 'postgresql://neondb_owner:REDACTED@ep-still-paper-a5tgtem8.us-east-1.aws.neon.tech/neondb?sslmode=require',
      NEXTAUTH_SECRET: 'development-secret-key',
      NEXTAUTH_URL: 'https://develop.d1rq0k9js5lwg3.amplifyapp.com',
      GOOGLE_CLIENT_ID: '1045127662265-abc123.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'development-client-secret',
      AWS_REGION: 'us-east-1',
    },
  },
  staging: {
    branchName: 'staging', 
    subdomain: 'staging',
    resourceSuffix: 'staging',
    databaseBranch: 'br-raspy-sound-a5eg97xu',
    environmentVariables: {
      DATABASE_URL: 'postgresql://neondb_owner:REDACTED@ep-raspy-sound-a5eg97xu-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
      DATABASE_MIGRATION_URL: 'postgresql://neondb_owner:REDACTED@ep-raspy-sound-a5eg97xu.us-east-1.aws.neon.tech/neondb?sslmode=require', 
      NEXTAUTH_SECRET: 'staging-secret-key',
      NEXTAUTH_URL: 'https://staging.d1rq0k9js5lwg3.amplifyapp.com',
      GOOGLE_CLIENT_ID: '1045127662265-abc123.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'staging-client-secret', 
      AWS_REGION: 'us-east-1',
    },
  },
  production: {
    branchName: 'main',
    subdomain: 'app', 
    resourceSuffix: 'prod',
    databaseBranch: 'br-misty-frog-a5pcr9pt',
    environmentVariables: {
      DATABASE_URL: 'postgresql://neondb_owner:REDACTED@ep-misty-frog-a5pcr9pt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
      DATABASE_MIGRATION_URL: 'postgresql://neondb_owner:REDACTED@ep-misty-frog-a5pcr9pt.us-east-1.aws.neon.tech/neondb?sslmode=require',
      NEXTAUTH_SECRET: 'production-secret-key',
      NEXTAUTH_URL: 'https://app.nailit.dev', 
      GOOGLE_CLIENT_ID: '1045127662265-abc123.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'production-client-secret',
      AWS_REGION: 'us-east-1',
    },
  },
};

const targetEnv = app.node.tryGetContext('environment') || 'development';
const envConfig = environments[targetEnv as keyof typeof environments];

if (!envConfig) {
  throw new Error(`Unknown environment: ${targetEnv}`);
}

// AWS Account and Region
const awsEnv = {
  account: '207091906248',
  region: 'us-east-1',
};

// Deploy Infrastructure Stack (S3, SQS, SNS, etc.)
const infraStack = new NailItInfrastructureStack(app, `NailIt-${envConfig.resourceSuffix}-Stack`, {
  env: awsEnv,
  environment: targetEnv,
  envConfig: {
    amplifyBranch: envConfig.branchName,
    databaseBranch: envConfig.databaseBranch,
    resourceSuffix: envConfig.resourceSuffix,
  },
});

// Deploy Amplify Stack (if deploying all environments at once)
if (targetEnv === 'all') {
  // Deploy complete Amplify configuration with all environments
  const amplifyStack = new AmplifyStack(app, 'NailIt-Amplify-Stack', {
    env: awsEnv,
    repositoryUrl: 'https://github.com/kenny-cfg/nailit',
    accessToken: process.env.GITHUB_ACCESS_TOKEN || 'PLACEHOLDER', // Set in CI/CD
    domainName: 'nailit.dev', // Optional: set your custom domain
    environments: {
      development: {
        branchName: environments.development.branchName,
        subdomain: environments.development.subdomain,
        environmentVariables: {
          ...environments.development.environmentVariables,
          // Add infrastructure outputs dynamically
          AWS_S3_BUCKET: `nailit-dev-emails-207091906248`,
          AWS_SQS_EMAIL_QUEUE: `https://sqs.us-east-1.amazonaws.com/207091906248/nailit-dev-email-queue`,
          AWS_SNS_TOPIC: `arn:aws:sns:us-east-1:207091906248:nailit-dev-notifications`,
        },
      },
      staging: {
        branchName: environments.staging.branchName,
        subdomain: environments.staging.subdomain,
        environmentVariables: {
          ...environments.staging.environmentVariables,
          AWS_S3_BUCKET: `nailit-staging-emails-207091906248`,
          AWS_SQS_EMAIL_QUEUE: `https://sqs.us-east-1.amazonaws.com/207091906248/nailit-staging-email-queue`,
          AWS_SNS_TOPIC: `arn:aws:sns:us-east-1:207091906248:nailit-staging-notifications`,
        },
      },
      production: {
        branchName: environments.production.branchName,
        subdomain: environments.production.subdomain,
        environmentVariables: {
          ...environments.production.environmentVariables,
          AWS_S3_BUCKET: `nailit-prod-emails-207091906248`,
          AWS_SQS_EMAIL_QUEUE: `https://sqs.us-east-1.amazonaws.com/207091906248/nailit-prod-email-queue`,
          AWS_SNS_TOPIC: `arn:aws:sns:us-east-1:207091906248:nailit-prod-notifications`,
        },
      },
    },
  });

  // Ensure infrastructure stacks are created before Amplify
  amplifyStack.addDependency(infraStack);
}

// Add tags to all stacks
cdk.Tags.of(app).add('Project', 'NailIt');
cdk.Tags.of(app).add('ManagedBy', 'CDK'); 