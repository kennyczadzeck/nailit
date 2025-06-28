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
exports.SecretsStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
class SecretsStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Environment-specific configuration
        const envConfigs = {
            development: {
                databaseUrl: 'postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
                nextauthUrl: 'https://d3pvc5dn43.us-east-1.awsapprunner.com',
            },
            staging: {
                databaseUrl: 'postgresql://neondb_owner:npg_avELx8uqOAc0@ep-raspy-sound-a5eg97xu-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
                nextauthUrl: 'https://ubfybdadun.us-east-1.awsapprunner.com',
            },
            production: {
                databaseUrl: 'postgresql://neondb_owner:npg_avELx8uqOAc0@ep-misty-frog-a5pcr9pt-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
                nextauthUrl: 'https://ijj2mc7dhz.us-east-1.awsapprunner.com',
            },
        };
        const config = envConfigs[props.environment];
        if (!config) {
            throw new Error(`Unknown environment: ${props.environment}. Must be one of: ${Object.keys(envConfigs).join(', ')}`);
        }
        // Database credentials secret
        const databaseSecret = new secretsmanager.Secret(this, 'DatabaseCredentials', {
            secretName: `nailit-database-${props.environment}`,
            description: 'Database connection string for NailIt application',
            secretStringValue: cdk.SecretValue.unsafePlainText(config.databaseUrl),
        });
        // Individual secrets for better App Runner compatibility
        const nextauthSecret = new secretsmanager.Secret(this, 'NextAuthSecret', {
            secretName: `nailit-nextauth-secret-${props.environment}`,
            description: 'NextAuth secret for NailIt application',
            secretStringValue: cdk.SecretValue.unsafePlainText('+hP31rrZgohD7u3uHr/ASb1WE9j3MYjxHtTBmaaU+3M='),
        });
        const nextauthUrl = new secretsmanager.Secret(this, 'NextAuthUrl', {
            secretName: `nailit-nextauth-url-${props.environment}`,
            description: 'NextAuth URL for NailIt application',
            secretStringValue: cdk.SecretValue.unsafePlainText(config.nextauthUrl),
        });
        const googleClientId = new secretsmanager.Secret(this, 'GoogleClientId', {
            secretName: `nailit-google-client-id-${props.environment}`,
            description: 'Google OAuth Client ID for NailIt application',
            secretStringValue: cdk.SecretValue.unsafePlainText('442433418686-sahpnrfagrs9lfs1pdee2m06e4g2ukdc.apps.googleusercontent.com'),
        });
        const googleClientSecret = new secretsmanager.Secret(this, 'GoogleClientSecret', {
            secretName: `nailit-google-client-secret-${props.environment}`,
            description: 'Google OAuth Client Secret for NailIt application',
            secretStringValue: cdk.SecretValue.unsafePlainText('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'),
        });
        const apiKeysSecret = new secretsmanager.Secret(this, 'ApiKeys', {
            secretName: `nailit-google-maps-api-key-${props.environment}`,
            description: 'Google Maps API key for NailIt application',
            secretStringValue: cdk.SecretValue.unsafePlainText('AIzaSyDCLRbf1Nf6NxV4PqO_92-q1wE1rCNOaw0'),
        });
        // Export ARNs for use in App Runner stack
        this.databaseSecretArn = databaseSecret.secretArn;
        this.nextauthSecretArn = nextauthSecret.secretArn;
        this.nextauthUrlArn = nextauthUrl.secretArn;
        this.googleClientIdArn = googleClientId.secretArn;
        this.googleClientSecretArn = googleClientSecret.secretArn;
        this.apiKeysSecretArn = apiKeysSecret.secretArn;
        // Output the ARNs
        new cdk.CfnOutput(this, 'DatabaseSecretArn', {
            value: this.databaseSecretArn,
            description: 'ARN of the database credentials secret',
        });
        new cdk.CfnOutput(this, 'NextAuthSecretArn', {
            value: this.nextauthSecretArn,
            description: 'ARN of the NextAuth secret',
        });
        new cdk.CfnOutput(this, 'NextAuthUrlArn', {
            value: this.nextauthUrlArn,
            description: 'ARN of the NextAuth URL secret',
        });
        new cdk.CfnOutput(this, 'GoogleClientIdArn', {
            value: this.googleClientIdArn,
            description: 'ARN of the Google Client ID secret',
        });
        new cdk.CfnOutput(this, 'GoogleClientSecretArn', {
            value: this.googleClientSecretArn,
            description: 'ARN of the Google Client Secret',
        });
        new cdk.CfnOutput(this, 'ApiKeysSecretArn', {
            value: this.apiKeysSecretArn,
            description: 'ARN of the API keys secret',
        });
    }
}
exports.SecretsStack = SecretsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NlY3JldHMtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0VBQWlFO0FBT2pFLE1BQWEsWUFBYSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBUXpDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBd0I7UUFDaEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIscUNBQXFDO1FBQ3JDLE1BQU0sVUFBVSxHQUFHO1lBQ2pCLFdBQVcsRUFBRTtnQkFDWCxXQUFXLEVBQUUsMEhBQTBIO2dCQUN2SSxXQUFXLEVBQUUsK0NBQStDO2FBQzdEO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLFdBQVcsRUFBRSwwSEFBMEg7Z0JBQ3ZJLFdBQVcsRUFBRSwrQ0FBK0M7YUFDN0Q7WUFDRCxVQUFVLEVBQUU7Z0JBQ1YsV0FBVyxFQUFFLHlIQUF5SDtnQkFDdEksV0FBVyxFQUFFLCtDQUErQzthQUM3RDtTQUNGLENBQUM7UUFFRixNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLFdBQXNDLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsS0FBSyxDQUFDLFdBQVcscUJBQXFCLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNySDtRQUVELDhCQUE4QjtRQUM5QixNQUFNLGNBQWMsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzVFLFVBQVUsRUFBRSxtQkFBbUIsS0FBSyxDQUFDLFdBQVcsRUFBRTtZQUNsRCxXQUFXLEVBQUUsbURBQW1EO1lBQ2hFLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7U0FDdkUsQ0FBQyxDQUFDO1FBRUgseURBQXlEO1FBQ3pELE1BQU0sY0FBYyxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDdkUsVUFBVSxFQUFFLDBCQUEwQixLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3pELFdBQVcsRUFBRSx3Q0FBd0M7WUFDckQsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsOENBQThDLENBQUM7U0FDbkcsQ0FBQyxDQUFDO1FBRUgsTUFBTSxXQUFXLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDakUsVUFBVSxFQUFFLHVCQUF1QixLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3RELFdBQVcsRUFBRSxxQ0FBcUM7WUFDbEQsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQztTQUN2RSxDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3ZFLFVBQVUsRUFBRSwyQkFBMkIsS0FBSyxDQUFDLFdBQVcsRUFBRTtZQUMxRCxXQUFXLEVBQUUsK0NBQStDO1lBQzVELGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLDBFQUEwRSxDQUFDO1NBQy9ILENBQUMsQ0FBQztRQUVILE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUMvRSxVQUFVLEVBQUUsK0JBQStCLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDOUQsV0FBVyxFQUFFLG1EQUFtRDtZQUNoRSxpQkFBaUIsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxxQ0FBcUMsQ0FBQztTQUMxRixDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUMvRCxVQUFVLEVBQUUsOEJBQThCLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDN0QsV0FBVyxFQUFFLDRDQUE0QztZQUN6RCxpQkFBaUIsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyx5Q0FBeUMsQ0FBQztTQUM5RixDQUFDLENBQUM7UUFFSCwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUM7UUFDbEQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUM7UUFDbEQsSUFBSSxDQUFDLGNBQWMsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO1FBQzVDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDO1FBQ2xELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLENBQUM7UUFDMUQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUM7UUFFaEQsa0JBQWtCO1FBQ2xCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDM0MsS0FBSyxFQUFFLElBQUksQ0FBQyxpQkFBaUI7WUFDN0IsV0FBVyxFQUFFLHdDQUF3QztTQUN0RCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQzNDLEtBQUssRUFBRSxJQUFJLENBQUMsaUJBQWlCO1lBQzdCLFdBQVcsRUFBRSw0QkFBNEI7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDMUIsV0FBVyxFQUFFLGdDQUFnQztTQUM5QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQzNDLEtBQUssRUFBRSxJQUFJLENBQUMsaUJBQWlCO1lBQzdCLFdBQVcsRUFBRSxvQ0FBb0M7U0FDbEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMvQyxLQUFLLEVBQUUsSUFBSSxDQUFDLHFCQUFxQjtZQUNqQyxXQUFXLEVBQUUsaUNBQWlDO1NBQy9DLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7WUFDNUIsV0FBVyxFQUFFLDRCQUE0QjtTQUMxQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE3R0Qsb0NBNkdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBTZWNyZXRzU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFNlY3JldHNTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBkYXRhYmFzZVNlY3JldEFybjogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgbmV4dGF1dGhTZWNyZXRBcm46IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IG5leHRhdXRoVXJsQXJuOiBzdHJpbmc7XG4gIHB1YmxpYyByZWFkb25seSBnb29nbGVDbGllbnRJZEFybjogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgZ29vZ2xlQ2xpZW50U2VjcmV0QXJuOiBzdHJpbmc7XG4gIHB1YmxpYyByZWFkb25seSBhcGlLZXlzU2VjcmV0QXJuOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFNlY3JldHNTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBFbnZpcm9ubWVudC1zcGVjaWZpYyBjb25maWd1cmF0aW9uXG4gICAgY29uc3QgZW52Q29uZmlncyA9IHtcbiAgICAgIGRldmVsb3BtZW50OiB7XG4gICAgICAgIGRhdGFiYXNlVXJsOiAncG9zdGdyZXNxbDovL25lb25kYl9vd25lcjpucGdfYXZFTHg4dXFPQWMwQGVwLXN0aWxsLXBhcGVyLWE1dGd0ZW04LXBvb2xlci51cy1lYXN0LTIuYXdzLm5lb24udGVjaC9uZW9uZGI/c3NsbW9kZT1yZXF1aXJlJyxcbiAgICAgICAgbmV4dGF1dGhVcmw6ICdodHRwczovL2QzcHZjNWRuNDMudXMtZWFzdC0xLmF3c2FwcHJ1bm5lci5jb20nLFxuICAgICAgfSxcbiAgICAgIHN0YWdpbmc6IHtcbiAgICAgICAgZGF0YWJhc2VVcmw6ICdwb3N0Z3Jlc3FsOi8vbmVvbmRiX293bmVyOm5wZ19hdkVMeDh1cU9BYzBAZXAtcmFzcHktc291bmQtYTVlZzk3eHUtcG9vbGVyLnVzLWVhc3QtMi5hd3MubmVvbi50ZWNoL25lb25kYj9zc2xtb2RlPXJlcXVpcmUnLFxuICAgICAgICBuZXh0YXV0aFVybDogJ2h0dHBzOi8vdWJmeWJkYWR1bi51cy1lYXN0LTEuYXdzYXBwcnVubmVyLmNvbScsXG4gICAgICB9LFxuICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICBkYXRhYmFzZVVybDogJ3Bvc3RncmVzcWw6Ly9uZW9uZGJfb3duZXI6bnBnX2F2RUx4OHVxT0FjMEBlcC1taXN0eS1mcm9nLWE1cGNyOXB0LXBvb2xlci51cy1lYXN0LTIuYXdzLm5lb24udGVjaC9uZW9uZGI/c3NsbW9kZT1yZXF1aXJlJyxcbiAgICAgICAgbmV4dGF1dGhVcmw6ICdodHRwczovL2lqajJtYzdkaHoudXMtZWFzdC0xLmF3c2FwcHJ1bm5lci5jb20nLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgY29uc3QgY29uZmlnID0gZW52Q29uZmlnc1twcm9wcy5lbnZpcm9ubWVudCBhcyBrZXlvZiB0eXBlb2YgZW52Q29uZmlnc107XG4gICAgaWYgKCFjb25maWcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBlbnZpcm9ubWVudDogJHtwcm9wcy5lbnZpcm9ubWVudH0uIE11c3QgYmUgb25lIG9mOiAke09iamVjdC5rZXlzKGVudkNvbmZpZ3MpLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuXG4gICAgLy8gRGF0YWJhc2UgY3JlZGVudGlhbHMgc2VjcmV0XG4gICAgY29uc3QgZGF0YWJhc2VTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdEYXRhYmFzZUNyZWRlbnRpYWxzJywge1xuICAgICAgc2VjcmV0TmFtZTogYG5haWxpdC1kYXRhYmFzZS0ke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIGNvbm5lY3Rpb24gc3RyaW5nIGZvciBOYWlsSXQgYXBwbGljYXRpb24nLFxuICAgICAgc2VjcmV0U3RyaW5nVmFsdWU6IGNkay5TZWNyZXRWYWx1ZS51bnNhZmVQbGFpblRleHQoY29uZmlnLmRhdGFiYXNlVXJsKSxcbiAgICB9KTtcblxuICAgIC8vIEluZGl2aWR1YWwgc2VjcmV0cyBmb3IgYmV0dGVyIEFwcCBSdW5uZXIgY29tcGF0aWJpbGl0eVxuICAgIGNvbnN0IG5leHRhdXRoU2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnTmV4dEF1dGhTZWNyZXQnLCB7XG4gICAgICBzZWNyZXROYW1lOiBgbmFpbGl0LW5leHRhdXRoLXNlY3JldC0ke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ05leHRBdXRoIHNlY3JldCBmb3IgTmFpbEl0IGFwcGxpY2F0aW9uJyxcbiAgICAgIHNlY3JldFN0cmluZ1ZhbHVlOiBjZGsuU2VjcmV0VmFsdWUudW5zYWZlUGxhaW5UZXh0KCcraFAzMXJyWmdvaEQ3dTN1SHIvQVNiMVdFOWozTVlqeEh0VEJtYWFVKzNNPScpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgbmV4dGF1dGhVcmwgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdOZXh0QXV0aFVybCcsIHtcbiAgICAgIHNlY3JldE5hbWU6IGBuYWlsaXQtbmV4dGF1dGgtdXJsLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnTmV4dEF1dGggVVJMIGZvciBOYWlsSXQgYXBwbGljYXRpb24nLFxuICAgICAgc2VjcmV0U3RyaW5nVmFsdWU6IGNkay5TZWNyZXRWYWx1ZS51bnNhZmVQbGFpblRleHQoY29uZmlnLm5leHRhdXRoVXJsKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGdvb2dsZUNsaWVudElkID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnR29vZ2xlQ2xpZW50SWQnLCB7XG4gICAgICBzZWNyZXROYW1lOiBgbmFpbGl0LWdvb2dsZS1jbGllbnQtaWQtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdHb29nbGUgT0F1dGggQ2xpZW50IElEIGZvciBOYWlsSXQgYXBwbGljYXRpb24nLFxuICAgICAgc2VjcmV0U3RyaW5nVmFsdWU6IGNkay5TZWNyZXRWYWx1ZS51bnNhZmVQbGFpblRleHQoJzQ0MjQzMzQxODY4Ni1zYWhwbnJmYWdyczlsZnMxcGRlZTJtMDZlNGcydWtkYy5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbScpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZ29vZ2xlQ2xpZW50U2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnR29vZ2xlQ2xpZW50U2VjcmV0Jywge1xuICAgICAgc2VjcmV0TmFtZTogYG5haWxpdC1nb29nbGUtY2xpZW50LXNlY3JldC0ke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0dvb2dsZSBPQXV0aCBDbGllbnQgU2VjcmV0IGZvciBOYWlsSXQgYXBwbGljYXRpb24nLFxuICAgICAgc2VjcmV0U3RyaW5nVmFsdWU6IGNkay5TZWNyZXRWYWx1ZS51bnNhZmVQbGFpblRleHQoJ0dPQ1NQWC1RRjMzYlVJc3pfRnlST3poNnJ1TFE1TmRWT2VGJyksXG4gICAgfSk7XG5cbiAgICBjb25zdCBhcGlLZXlzU2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnQXBpS2V5cycsIHtcbiAgICAgIHNlY3JldE5hbWU6IGBuYWlsaXQtZ29vZ2xlLW1hcHMtYXBpLWtleS0ke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0dvb2dsZSBNYXBzIEFQSSBrZXkgZm9yIE5haWxJdCBhcHBsaWNhdGlvbicsXG4gICAgICBzZWNyZXRTdHJpbmdWYWx1ZTogY2RrLlNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dCgnQUl6YVN5RENMUmJmMU5mNk54VjRQcU9fOTItcTF3RTFyQ05PYXcwJyksXG4gICAgfSk7XG5cbiAgICAvLyBFeHBvcnQgQVJOcyBmb3IgdXNlIGluIEFwcCBSdW5uZXIgc3RhY2tcbiAgICB0aGlzLmRhdGFiYXNlU2VjcmV0QXJuID0gZGF0YWJhc2VTZWNyZXQuc2VjcmV0QXJuO1xuICAgIHRoaXMubmV4dGF1dGhTZWNyZXRBcm4gPSBuZXh0YXV0aFNlY3JldC5zZWNyZXRBcm47XG4gICAgdGhpcy5uZXh0YXV0aFVybEFybiA9IG5leHRhdXRoVXJsLnNlY3JldEFybjtcbiAgICB0aGlzLmdvb2dsZUNsaWVudElkQXJuID0gZ29vZ2xlQ2xpZW50SWQuc2VjcmV0QXJuO1xuICAgIHRoaXMuZ29vZ2xlQ2xpZW50U2VjcmV0QXJuID0gZ29vZ2xlQ2xpZW50U2VjcmV0LnNlY3JldEFybjtcbiAgICB0aGlzLmFwaUtleXNTZWNyZXRBcm4gPSBhcGlLZXlzU2VjcmV0LnNlY3JldEFybjtcblxuICAgIC8vIE91dHB1dCB0aGUgQVJOc1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEYXRhYmFzZVNlY3JldEFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmRhdGFiYXNlU2VjcmV0QXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdBUk4gb2YgdGhlIGRhdGFiYXNlIGNyZWRlbnRpYWxzIHNlY3JldCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTmV4dEF1dGhTZWNyZXRBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5uZXh0YXV0aFNlY3JldEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBOZXh0QXV0aCBzZWNyZXQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ05leHRBdXRoVXJsQXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMubmV4dGF1dGhVcmxBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FSTiBvZiB0aGUgTmV4dEF1dGggVVJMIHNlY3JldCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR29vZ2xlQ2xpZW50SWRBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5nb29nbGVDbGllbnRJZEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBHb29nbGUgQ2xpZW50IElEIHNlY3JldCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR29vZ2xlQ2xpZW50U2VjcmV0QXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMuZ29vZ2xlQ2xpZW50U2VjcmV0QXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdBUk4gb2YgdGhlIEdvb2dsZSBDbGllbnQgU2VjcmV0JyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlLZXlzU2VjcmV0QXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMuYXBpS2V5c1NlY3JldEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBBUEkga2V5cyBzZWNyZXQnLFxuICAgIH0pO1xuICB9XG59ICJdfQ==