#!/usr/bin/env node
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
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const amplify_stack_1 = require("../lib/amplify-stack");
const nailit_infrastructure_stack_1 = require("../lib/nailit-infrastructure-stack");
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
const envConfig = environments[targetEnv];
if (!envConfig) {
    throw new Error(`Unknown environment: ${targetEnv}`);
}
// AWS Account and Region
const awsEnv = {
    account: '207091906248',
    region: 'us-east-1',
};
// Deploy Infrastructure Stack (S3, SQS, SNS, etc.)
const infraStack = new nailit_infrastructure_stack_1.NailItInfrastructureStack(app, `NailIt-${envConfig.resourceSuffix}-Stack`, {
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
    const amplifyStack = new amplify_stack_1.AmplifyStack(app, 'NailIt-Amplify-Stack', {
        env: awsEnv,
        repositoryUrl: 'https://github.com/kenny-cfg/nailit',
        accessToken: process.env.GITHUB_ACCESS_TOKEN || 'PLACEHOLDER',
        domainName: 'nailit.dev',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1wbGlmeS1hcHAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9iaW4vYW1wbGlmeS1hcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBcUM7QUFDckMsaURBQW1DO0FBQ25DLHdEQUFvRDtBQUNwRCxvRkFBK0U7QUFFL0UsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsNEJBQTRCO0FBQzVCLE1BQU0sWUFBWSxHQUFHO0lBQ25CLFdBQVcsRUFBRTtRQUNYLFVBQVUsRUFBRSxTQUFTO1FBQ3JCLFNBQVMsRUFBRSxTQUFTO1FBQ3BCLGNBQWMsRUFBRSxLQUFLO1FBQ3JCLGNBQWMsRUFBRSx5QkFBeUI7UUFDekMsb0JBQW9CLEVBQUU7WUFDcEIsWUFBWSxFQUFFLGtIQUFrSDtZQUNoSSxzQkFBc0IsRUFBRSwyR0FBMkc7WUFDbkksZUFBZSxFQUFFLHdCQUF3QjtZQUN6QyxZQUFZLEVBQUUsK0NBQStDO1lBQzdELGdCQUFnQixFQUFFLGlEQUFpRDtZQUNuRSxvQkFBb0IsRUFBRSwyQkFBMkI7WUFDakQsVUFBVSxFQUFFLFdBQVc7U0FDeEI7S0FDRjtJQUNELE9BQU8sRUFBRTtRQUNQLFVBQVUsRUFBRSxTQUFTO1FBQ3JCLFNBQVMsRUFBRSxTQUFTO1FBQ3BCLGNBQWMsRUFBRSxTQUFTO1FBQ3pCLGNBQWMsRUFBRSx5QkFBeUI7UUFDekMsb0JBQW9CLEVBQUU7WUFDcEIsWUFBWSxFQUFFLGtIQUFrSDtZQUNoSSxzQkFBc0IsRUFBRSwyR0FBMkc7WUFDbkksZUFBZSxFQUFFLG9CQUFvQjtZQUNyQyxZQUFZLEVBQUUsK0NBQStDO1lBQzdELGdCQUFnQixFQUFFLGlEQUFpRDtZQUNuRSxvQkFBb0IsRUFBRSx1QkFBdUI7WUFDN0MsVUFBVSxFQUFFLFdBQVc7U0FDeEI7S0FDRjtJQUNELFVBQVUsRUFBRTtRQUNWLFVBQVUsRUFBRSxNQUFN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QzlFO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUVILDBEQUEwRDtJQUMxRCxZQUFZLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0NBQ3hDO0FBRUQseUJBQXlCO0FBQ3pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDMUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBBbXBsaWZ5U3RhY2sgfSBmcm9tICcuLi9saWIvYW1wbGlmeS1zdGFjayc7XG5pbXBvcnQgeyBOYWlsSXRJbmZyYXN0cnVjdHVyZVN0YWNrIH0gZnJvbSAnLi4vbGliL25haWxpdC1pbmZyYXN0cnVjdHVyZS1zdGFjayc7XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbi8vIEVudmlyb25tZW50IGNvbmZpZ3VyYXRpb25cbmNvbnN0IGVudmlyb25tZW50cyA9IHtcbiAgZGV2ZWxvcG1lbnQ6IHtcbiAgICBicmFuY2hOYW1lOiAnZGV2ZWxvcCcsXG4gICAgc3ViZG9tYWluOiAnZGV2ZWxvcCcsXG4gICAgcmVzb3VyY2VTdWZmaXg6ICdkZXYnLFxuICAgIGRhdGFiYXNlQnJhbmNoOiAnYnItc3RpbGwtcGFwZXItYTV0Z3RlbTgnLFxuICAgIGVudmlyb25tZW50VmFyaWFibGVzOiB7XG4gICAgICBEQVRBQkFTRV9VUkw6ICdwb3N0Z3Jlc3FsOi8vbmVvbmRiX293bmVyOlJFREFDVEVEQGVwLXN0aWxsLXBhcGVyLWE1dGd0ZW04LXBvb2xlci51cy1lYXN0LTEuYXdzLm5lb24udGVjaC9uZW9uZGI/c3NsbW9kZT1yZXF1aXJlJyxcbiAgICAgIERBVEFCQVNFX01JR1JBVElPTl9VUkw6ICdwb3N0Z3Jlc3FsOi8vbmVvbmRiX293bmVyOlJFREFDVEVEQGVwLXN0aWxsLXBhcGVyLWE1dGd0ZW04LnVzLWVhc3QtMS5hd3MubmVvbi50ZWNoL25lb25kYj9zc2xtb2RlPXJlcXVpcmUnLFxuICAgICAgTkVYVEFVVEhfU0VDUkVUOiAnZGV2ZWxvcG1lbnQtc2VjcmV0LWtleScsXG4gICAgICBORVhUQVVUSF9VUkw6ICdodHRwczovL2RldmVsb3AuZDFycTBrOWpzNWx3ZzMuYW1wbGlmeWFwcC5jb20nLFxuICAgICAgR09PR0xFX0NMSUVOVF9JRDogJzEwNDUxMjc2NjIyNjUtYWJjMTIzLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tJyxcbiAgICAgIEdPT0dMRV9DTElFTlRfU0VDUkVUOiAnZGV2ZWxvcG1lbnQtY2xpZW50LXNlY3JldCcsXG4gICAgICBBV1NfUkVHSU9OOiAndXMtZWFzdC0xJyxcbiAgICB9LFxuICB9LFxuICBzdGFnaW5nOiB7XG4gICAgYnJhbmNoTmFtZTogJ3N0YWdpbmcnLCBcbiAgICBzdWJkb21haW46ICdzdGFnaW5nJyxcbiAgICByZXNvdXJjZVN1ZmZpeDogJ3N0YWdpbmcnLFxuICAgIGRhdGFiYXNlQnJhbmNoOiAnYnItcmFzcHktc291bmQtYTVlZzk3eHUnLFxuICAgIGVudmlyb25tZW50VmFyaWFibGVzOiB7XG4gICAgICBEQVRBQkFTRV9VUkw6ICdwb3N0Z3Jlc3FsOi8vbmVvbmRiX293bmVyOlJFREFDVEVEQGVwLXJhc3B5LXNvdW5kLWE1ZWc5N3h1LXBvb2xlci51cy1lYXN0LTEuYXdzLm5lb24udGVjaC9uZW9uZGI/c3NsbW9kZT1yZXF1aXJlJyxcbiAgICAgIERBVEFCQVNFX01JR1JBVElPTl9VUkw6ICdwb3N0Z3Jlc3FsOi8vbmVvbmRiX293bmVyOlJFREFDVEVEQGVwLXJhc3B5LXNvdW5kLWE1ZWc5N3h1LnVzLWVhc3QtMS5hd3MubmVvbi50ZWNoL25lb25kYj9zc2xtb2RlPXJlcXVpcmUnLCBcbiAgICAgIE5FWFRBVVRIX1NFQ1JFVDogJ3N0YWdpbmctc2VjcmV0LWtleScsXG4gICAgICBORVhUQVVUSF9VUkw6ICdodHRwczovL3N0YWdpbmcuZDFycTBrOWpzNWx3ZzMuYW1wbGlmeWFwcC5jb20nLFxuICAgICAgR09PR0xFX0NMSUVOVF9JRDogJzEwNDUxMjc2NjIyNjUtYWJjMTIzLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tJyxcbiAgICAgIEdPT0dMRV9DTElFTlRfU0VDUkVUOiAnc3RhZ2luZy1jbGllbnQtc2VjcmV0JywgXG4gICAgICBBV1NfUkVHSU9OOiAndXMtZWFzdC0xJyxcbiAgICB9LFxuICB9LFxuICBwcm9kdWN0aW9uOiB7XG4gICAgYnJhbmNoTmFtZTogJ21haW4nLFxuICAgIHN1YmRvbWFpbjogJ2FwcCcsIFxuICAgIHJlc291cmNlU3VmZml4OiAncHJvZCcsXG4gICAgZGF0YWJhc2VCcmFuY2g6ICdici1taXN0eS1mcm9nLWE1cGNyOXB0JyxcbiAgICBlbnZpcm9ubWVudFZhcmlhYmxlczoge1xuICAgICAgREFUQUJBU0VfVVJMOiAncG9zdGdyZXNxbDovL25lb25kYl9vd25lcjpSRURBQ1RFREBlcC1taXN0eS1mcm9nLWE1cGNyOXB0LXBvb2xlci51cy1lYXN0LTEuYXdzLm5lb24udGVjaC9uZW9uZGI/c3NsbW9kZT1yZXF1aXJlJyxcbiAgICAgIERBVEFCQVNFX01JR1JBVElPTl9VUkw6ICdwb3N0Z3Jlc3FsOi8vbmVvbmRiX293bmVyOlJFREFDVEVEQGVwLW1pc3R5LWZyb2ctYTVwY3I5cHQudXMtZWFzdC0xLmF3cy5uZW9uLnRlY2gvbmVvbmRiP3NzbG1vZGU9cmVxdWlyZScsXG4gICAgICBORVhUQVVUSF9TRUNSRVQ6ICdwcm9kdWN0aW9uLXNlY3JldC1rZXknLFxuICAgICAgTkVYVEFVVEhfVVJMOiAnaHR0cHM6Ly9hcHAubmFpbGl0LmRldicsIFxuICAgICAgR09PR0xFX0NMSUVOVF9JRDogJzEwNDUxMjc2NjIyNjUtYWJjMTIzLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tJyxcbiAgICAgIEdPT0dMRV9DTElFTlRfU0VDUkVUOiAncHJvZHVjdGlvbi1jbGllbnQtc2VjcmV0JyxcbiAgICAgIEFXU19SRUdJT046ICd1cy1lYXN0LTEnLFxuICAgIH0sXG4gIH0sXG59O1xuXG5jb25zdCB0YXJnZXRFbnYgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpIHx8ICdkZXZlbG9wbWVudCc7XG5jb25zdCBlbnZDb25maWcgPSBlbnZpcm9ubWVudHNbdGFyZ2V0RW52IGFzIGtleW9mIHR5cGVvZiBlbnZpcm9ubWVudHNdO1xuXG5pZiAoIWVudkNvbmZpZykge1xuICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gZW52aXJvbm1lbnQ6ICR7dGFyZ2V0RW52fWApO1xufVxuXG4vLyBBV1MgQWNjb3VudCBhbmQgUmVnaW9uXG5jb25zdCBhd3NFbnYgPSB7XG4gIGFjY291bnQ6ICcyMDcwOTE5MDYyNDgnLFxuICByZWdpb246ICd1cy1lYXN0LTEnLFxufTtcblxuLy8gRGVwbG95IEluZnJhc3RydWN0dXJlIFN0YWNrIChTMywgU1FTLCBTTlMsIGV0Yy4pXG5jb25zdCBpbmZyYVN0YWNrID0gbmV3IE5haWxJdEluZnJhc3RydWN0dXJlU3RhY2soYXBwLCBgTmFpbEl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fS1TdGFja2AsIHtcbiAgZW52OiBhd3NFbnYsXG4gIGVudmlyb25tZW50OiB0YXJnZXRFbnYsXG4gIGVudkNvbmZpZzoge1xuICAgIGFtcGxpZnlCcmFuY2g6IGVudkNvbmZpZy5icmFuY2hOYW1lLFxuICAgIGRhdGFiYXNlQnJhbmNoOiBlbnZDb25maWcuZGF0YWJhc2VCcmFuY2gsXG4gICAgcmVzb3VyY2VTdWZmaXg6IGVudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeCxcbiAgfSxcbn0pO1xuXG4vLyBEZXBsb3kgQW1wbGlmeSBTdGFjayAoaWYgZGVwbG95aW5nIGFsbCBlbnZpcm9ubWVudHMgYXQgb25jZSlcbmlmICh0YXJnZXRFbnYgPT09ICdhbGwnKSB7XG4gIC8vIERlcGxveSBjb21wbGV0ZSBBbXBsaWZ5IGNvbmZpZ3VyYXRpb24gd2l0aCBhbGwgZW52aXJvbm1lbnRzXG4gIGNvbnN0IGFtcGxpZnlTdGFjayA9IG5ldyBBbXBsaWZ5U3RhY2soYXBwLCAnTmFpbEl0LUFtcGxpZnktU3RhY2snLCB7XG4gICAgZW52OiBhd3NFbnYsXG4gICAgcmVwb3NpdG9yeVVybDogJ2h0dHBzOi8vZ2l0aHViLmNvbS9rZW5ueS1jZmcvbmFpbGl0JyxcbiAgICBhY2Nlc3NUb2tlbjogcHJvY2Vzcy5lbnYuR0lUSFVCX0FDQ0VTU19UT0tFTiB8fCAnUExBQ0VIT0xERVInLCAvLyBTZXQgaW4gQ0kvQ0RcbiAgICBkb21haW5OYW1lOiAnbmFpbGl0LmRldicsIC8vIE9wdGlvbmFsOiBzZXQgeW91ciBjdXN0b20gZG9tYWluXG4gICAgZW52aXJvbm1lbnRzOiB7XG4gICAgICBkZXZlbG9wbWVudDoge1xuICAgICAgICBicmFuY2hOYW1lOiBlbnZpcm9ubWVudHMuZGV2ZWxvcG1lbnQuYnJhbmNoTmFtZSxcbiAgICAgICAgc3ViZG9tYWluOiBlbnZpcm9ubWVudHMuZGV2ZWxvcG1lbnQuc3ViZG9tYWluLFxuICAgICAgICBlbnZpcm9ubWVudFZhcmlhYmxlczoge1xuICAgICAgICAgIC4uLmVudmlyb25tZW50cy5kZXZlbG9wbWVudC5lbnZpcm9ubWVudFZhcmlhYmxlcyxcbiAgICAgICAgICAvLyBBZGQgaW5mcmFzdHJ1Y3R1cmUgb3V0cHV0cyBkeW5hbWljYWxseVxuICAgICAgICAgIEFXU19TM19CVUNLRVQ6IGBuYWlsaXQtZGV2LWVtYWlscy0yMDcwOTE5MDYyNDhgLFxuICAgICAgICAgIEFXU19TUVNfRU1BSUxfUVVFVUU6IGBodHRwczovL3Nxcy51cy1lYXN0LTEuYW1hem9uYXdzLmNvbS8yMDcwOTE5MDYyNDgvbmFpbGl0LWRldi1lbWFpbC1xdWV1ZWAsXG4gICAgICAgICAgQVdTX1NOU19UT1BJQzogYGFybjphd3M6c25zOnVzLWVhc3QtMToyMDcwOTE5MDYyNDg6bmFpbGl0LWRldi1ub3RpZmljYXRpb25zYCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBzdGFnaW5nOiB7XG4gICAgICAgIGJyYW5jaE5hbWU6IGVudmlyb25tZW50cy5zdGFnaW5nLmJyYW5jaE5hbWUsXG4gICAgICAgIHN1YmRvbWFpbjogZW52aXJvbm1lbnRzLnN0YWdpbmcuc3ViZG9tYWluLFxuICAgICAgICBlbnZpcm9ubWVudFZhcmlhYmxlczoge1xuICAgICAgICAgIC4uLmVudmlyb25tZW50cy5zdGFnaW5nLmVudmlyb25tZW50VmFyaWFibGVzLFxuICAgICAgICAgIEFXU19TM19CVUNLRVQ6IGBuYWlsaXQtc3RhZ2luZy1lbWFpbHMtMjA3MDkxOTA2MjQ4YCxcbiAgICAgICAgICBBV1NfU1FTX0VNQUlMX1FVRVVFOiBgaHR0cHM6Ly9zcXMudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vMjA3MDkxOTA2MjQ4L25haWxpdC1zdGFnaW5nLWVtYWlsLXF1ZXVlYCxcbiAgICAgICAgICBBV1NfU05TX1RPUElDOiBgYXJuOmF3czpzbnM6dXMtZWFzdC0xOjIwNzA5MTkwNjI0ODpuYWlsaXQtc3RhZ2luZy1ub3RpZmljYXRpb25zYCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgIGJyYW5jaE5hbWU6IGVudmlyb25tZW50cy5wcm9kdWN0aW9uLmJyYW5jaE5hbWUsXG4gICAgICAgIHN1YmRvbWFpbjogZW52aXJvbm1lbnRzLnByb2R1Y3Rpb24uc3ViZG9tYWluLFxuICAgICAgICBlbnZpcm9ubWVudFZhcmlhYmxlczoge1xuICAgICAgICAgIC4uLmVudmlyb25tZW50cy5wcm9kdWN0aW9uLmVudmlyb25tZW50VmFyaWFibGVzLFxuICAgICAgICAgIEFXU19TM19CVUNLRVQ6IGBuYWlsaXQtcHJvZC1lbWFpbHMtMjA3MDkxOTA2MjQ4YCxcbiAgICAgICAgICBBV1NfU1FTX0VNQUlMX1FVRVVFOiBgaHR0cHM6Ly9zcXMudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vMjA3MDkxOTA2MjQ4L25haWxpdC1wcm9kLWVtYWlsLXF1ZXVlYCxcbiAgICAgICAgICBBV1NfU05TX1RPUElDOiBgYXJuOmF3czpzbnM6dXMtZWFzdC0xOjIwNzA5MTkwNjI0ODpuYWlsaXQtcHJvZC1ub3RpZmljYXRpb25zYCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG5cbiAgLy8gRW5zdXJlIGluZnJhc3RydWN0dXJlIHN0YWNrcyBhcmUgY3JlYXRlZCBiZWZvcmUgQW1wbGlmeVxuICBhbXBsaWZ5U3RhY2suYWRkRGVwZW5kZW5jeShpbmZyYVN0YWNrKTtcbn1cblxuLy8gQWRkIHRhZ3MgdG8gYWxsIHN0YWNrc1xuY2RrLlRhZ3Mub2YoYXBwKS5hZGQoJ1Byb2plY3QnLCAnTmFpbEl0Jyk7XG5jZGsuVGFncy5vZihhcHApLmFkZCgnTWFuYWdlZEJ5JywgJ0NESycpOyAiXX0=