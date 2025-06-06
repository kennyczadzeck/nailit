#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NailItInfrastructureStack } from '../lib/nailit-infrastructure-stack';
import { LoggingStack } from '../lib/logging-stack';

const app = new cdk.App();

// Get environment from context or default
const environment = app.node.tryGetContext('environment') || 'development';
const accountId = app.node.tryGetContext('account') || '207091906248';
const region = app.node.tryGetContext('region') || 'us-east-1';

// Environment-specific configurations
const environments = {
  development: {
    amplifyBranch: 'develop',
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

app.synth(); 