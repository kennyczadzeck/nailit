#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NailItInfrastructureStack } from '../lib/nailit-infrastructure-stack';
import { LoggingStack } from '../lib/logging-stack';
import { AppRunnerStack } from '../lib/app-runner-stack';
import { SecretsStack } from '../lib/secrets-stack';

const app = new cdk.App();

// Get environment from context or default
const environment = app.node.tryGetContext('environment') || 'development';
const accountId = app.node.tryGetContext('account') || '207091906248';
const region = app.node.tryGetContext('region') || 'us-east-1';

// Environment-specific configurations
const environments = {
  development: {
    amplifyBranch: 'app-runner-deploy',
    databaseBranch: 'br-still-paper-a5tgtem8',
    resourceSuffix: 'dev'
  },
  staging: {
    amplifyBranch: 'staging', 
    databaseBranch: 'br-raspy-sound-a5eg97xu',
    resourceSuffix: 'staging'
  },
  production: {
    amplifyBranch: 'main',
    databaseBranch: 'br-misty-frog-a5pcr9pt', 
    resourceSuffix: 'prod'
  }
};

const envConfig = environments[environment as keyof typeof environments];

if (!envConfig) {
  throw new Error(`Unknown environment: ${environment}. Must be one of: ${Object.keys(environments).join(', ')}`);
}

// GitHub connection ARN from our correct active connection
const githubConnectionArn = 'arn:aws:apprunner:us-east-1:207091906248:connection/nailit-github-connection/23d2ed4413bd4d85be23be027a1d401a';

// Deploy secrets stack first (other stacks depend on it)
const secretsStack = new SecretsStack(app, `Secrets-${envConfig.resourceSuffix}`, {
  env: {
    account: accountId,
    region: region,
  },
  environment: environment,
});

// Deploy main infrastructure stack
new NailItInfrastructureStack(app, `NailIt-${envConfig.resourceSuffix}`, {
  env: {
    account: accountId,
    region: region,
  },
  environment: environment,
  envConfig: envConfig,
});

// Deploy logging infrastructure stack
new LoggingStack(app, `LoggingStack-${envConfig.resourceSuffix}`, {
  env: {
    account: accountId,
    region: region,
  },
  environment: environment,
  envConfig: envConfig,
});

// Deploy App Runner stack with secrets and GitHub connection
new AppRunnerStack(app, `AppRunner-${envConfig.resourceSuffix}`, {
  env: {
    account: accountId,
    region: region,
  },
  environment: environment,
  envConfig: envConfig,
  githubConnectionArn: githubConnectionArn,
  secretArns: {
    databaseSecretArn: secretsStack.databaseSecretArn,
    nextauthSecretArn: secretsStack.nextauthSecretArn,
    nextauthUrlArn: secretsStack.nextauthUrlArn,
    googleClientIdArn: secretsStack.googleClientIdArn,
    googleClientSecretArn: secretsStack.googleClientSecretArn,
    apiKeysSecretArn: secretsStack.apiKeysSecretArn,
  },
});

app.synth(); 