#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../lib/infrastructure-stack';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || 'dev';

// Development Stack
const devStack = new InfrastructureStack(app, `NailIt-${environment}-Stack`, {
  environment: environment,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: `NailIt ${environment} environment infrastructure stack`,
  tags: {
    Application: 'NailIt',
    Environment: environment,
    ManagedBy: 'CDK',
  },
});

// Add tags to all resources in the stack
cdk.Tags.of(devStack).add('Application', 'NailIt');
cdk.Tags.of(devStack).add('Environment', environment);
cdk.Tags.of(devStack).add('ManagedBy', 'CDK');