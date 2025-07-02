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
const nailit_infrastructure_stack_1 = require("../lib/nailit-infrastructure-stack");
const logging_stack_1 = require("../lib/logging-stack");
const app_runner_stack_1 = require("../lib/app-runner-stack");
const secrets_stack_1 = require("../lib/secrets-stack");
const ecr_stack_1 = require("../lib/ecr-stack");
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
const envConfig = environments[environment];
if (!envConfig) {
    throw new Error(`Unknown environment: ${environment}. Must be one of: ${Object.keys(environments).join(', ')}`);
}
// GitHub connection ARN from our correct active connection
const githubConnectionArn = 'arn:aws:apprunner:us-east-1:207091906248:connection/nailit-github-connection/23d2ed4413bd4d85be23be027a1d401a';
// Deploy ECR stack first (for Docker images)
const ecrStack = new ecr_stack_1.EcrStack(app, `ECR-${envConfig.resourceSuffix}`, {
    env: {
        account: accountId,
        region: region,
    },
    environment: environment,
    envConfig: envConfig,
});
// Deploy secrets stack (other stacks depend on it)
const secretsStack = new secrets_stack_1.SecretsStack(app, `Secrets-${envConfig.resourceSuffix}`, {
    env: {
        account: accountId,
        region: region,
    },
    environment: environment,
});
// Deploy main infrastructure stack
new nailit_infrastructure_stack_1.NailItInfrastructureStack(app, `NailIt-${envConfig.resourceSuffix}`, {
    env: {
        account: accountId,
        region: region,
    },
    environment: environment,
    envConfig: envConfig,
});
// Deploy logging infrastructure stack
new logging_stack_1.LoggingStack(app, `LoggingStack-${envConfig.resourceSuffix}`, {
    env: {
        account: accountId,
        region: region,
    },
    environment: environment,
    envConfig: envConfig,
});
// Deploy App Runner stack with secrets, GitHub connection, and ECR repository
new app_runner_stack_1.AppRunnerStack(app, `AppRunner-${envConfig.resourceSuffix}`, {
    env: {
        account: accountId,
        region: region,
    },
    environment: environment,
    envConfig: envConfig,
    githubConnectionArn: githubConnectionArn,
    ecrRepositoryUri: ecrStack.repository.repositoryUri,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFpbGl0LWFwcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2Jpbi9uYWlsaXQtYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXFDO0FBQ3JDLGlEQUFtQztBQUNuQyxvRkFBK0U7QUFDL0Usd0RBQW9EO0FBQ3BELDhEQUF5RDtBQUN6RCx3REFBb0Q7QUFDcEQsZ0RBQTRDO0FBRTVDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLDBDQUEwQztBQUMxQyxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxhQUFhLENBQUM7QUFDM0UsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLElBQUksY0FBYyxDQUFDO0FBQ3RFLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLFdBQVcsQ0FBQztBQUUvRCxzQ0FBc0M7QUFDdEMsTUFBTSxZQUFZLEdBQUc7SUFDbkIsV0FBVyxFQUFFO1FBQ1gsYUFBYSxFQUFFLFNBQVM7UUFDeEIsY0FBYyxFQUFFLHlCQUF5QjtRQUN6QyxjQUFjLEVBQUUsS0FBSztLQUN0QjtJQUNELE9BQU8sRUFBRTtRQUNQLGFBQWEsRUFBRSxTQUFTO1FBQ3hCLGNBQWMsRUFBRSx5QkFBeUI7UUFDekMsY0FBYyxFQUFFLFNBQVM7S0FDMUI7SUFDRCxVQUFVLEVBQUU7UUFDVixhQUFhLEVBQUUsTUFBTTtRQUNyQixjQUFjLEVBQUUsd0JBQXdCO1FBQ3hDLGNBQWMsRUFBRSxNQUFNO0tBQ3ZCO0NBQ0YsQ0FBQztBQUVGLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxXQUF3QyxDQUFDLENBQUM7QUFFekUsSUFBSSxDQUFDLFNBQVMsRUFBRTtJQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLFdBQVcscUJBQXFCLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztDQUNqSDtBQUVELDJEQUEyRDtBQUMzRCxNQUFNLG1CQUFtQixHQUFHLCtHQUErRyxDQUFDO0FBRTVJLDZDQUE2QztBQUM3QyxNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsR0FBRyxFQUFFLE9BQU8sU0FBUyxDQUFDLGNBQWMsRUFBRSxFQUFFO0lBQ3BFLEdBQUcsRUFBRTtRQUNILE9BQU8sRUFBRSxTQUFTO1FBQ2xCLE1BQU0sRUFBRSxNQUFNO0tBQ2Y7SUFDRCxXQUFXLEVBQUUsV0FBVztJQUN4QixTQUFTLEVBQUUsU0FBUztDQUNyQixDQUFDLENBQUM7QUFFSCxtREFBbUQ7QUFDbkQsTUFBTSxZQUFZLEdBQUcsSUFBSSw0QkFBWSxDQUFDLEdBQUcsRUFBRSxXQUFXLFNBQVMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtJQUNoRixHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsU0FBUztRQUNsQixNQUFNLEVBQUUsTUFBTTtLQUNmO0lBQ0QsV0FBVyxFQUFFLFdBQVc7Q0FDekIsQ0FBQyxDQUFDO0FBRUgsbUNBQW1DO0FBQ25DLElBQUksdURBQXlCLENBQUMsR0FBRyxFQUFFLFVBQVUsU0FBUyxDQUFDLGNBQWMsRUFBRSxFQUFFO0lBQ3ZFLEdBQUcsRUFBRTtRQUNILE9BQU8sRUFBRSxTQUFTO1FBQ2xCLE1BQU0sRUFBRSxNQUFNO0tBQ2Y7SUFDRCxXQUFXLEVBQUUsV0FBVztJQUN4QixTQUFTLEVBQUUsU0FBUztDQUNyQixDQUFDLENBQUM7QUFFSCxzQ0FBc0M7QUFDdEMsSUFBSSw0QkFBWSxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsU0FBUyxDQUFDLGNBQWMsRUFBRSxFQUFFO0lBQ2hFLEdBQUcsRUFBRTtRQUNILE9BQU8sRUFBRSxTQUFTO1FBQ2xCLE1BQU0sRUFBRSxNQUFNO0tBQ2Y7SUFDRCxXQUFXLEVBQUUsV0FBVztJQUN4QixTQUFTLEVBQUUsU0FBUztDQUNyQixDQUFDLENBQUM7QUFFSCw4RUFBOEU7QUFDOUUsSUFBSSxpQ0FBYyxDQUFDLEdBQUcsRUFBRSxhQUFhLFNBQVMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtJQUMvRCxHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsU0FBUztRQUNsQixNQUFNLEVBQUUsTUFBTTtLQUNmO0lBQ0QsV0FBVyxFQUFFLFdBQVc7SUFDeEIsU0FBUyxFQUFFLFNBQVM7SUFDcEIsbUJBQW1CLEVBQUUsbUJBQW1CO0lBQ3hDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsYUFBYTtJQUNuRCxVQUFVLEVBQUU7UUFDVixpQkFBaUIsRUFBRSxZQUFZLENBQUMsaUJBQWlCO1FBQ2pELGlCQUFpQixFQUFFLFlBQVksQ0FBQyxpQkFBaUI7UUFDakQsY0FBYyxFQUFFLFlBQVksQ0FBQyxjQUFjO1FBQzNDLGlCQUFpQixFQUFFLFlBQVksQ0FBQyxpQkFBaUI7UUFDakQscUJBQXFCLEVBQUUsWUFBWSxDQUFDLHFCQUFxQjtRQUN6RCxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsZ0JBQWdCO0tBQ2hEO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IE5haWxJdEluZnJhc3RydWN0dXJlU3RhY2sgfSBmcm9tICcuLi9saWIvbmFpbGl0LWluZnJhc3RydWN0dXJlLXN0YWNrJztcbmltcG9ydCB7IExvZ2dpbmdTdGFjayB9IGZyb20gJy4uL2xpYi9sb2dnaW5nLXN0YWNrJztcbmltcG9ydCB7IEFwcFJ1bm5lclN0YWNrIH0gZnJvbSAnLi4vbGliL2FwcC1ydW5uZXItc3RhY2snO1xuaW1wb3J0IHsgU2VjcmV0c1N0YWNrIH0gZnJvbSAnLi4vbGliL3NlY3JldHMtc3RhY2snO1xuaW1wb3J0IHsgRWNyU3RhY2sgfSBmcm9tICcuLi9saWIvZWNyLXN0YWNrJztcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuLy8gR2V0IGVudmlyb25tZW50IGZyb20gY29udGV4dCBvciBkZWZhdWx0XG5jb25zdCBlbnZpcm9ubWVudCA9IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgfHwgJ2RldmVsb3BtZW50JztcbmNvbnN0IGFjY291bnRJZCA9IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ2FjY291bnQnKSB8fCAnMjA3MDkxOTA2MjQ4JztcbmNvbnN0IHJlZ2lvbiA9IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ3JlZ2lvbicpIHx8ICd1cy1lYXN0LTEnO1xuXG4vLyBFbnZpcm9ubWVudC1zcGVjaWZpYyBjb25maWd1cmF0aW9uc1xuY29uc3QgZW52aXJvbm1lbnRzID0ge1xuICBkZXZlbG9wbWVudDoge1xuICAgIGFtcGxpZnlCcmFuY2g6ICdkZXZlbG9wJyxcbiAgICBkYXRhYmFzZUJyYW5jaDogJ2JyLXN0aWxsLXBhcGVyLWE1dGd0ZW04JyxcbiAgICByZXNvdXJjZVN1ZmZpeDogJ2RldidcbiAgfSxcbiAgc3RhZ2luZzoge1xuICAgIGFtcGxpZnlCcmFuY2g6ICdzdGFnaW5nJywgXG4gICAgZGF0YWJhc2VCcmFuY2g6ICdici1yYXNweS1zb3VuZC1hNWVnOTd4dScsXG4gICAgcmVzb3VyY2VTdWZmaXg6ICdzdGFnaW5nJ1xuICB9LFxuICBwcm9kdWN0aW9uOiB7XG4gICAgYW1wbGlmeUJyYW5jaDogJ21haW4nLFxuICAgIGRhdGFiYXNlQnJhbmNoOiAnYnItbWlzdHktZnJvZy1hNXBjcjlwdCcsIFxuICAgIHJlc291cmNlU3VmZml4OiAncHJvZCdcbiAgfVxufTtcblxuY29uc3QgZW52Q29uZmlnID0gZW52aXJvbm1lbnRzW2Vudmlyb25tZW50IGFzIGtleW9mIHR5cGVvZiBlbnZpcm9ubWVudHNdO1xuXG5pZiAoIWVudkNvbmZpZykge1xuICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gZW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9LiBNdXN0IGJlIG9uZSBvZjogJHtPYmplY3Qua2V5cyhlbnZpcm9ubWVudHMpLmpvaW4oJywgJyl9YCk7XG59XG5cbi8vIEdpdEh1YiBjb25uZWN0aW9uIEFSTiBmcm9tIG91ciBjb3JyZWN0IGFjdGl2ZSBjb25uZWN0aW9uXG5jb25zdCBnaXRodWJDb25uZWN0aW9uQXJuID0gJ2Fybjphd3M6YXBwcnVubmVyOnVzLWVhc3QtMToyMDcwOTE5MDYyNDg6Y29ubmVjdGlvbi9uYWlsaXQtZ2l0aHViLWNvbm5lY3Rpb24vMjNkMmVkNDQxM2JkNGQ4NWJlMjNiZTAyN2ExZDQwMWEnO1xuXG4vLyBEZXBsb3kgRUNSIHN0YWNrIGZpcnN0IChmb3IgRG9ja2VyIGltYWdlcylcbmNvbnN0IGVjclN0YWNrID0gbmV3IEVjclN0YWNrKGFwcCwgYEVDUi0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH1gLCB7XG4gIGVudjoge1xuICAgIGFjY291bnQ6IGFjY291bnRJZCxcbiAgICByZWdpb246IHJlZ2lvbixcbiAgfSxcbiAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50LFxuICBlbnZDb25maWc6IGVudkNvbmZpZyxcbn0pO1xuXG4vLyBEZXBsb3kgc2VjcmV0cyBzdGFjayAob3RoZXIgc3RhY2tzIGRlcGVuZCBvbiBpdClcbmNvbnN0IHNlY3JldHNTdGFjayA9IG5ldyBTZWNyZXRzU3RhY2soYXBwLCBgU2VjcmV0cy0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH1gLCB7XG4gIGVudjoge1xuICAgIGFjY291bnQ6IGFjY291bnRJZCxcbiAgICByZWdpb246IHJlZ2lvbixcbiAgfSxcbiAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50LFxufSk7XG5cbi8vIERlcGxveSBtYWluIGluZnJhc3RydWN0dXJlIHN0YWNrXG5uZXcgTmFpbEl0SW5mcmFzdHJ1Y3R1cmVTdGFjayhhcHAsIGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9YCwge1xuICBlbnY6IHtcbiAgICBhY2NvdW50OiBhY2NvdW50SWQsXG4gICAgcmVnaW9uOiByZWdpb24sXG4gIH0sXG4gIGVudmlyb25tZW50OiBlbnZpcm9ubWVudCxcbiAgZW52Q29uZmlnOiBlbnZDb25maWcsXG59KTtcblxuLy8gRGVwbG95IGxvZ2dpbmcgaW5mcmFzdHJ1Y3R1cmUgc3RhY2tcbm5ldyBMb2dnaW5nU3RhY2soYXBwLCBgTG9nZ2luZ1N0YWNrLSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fWAsIHtcbiAgZW52OiB7XG4gICAgYWNjb3VudDogYWNjb3VudElkLFxuICAgIHJlZ2lvbjogcmVnaW9uLFxuICB9LFxuICBlbnZpcm9ubWVudDogZW52aXJvbm1lbnQsXG4gIGVudkNvbmZpZzogZW52Q29uZmlnLFxufSk7XG5cbi8vIERlcGxveSBBcHAgUnVubmVyIHN0YWNrIHdpdGggc2VjcmV0cywgR2l0SHViIGNvbm5lY3Rpb24sIGFuZCBFQ1IgcmVwb3NpdG9yeVxubmV3IEFwcFJ1bm5lclN0YWNrKGFwcCwgYEFwcFJ1bm5lci0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH1gLCB7XG4gIGVudjoge1xuICAgIGFjY291bnQ6IGFjY291bnRJZCxcbiAgICByZWdpb246IHJlZ2lvbixcbiAgfSxcbiAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50LFxuICBlbnZDb25maWc6IGVudkNvbmZpZyxcbiAgZ2l0aHViQ29ubmVjdGlvbkFybjogZ2l0aHViQ29ubmVjdGlvbkFybixcbiAgZWNyUmVwb3NpdG9yeVVyaTogZWNyU3RhY2sucmVwb3NpdG9yeS5yZXBvc2l0b3J5VXJpLFxuICBzZWNyZXRBcm5zOiB7XG4gICAgZGF0YWJhc2VTZWNyZXRBcm46IHNlY3JldHNTdGFjay5kYXRhYmFzZVNlY3JldEFybixcbiAgICBuZXh0YXV0aFNlY3JldEFybjogc2VjcmV0c1N0YWNrLm5leHRhdXRoU2VjcmV0QXJuLFxuICAgIG5leHRhdXRoVXJsQXJuOiBzZWNyZXRzU3RhY2submV4dGF1dGhVcmxBcm4sXG4gICAgZ29vZ2xlQ2xpZW50SWRBcm46IHNlY3JldHNTdGFjay5nb29nbGVDbGllbnRJZEFybixcbiAgICBnb29nbGVDbGllbnRTZWNyZXRBcm46IHNlY3JldHNTdGFjay5nb29nbGVDbGllbnRTZWNyZXRBcm4sXG4gICAgYXBpS2V5c1NlY3JldEFybjogc2VjcmV0c1N0YWNrLmFwaUtleXNTZWNyZXRBcm4sXG4gIH0sXG59KTtcblxuYXBwLnN5bnRoKCk7ICJdfQ==