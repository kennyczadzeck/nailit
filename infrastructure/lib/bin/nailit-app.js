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
// Deploy App Runner stack
new app_runner_stack_1.AppRunnerStack(app, `AppRunner-${envConfig.resourceSuffix}`, {
    env: {
        account: accountId,
        region: region,
    },
    environment: environment,
    envConfig: envConfig,
    githubConnectionArn: app.node.tryGetContext('githubConnectionArn'),
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFpbGl0LWFwcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2Jpbi9uYWlsaXQtYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXFDO0FBQ3JDLGlEQUFtQztBQUNuQyxvRkFBK0U7QUFDL0Usd0RBQW9EO0FBQ3BELDhEQUF5RDtBQUV6RCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUUxQiwwQ0FBMEM7QUFDMUMsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksYUFBYSxDQUFDO0FBQzNFLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGNBQWMsQ0FBQztBQUN0RSxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsSUFBSSxXQUFXLENBQUM7QUFFL0Qsc0NBQXNDO0FBQ3RDLE1BQU0sWUFBWSxHQUFHO0lBQ25CLFdBQVcsRUFBRTtRQUNYLGFBQWEsRUFBRSxTQUFTO1FBQ3hCLGNBQWMsRUFBRSx5QkFBeUI7UUFDekMsY0FBYyxFQUFFLEtBQUs7S0FDdEI7SUFDRCxPQUFPLEVBQUU7UUFDUCxhQUFhLEVBQUUsU0FBUztRQUN4QixjQUFjLEVBQUUseUJBQXlCO1FBQ3pDLGNBQWMsRUFBRSxTQUFTO0tBQzFCO0lBQ0QsVUFBVSxFQUFFO1FBQ1YsYUFBYSxFQUFFLE1BQU07UUFDckIsY0FBYyxFQUFFLHdCQUF3QjtRQUN4QyxjQUFjLEVBQUUsTUFBTTtLQUN2QjtDQUNGLENBQUM7QUFFRixNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsV0FBd0MsQ0FBQyxDQUFDO0FBRXpFLElBQUksQ0FBQyxTQUFTLEVBQUU7SUFDZCxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixXQUFXLHFCQUFxQixNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Q0FDakg7QUFFRCxtQ0FBbUM7QUFDbkMsSUFBSSx1REFBeUIsQ0FBQyxHQUFHLEVBQUUsVUFBVSxTQUFTLENBQUMsY0FBYyxFQUFFLEVBQUU7SUFDdkUsR0FBRyxFQUFFO1FBQ0gsT0FBTyxFQUFFLFNBQVM7UUFDbEIsTUFBTSxFQUFFLE1BQU07S0FDZjtJQUNELFdBQVcsRUFBRSxXQUFXO0lBQ3hCLFNBQVMsRUFBRSxTQUFTO0NBQ3JCLENBQUMsQ0FBQztBQUVILHNDQUFzQztBQUN0QyxJQUFJLDRCQUFZLENBQUMsR0FBRyxFQUFFLGdCQUFnQixTQUFTLENBQUMsY0FBYyxFQUFFLEVBQUU7SUFDaEUsR0FBRyxFQUFFO1FBQ0gsT0FBTyxFQUFFLFNBQVM7UUFDbEIsTUFBTSxFQUFFLE1BQU07S0FDZjtJQUNELFdBQVcsRUFBRSxXQUFXO0lBQ3hCLFNBQVMsRUFBRSxTQUFTO0NBQ3JCLENBQUMsQ0FBQztBQUVILDBCQUEwQjtBQUMxQixJQUFJLGlDQUFjLENBQUMsR0FBRyxFQUFFLGFBQWEsU0FBUyxDQUFDLGNBQWMsRUFBRSxFQUFFO0lBQy9ELEdBQUcsRUFBRTtRQUNILE9BQU8sRUFBRSxTQUFTO1FBQ2xCLE1BQU0sRUFBRSxNQUFNO0tBQ2Y7SUFDRCxXQUFXLEVBQUUsV0FBVztJQUN4QixTQUFTLEVBQUUsU0FBUztJQUNwQixtQkFBbUIsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQztDQUNuRSxDQUFDLENBQUM7QUFFSCxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgTmFpbEl0SW5mcmFzdHJ1Y3R1cmVTdGFjayB9IGZyb20gJy4uL2xpYi9uYWlsaXQtaW5mcmFzdHJ1Y3R1cmUtc3RhY2snO1xuaW1wb3J0IHsgTG9nZ2luZ1N0YWNrIH0gZnJvbSAnLi4vbGliL2xvZ2dpbmctc3RhY2snO1xuaW1wb3J0IHsgQXBwUnVubmVyU3RhY2sgfSBmcm9tICcuLi9saWIvYXBwLXJ1bm5lci1zdGFjayc7XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbi8vIEdldCBlbnZpcm9ubWVudCBmcm9tIGNvbnRleHQgb3IgZGVmYXVsdFxuY29uc3QgZW52aXJvbm1lbnQgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpIHx8ICdkZXZlbG9wbWVudCc7XG5jb25zdCBhY2NvdW50SWQgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdhY2NvdW50JykgfHwgJzIwNzA5MTkwNjI0OCc7XG5jb25zdCByZWdpb24gPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdyZWdpb24nKSB8fCAndXMtZWFzdC0xJztcblxuLy8gRW52aXJvbm1lbnQtc3BlY2lmaWMgY29uZmlndXJhdGlvbnNcbmNvbnN0IGVudmlyb25tZW50cyA9IHtcbiAgZGV2ZWxvcG1lbnQ6IHtcbiAgICBhbXBsaWZ5QnJhbmNoOiAnZGV2ZWxvcCcsXG4gICAgZGF0YWJhc2VCcmFuY2g6ICdici1zdGlsbC1wYXBlci1hNXRndGVtOCcsXG4gICAgcmVzb3VyY2VTdWZmaXg6ICdkZXYnXG4gIH0sXG4gIHN0YWdpbmc6IHtcbiAgICBhbXBsaWZ5QnJhbmNoOiAnc3RhZ2luZycsIFxuICAgIGRhdGFiYXNlQnJhbmNoOiAnYnItcmFzcHktc291bmQtYTVlZzk3eHUnLFxuICAgIHJlc291cmNlU3VmZml4OiAnc3RhZ2luZydcbiAgfSxcbiAgcHJvZHVjdGlvbjoge1xuICAgIGFtcGxpZnlCcmFuY2g6ICdtYWluJyxcbiAgICBkYXRhYmFzZUJyYW5jaDogJ2JyLW1pc3R5LWZyb2ctYTVwY3I5cHQnLCBcbiAgICByZXNvdXJjZVN1ZmZpeDogJ3Byb2QnXG4gIH1cbn07XG5cbmNvbnN0IGVudkNvbmZpZyA9IGVudmlyb25tZW50c1tlbnZpcm9ubWVudCBhcyBrZXlvZiB0eXBlb2YgZW52aXJvbm1lbnRzXTtcblxuaWYgKCFlbnZDb25maWcpIHtcbiAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGVudmlyb25tZW50OiAke2Vudmlyb25tZW50fS4gTXVzdCBiZSBvbmUgb2Y6ICR7T2JqZWN0LmtleXMoZW52aXJvbm1lbnRzKS5qb2luKCcsICcpfWApO1xufVxuXG4vLyBEZXBsb3kgbWFpbiBpbmZyYXN0cnVjdHVyZSBzdGFja1xubmV3IE5haWxJdEluZnJhc3RydWN0dXJlU3RhY2soYXBwLCBgTmFpbEl0LSR7ZW52Q29uZmlnLnJlc291cmNlU3VmZml4fWAsIHtcbiAgZW52OiB7XG4gICAgYWNjb3VudDogYWNjb3VudElkLFxuICAgIHJlZ2lvbjogcmVnaW9uLFxuICB9LFxuICBlbnZpcm9ubWVudDogZW52aXJvbm1lbnQsXG4gIGVudkNvbmZpZzogZW52Q29uZmlnLFxufSk7XG5cbi8vIERlcGxveSBsb2dnaW5nIGluZnJhc3RydWN0dXJlIHN0YWNrXG5uZXcgTG9nZ2luZ1N0YWNrKGFwcCwgYExvZ2dpbmdTdGFjay0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH1gLCB7XG4gIGVudjoge1xuICAgIGFjY291bnQ6IGFjY291bnRJZCxcbiAgICByZWdpb246IHJlZ2lvbixcbiAgfSxcbiAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50LFxuICBlbnZDb25maWc6IGVudkNvbmZpZyxcbn0pO1xuXG4vLyBEZXBsb3kgQXBwIFJ1bm5lciBzdGFja1xubmV3IEFwcFJ1bm5lclN0YWNrKGFwcCwgYEFwcFJ1bm5lci0ke2VudkNvbmZpZy5yZXNvdXJjZVN1ZmZpeH1gLCB7XG4gIGVudjoge1xuICAgIGFjY291bnQ6IGFjY291bnRJZCxcbiAgICByZWdpb246IHJlZ2lvbixcbiAgfSxcbiAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50LFxuICBlbnZDb25maWc6IGVudkNvbmZpZyxcbiAgZ2l0aHViQ29ubmVjdGlvbkFybjogYXBwLm5vZGUudHJ5R2V0Q29udGV4dCgnZ2l0aHViQ29ubmVjdGlvbkFybicpLFxufSk7XG5cbmFwcC5zeW50aCgpOyAiXX0=