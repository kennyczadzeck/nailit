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
new nailit_infrastructure_stack_1.NailItInfrastructureStack(app, `NailIt-${envConfig.resourceSuffix}`, {
    env: {
        account: accountId,
        region: region,
    },
    environment: environment,
    envConfig: envConfig,
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFpbGl0LWFwcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2Jpbi9uYWlsaXQtYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXFDO0FBQ3JDLGlEQUFtQztBQUNuQyxvRkFBK0U7QUFFL0UsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsMENBQTBDO0FBQzFDLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLGFBQWEsQ0FBQztBQUMzRSxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxjQUFjLENBQUM7QUFDdEUsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksV0FBVyxDQUFDO0FBRS9ELHNDQUFzQztBQUN0QyxNQUFNLFlBQVksR0FBRztJQUNuQixXQUFXLEVBQUU7UUFDWCxhQUFhLEVBQUUsU0FBUztRQUN4QixjQUFjLEVBQUUseUJBQXlCO1FBQ3pDLGNBQWMsRUFBRSxLQUFLO0tBQ3RCO0lBQ0QsT0FBTyxFQUFFO1FBQ1AsYUFBYSxFQUFFLFNBQVM7UUFDeEIsY0FBYyxFQUFFLHlCQUF5QjtRQUN6QyxjQUFjLEVBQUUsU0FBUztLQUMxQjtJQUNELFVBQVUsRUFBRTtRQUNWLGFBQWEsRUFBRSxNQUFNO1FBQ3JCLGNBQWMsRUFBRSx3QkFBd0I7UUFDeEMsY0FBYyxFQUFFLE1BQU07S0FDdkI7Q0FDRixDQUFDO0FBRUYsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLFdBQXdDLENBQUMsQ0FBQztBQUV6RSxJQUFJLENBQUMsU0FBUyxFQUFFO0lBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsV0FBVyxxQkFBcUIsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ2pIO0FBRUQsSUFBSSx1REFBeUIsQ0FBQyxHQUFHLEVBQUUsVUFBVSxTQUFTLENBQUMsY0FBYyxFQUFFLEVBQUU7SUFDdkUsR0FBRyxFQUFFO1FBQ0gsT0FBTyxFQUFFLFNBQVM7UUFDbEIsTUFBTSxFQUFFLE1BQU07S0FDZjtJQUNELFdBQVcsRUFBRSxXQUFXO0lBQ3hCLFNBQVMsRUFBRSxTQUFTO0NBQ3JCLENBQUMsQ0FBQztBQUVILEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBOYWlsSXRJbmZyYXN0cnVjdHVyZVN0YWNrIH0gZnJvbSAnLi4vbGliL25haWxpdC1pbmZyYXN0cnVjdHVyZS1zdGFjayc7XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbi8vIEdldCBlbnZpcm9ubWVudCBmcm9tIGNvbnRleHQgb3IgZGVmYXVsdFxuY29uc3QgZW52aXJvbm1lbnQgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpIHx8ICdkZXZlbG9wbWVudCc7XG5jb25zdCBhY2NvdW50SWQgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdhY2NvdW50JykgfHwgJzIwNzA5MTkwNjI0OCc7XG5jb25zdCByZWdpb24gPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdyZWdpb24nKSB8fCAndXMtZWFzdC0xJztcblxuLy8gRW52aXJvbm1lbnQtc3BlY2lmaWMgY29uZmlndXJhdGlvbnNcbmNvbnN0IGVudmlyb25tZW50cyA9IHtcbiAgZGV2ZWxvcG1lbnQ6IHtcbiAgICBhbXBsaWZ5QnJhbmNoOiAnZGV2ZWxvcCcsXG4gICAgZGF0YWJhc2VCcmFuY2g6ICdici1zdGlsbC1wYXBlci1hNXRndGVtOCcsXG4gICAgcmVzb3VyY2VTdWZmaXg6ICdkZXYnXG4gIH0sXG4gIHN0YWdpbmc6IHtcbiAgICBhbXBsaWZ5QnJhbmNoOiAnc3RhZ2luZycsIFxuICAgIGRhdGFiYXNlQnJhbmNoOiAnYnItcmFzcHktc291bmQtYTVlZzk3eHUnLFxuICAgIHJlc291cmNlU3VmZml4OiAnc3RhZ2luZydcbiAgfSxcbiAgcHJvZHVjdGlvbjoge1xuICAgIGFtcGxpZnlCcmFuY2g6ICdtYWluJyxcbiAgICBkYXRhYmFzZUJyYW5jaDogJ2JyLW1pc3R5LWZyb2ctYTVwY3I5cHQnLCBcbiAgICByZXNvdXJjZVN1ZmZpeDogJ3Byb2QnXG4gIH1cbn07XG5cbmNvbnN0IGVudkNvbmZpZyA9IGVudmlyb25tZW50c1tlbnZpcm9ubWVudCBhcyBrZXlvZiB0eXBlb2YgZW52aXJvbm1lbnRzXTtcblxuaWYgKCFlbnZDb25maWcpIHtcbiAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGVudmlyb25tZW50OiAke2Vudmlyb25tZW50fS4gTXVzdCBiZSBvbmUgb2Y6ICR7T2JqZWN0LmtleXMoZW52aXJvbm1lbnRzKS5qb2luKCcsICcpfWApO1xufVxuXG5uZXcgTmFpbEl0SW5mcmFzdHJ1Y3R1cmVTdGFjayhhcHAsIGBOYWlsSXQtJHtlbnZDb25maWcucmVzb3VyY2VTdWZmaXh9YCwge1xuICBlbnY6IHtcbiAgICBhY2NvdW50OiBhY2NvdW50SWQsXG4gICAgcmVnaW9uOiByZWdpb24sXG4gIH0sXG4gIGVudmlyb25tZW50OiBlbnZpcm9ubWVudCxcbiAgZW52Q29uZmlnOiBlbnZDb25maWcsXG59KTtcblxuYXBwLnN5bnRoKCk7ICJdfQ==