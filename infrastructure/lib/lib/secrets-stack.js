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
        // Environment-specific configuration - URLs only (not secrets)
        const envConfigs = {
            development: {
                nextauthUrl: 'https://d3pvc5dn43.us-east-1.awsapprunner.com',
            },
            staging: {
                nextauthUrl: 'https://ubfybdadun.us-east-1.awsapprunner.com',
            },
            production: {
                nextauthUrl: 'https://ijj2mc7dhz.us-east-1.awsapprunner.com',
            },
        };
        const config = envConfigs[props.environment];
        if (!config) {
            throw new Error(`Unknown environment: ${props.environment}. Must be one of: ${Object.keys(envConfigs).join(', ')}`);
        }
        // Get secrets from environment variables (set during CDK deployment)
        const databaseUrl = process.env[`NAILIT_DATABASE_URL_${props.environment.toUpperCase()}`];
        const nextauthSecret = process.env[`NAILIT_NEXTAUTH_SECRET_${props.environment.toUpperCase()}`];
        const googleClientId = process.env[`NAILIT_GOOGLE_CLIENT_ID_${props.environment.toUpperCase()}`];
        const googleClientSecret = process.env[`NAILIT_GOOGLE_CLIENT_SECRET_${props.environment.toUpperCase()}`];
        const googleMapsApiKey = process.env[`NAILIT_GOOGLE_MAPS_API_KEY_${props.environment.toUpperCase()}`];
        // Validate required environment variables
        if (!databaseUrl) {
            throw new Error(`Missing required environment variable: NAILIT_DATABASE_URL_${props.environment.toUpperCase()}`);
        }
        if (!nextauthSecret) {
            throw new Error(`Missing required environment variable: NAILIT_NEXTAUTH_SECRET_${props.environment.toUpperCase()}`);
        }
        if (!googleClientId) {
            throw new Error(`Missing required environment variable: NAILIT_GOOGLE_CLIENT_ID_${props.environment.toUpperCase()}`);
        }
        if (!googleClientSecret) {
            throw new Error(`Missing required environment variable: NAILIT_GOOGLE_CLIENT_SECRET_${props.environment.toUpperCase()}`);
        }
        if (!googleMapsApiKey) {
            throw new Error(`Missing required environment variable: NAILIT_GOOGLE_MAPS_API_KEY_${props.environment.toUpperCase()}`);
        }
        // Database credentials secret
        const databaseSecret = new secretsmanager.Secret(this, 'DatabaseCredentials', {
            secretName: `nailit-database-${props.environment}`,
            description: 'Database connection string for NailIt application',
            secretStringValue: cdk.SecretValue.unsafePlainText(databaseUrl),
        });
        // Individual secrets for better App Runner compatibility
        const nextauthSecretResource = new secretsmanager.Secret(this, 'NextAuthSecret', {
            secretName: `nailit-nextauth-secret-${props.environment}`,
            description: 'NextAuth secret for NailIt application',
            secretStringValue: cdk.SecretValue.unsafePlainText(nextauthSecret),
        });
        const nextauthUrl = new secretsmanager.Secret(this, 'NextAuthUrl', {
            secretName: `nailit-nextauth-url-${props.environment}`,
            description: 'NextAuth URL for NailIt application',
            secretStringValue: cdk.SecretValue.unsafePlainText(config.nextauthUrl),
        });
        const googleClientIdResource = new secretsmanager.Secret(this, 'GoogleClientId', {
            secretName: `nailit-google-client-id-${props.environment}`,
            description: 'Google OAuth Client ID for NailIt application',
            secretStringValue: cdk.SecretValue.unsafePlainText(googleClientId),
        });
        const googleClientSecretResource = new secretsmanager.Secret(this, 'GoogleClientSecret', {
            secretName: `nailit-google-client-secret-${props.environment}`,
            description: 'Google OAuth Client Secret for NailIt application',
            secretStringValue: cdk.SecretValue.unsafePlainText(googleClientSecret),
        });
        const apiKeysSecret = new secretsmanager.Secret(this, 'ApiKeys', {
            secretName: `nailit-google-maps-api-key-${props.environment}`,
            description: 'Google Maps API key for NailIt application',
            secretStringValue: cdk.SecretValue.unsafePlainText(googleMapsApiKey),
        });
        // Export ARNs for use in App Runner stack
        this.databaseSecretArn = databaseSecret.secretArn;
        this.nextauthSecretArn = nextauthSecretResource.secretArn;
        this.nextauthUrlArn = nextauthUrl.secretArn;
        this.googleClientIdArn = googleClientIdResource.secretArn;
        this.googleClientSecretArn = googleClientSecretResource.secretArn;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NlY3JldHMtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0VBQWlFO0FBT2pFLE1BQWEsWUFBYSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBUXpDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBd0I7UUFDaEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsK0RBQStEO1FBQy9ELE1BQU0sVUFBVSxHQUFHO1lBQ2pCLFdBQVcsRUFBRTtnQkFDWCxXQUFXLEVBQUUsK0NBQStDO2FBQzdEO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLFdBQVcsRUFBRSwrQ0FBK0M7YUFDN0Q7WUFDRCxVQUFVLEVBQUU7Z0JBQ1YsV0FBVyxFQUFFLCtDQUErQzthQUM3RDtTQUNGLENBQUM7UUFFRixNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLFdBQXNDLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsS0FBSyxDQUFDLFdBQVcscUJBQXFCLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNySDtRQUVELHFFQUFxRTtRQUNyRSxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixLQUFLLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMxRixNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixLQUFLLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNoRyxNQUFNLGNBQWMsR0FBRyxPQUFP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LElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDMUIsV0FBVyxFQUFFLGdDQUFnQztTQUM5QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQzNDLEtBQUssRUFBRSxJQUFJLENBQUMsaUJBQWlCO1lBQzdCLFdBQVcsRUFBRSxvQ0FBb0M7U0FDbEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMvQyxLQUFLLEVBQUUsSUFBSSxDQUFDLHFCQUFxQjtZQUNqQyxXQUFXLEVBQUUsaUNBQWlDO1NBQy9DLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7WUFDNUIsV0FBVyxFQUFFLDRCQUE0QjtTQUMxQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFsSUQsb0NBa0lDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBTZWNyZXRzU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFNlY3JldHNTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBkYXRhYmFzZVNlY3JldEFybjogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgbmV4dGF1dGhTZWNyZXRBcm46IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IG5leHRhdXRoVXJsQXJuOiBzdHJpbmc7XG4gIHB1YmxpYyByZWFkb25seSBnb29nbGVDbGllbnRJZEFybjogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgZ29vZ2xlQ2xpZW50U2VjcmV0QXJuOiBzdHJpbmc7XG4gIHB1YmxpYyByZWFkb25seSBhcGlLZXlzU2VjcmV0QXJuOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFNlY3JldHNTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBFbnZpcm9ubWVudC1zcGVjaWZpYyBjb25maWd1cmF0aW9uIC0gVVJMcyBvbmx5IChub3Qgc2VjcmV0cylcbiAgICBjb25zdCBlbnZDb25maWdzID0ge1xuICAgICAgZGV2ZWxvcG1lbnQ6IHtcbiAgICAgICAgbmV4dGF1dGhVcmw6ICdodHRwczovL2QzcHZjNWRuNDMudXMtZWFzdC0xLmF3c2FwcHJ1bm5lci5jb20nLFxuICAgICAgfSxcbiAgICAgIHN0YWdpbmc6IHtcbiAgICAgICAgbmV4dGF1dGhVcmw6ICdodHRwczovL3ViZnliZGFkdW4udXMtZWFzdC0xLmF3c2FwcHJ1bm5lci5jb20nLFxuICAgICAgfSxcbiAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgbmV4dGF1dGhVcmw6ICdodHRwczovL2lqajJtYzdkaHoudXMtZWFzdC0xLmF3c2FwcHJ1bm5lci5jb20nLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgY29uc3QgY29uZmlnID0gZW52Q29uZmlnc1twcm9wcy5lbnZpcm9ubWVudCBhcyBrZXlvZiB0eXBlb2YgZW52Q29uZmlnc107XG4gICAgaWYgKCFjb25maWcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBlbnZpcm9ubWVudDogJHtwcm9wcy5lbnZpcm9ubWVudH0uIE11c3QgYmUgb25lIG9mOiAke09iamVjdC5rZXlzKGVudkNvbmZpZ3MpLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuXG4gICAgLy8gR2V0IHNlY3JldHMgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgKHNldCBkdXJpbmcgQ0RLIGRlcGxveW1lbnQpXG4gICAgY29uc3QgZGF0YWJhc2VVcmwgPSBwcm9jZXNzLmVudltgTkFJTElUX0RBVEFCQVNFX1VSTF8ke3Byb3BzLmVudmlyb25tZW50LnRvVXBwZXJDYXNlKCl9YF07XG4gICAgY29uc3QgbmV4dGF1dGhTZWNyZXQgPSBwcm9jZXNzLmVudltgTkFJTElUX05FWFRBVVRIX1NFQ1JFVF8ke3Byb3BzLmVudmlyb25tZW50LnRvVXBwZXJDYXNlKCl9YF07XG4gICAgY29uc3QgZ29vZ2xlQ2xpZW50SWQgPSBwcm9jZXNzLmVudltgTkFJTElUX0dPT0dMRV9DTElFTlRfSURfJHtwcm9wcy5lbnZpcm9ubWVudC50b1VwcGVyQ2FzZSgpfWBdO1xuICAgIGNvbnN0IGdvb2dsZUNsaWVudFNlY3JldCA9IHByb2Nlc3MuZW52W2BOQUlMSVRfR09PR0xFX0NMSUVOVF9TRUNSRVRfJHtwcm9wcy5lbnZpcm9ubWVudC50b1VwcGVyQ2FzZSgpfWBdO1xuICAgIGNvbnN0IGdvb2dsZU1hcHNBcGlLZXkgPSBwcm9jZXNzLmVudltgTkFJTElUX0dPT0dMRV9NQVBTX0FQSV9LRVlfJHtwcm9wcy5lbnZpcm9ubWVudC50b1VwcGVyQ2FzZSgpfWBdO1xuXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gICAgaWYgKCFkYXRhYmFzZVVybCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiBOQUlMSVRfREFUQUJBU0VfVVJMXyR7cHJvcHMuZW52aXJvbm1lbnQudG9VcHBlckNhc2UoKX1gKTtcbiAgICB9XG4gICAgaWYgKCFuZXh0YXV0aFNlY3JldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiBOQUlMSVRfTkVYVEFVVEhfU0VDUkVUXyR7cHJvcHMuZW52aXJvbm1lbnQudG9VcHBlckNhc2UoKX1gKTtcbiAgICB9XG4gICAgaWYgKCFnb29nbGVDbGllbnRJZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiBOQUlMSVRfR09PR0xFX0NMSUVOVF9JRF8ke3Byb3BzLmVudmlyb25tZW50LnRvVXBwZXJDYXNlKCl9YCk7XG4gICAgfVxuICAgIGlmICghZ29vZ2xlQ2xpZW50U2VjcmV0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6IE5BSUxJVF9HT09HTEVfQ0xJRU5UX1NFQ1JFVF8ke3Byb3BzLmVudmlyb25tZW50LnRvVXBwZXJDYXNlKCl9YCk7XG4gICAgfVxuICAgIGlmICghZ29vZ2xlTWFwc0FwaUtleSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiBOQUlMSVRfR09PR0xFX01BUFNfQVBJX0tFWV8ke3Byb3BzLmVudmlyb25tZW50LnRvVXBwZXJDYXNlKCl9YCk7XG4gICAgfVxuXG4gICAgLy8gRGF0YWJhc2UgY3JlZGVudGlhbHMgc2VjcmV0XG4gICAgY29uc3QgZGF0YWJhc2VTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdEYXRhYmFzZUNyZWRlbnRpYWxzJywge1xuICAgICAgc2VjcmV0TmFtZTogYG5haWxpdC1kYXRhYmFzZS0ke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIGNvbm5lY3Rpb24gc3RyaW5nIGZvciBOYWlsSXQgYXBwbGljYXRpb24nLFxuICAgICAgc2VjcmV0U3RyaW5nVmFsdWU6IGNkay5TZWNyZXRWYWx1ZS51bnNhZmVQbGFpblRleHQoZGF0YWJhc2VVcmwpLFxuICAgIH0pO1xuXG4gICAgLy8gSW5kaXZpZHVhbCBzZWNyZXRzIGZvciBiZXR0ZXIgQXBwIFJ1bm5lciBjb21wYXRpYmlsaXR5XG4gICAgY29uc3QgbmV4dGF1dGhTZWNyZXRSZXNvdXJjZSA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ05leHRBdXRoU2VjcmV0Jywge1xuICAgICAgc2VjcmV0TmFtZTogYG5haWxpdC1uZXh0YXV0aC1zZWNyZXQtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdOZXh0QXV0aCBzZWNyZXQgZm9yIE5haWxJdCBhcHBsaWNhdGlvbicsXG4gICAgICBzZWNyZXRTdHJpbmdWYWx1ZTogY2RrLlNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dChuZXh0YXV0aFNlY3JldCksXG4gICAgfSk7XG5cbiAgICBjb25zdCBuZXh0YXV0aFVybCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ05leHRBdXRoVXJsJywge1xuICAgICAgc2VjcmV0TmFtZTogYG5haWxpdC1uZXh0YXV0aC11cmwtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdOZXh0QXV0aCBVUkwgZm9yIE5haWxJdCBhcHBsaWNhdGlvbicsXG4gICAgICBzZWNyZXRTdHJpbmdWYWx1ZTogY2RrLlNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dChjb25maWcubmV4dGF1dGhVcmwpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZ29vZ2xlQ2xpZW50SWRSZXNvdXJjZSA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0dvb2dsZUNsaWVudElkJywge1xuICAgICAgc2VjcmV0TmFtZTogYG5haWxpdC1nb29nbGUtY2xpZW50LWlkLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnR29vZ2xlIE9BdXRoIENsaWVudCBJRCBmb3IgTmFpbEl0IGFwcGxpY2F0aW9uJyxcbiAgICAgIHNlY3JldFN0cmluZ1ZhbHVlOiBjZGsuU2VjcmV0VmFsdWUudW5zYWZlUGxhaW5UZXh0KGdvb2dsZUNsaWVudElkKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGdvb2dsZUNsaWVudFNlY3JldFJlc291cmNlID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnR29vZ2xlQ2xpZW50U2VjcmV0Jywge1xuICAgICAgc2VjcmV0TmFtZTogYG5haWxpdC1nb29nbGUtY2xpZW50LXNlY3JldC0ke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0dvb2dsZSBPQXV0aCBDbGllbnQgU2VjcmV0IGZvciBOYWlsSXQgYXBwbGljYXRpb24nLFxuICAgICAgc2VjcmV0U3RyaW5nVmFsdWU6IGNkay5TZWNyZXRWYWx1ZS51bnNhZmVQbGFpblRleHQoZ29vZ2xlQ2xpZW50U2VjcmV0KSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGFwaUtleXNTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdBcGlLZXlzJywge1xuICAgICAgc2VjcmV0TmFtZTogYG5haWxpdC1nb29nbGUtbWFwcy1hcGkta2V5LSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnR29vZ2xlIE1hcHMgQVBJIGtleSBmb3IgTmFpbEl0IGFwcGxpY2F0aW9uJyxcbiAgICAgIHNlY3JldFN0cmluZ1ZhbHVlOiBjZGsuU2VjcmV0VmFsdWUudW5zYWZlUGxhaW5UZXh0KGdvb2dsZU1hcHNBcGlLZXkpLFxuICAgIH0pO1xuXG4gICAgLy8gRXhwb3J0IEFSTnMgZm9yIHVzZSBpbiBBcHAgUnVubmVyIHN0YWNrXG4gICAgdGhpcy5kYXRhYmFzZVNlY3JldEFybiA9IGRhdGFiYXNlU2VjcmV0LnNlY3JldEFybjtcbiAgICB0aGlzLm5leHRhdXRoU2VjcmV0QXJuID0gbmV4dGF1dGhTZWNyZXRSZXNvdXJjZS5zZWNyZXRBcm47XG4gICAgdGhpcy5uZXh0YXV0aFVybEFybiA9IG5leHRhdXRoVXJsLnNlY3JldEFybjtcbiAgICB0aGlzLmdvb2dsZUNsaWVudElkQXJuID0gZ29vZ2xlQ2xpZW50SWRSZXNvdXJjZS5zZWNyZXRBcm47XG4gICAgdGhpcy5nb29nbGVDbGllbnRTZWNyZXRBcm4gPSBnb29nbGVDbGllbnRTZWNyZXRSZXNvdXJjZS5zZWNyZXRBcm47XG4gICAgdGhpcy5hcGlLZXlzU2VjcmV0QXJuID0gYXBpS2V5c1NlY3JldC5zZWNyZXRBcm47XG5cbiAgICAvLyBPdXRwdXQgdGhlIEFSTnNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGF0YWJhc2VTZWNyZXRBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5kYXRhYmFzZVNlY3JldEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBkYXRhYmFzZSBjcmVkZW50aWFscyBzZWNyZXQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ05leHRBdXRoU2VjcmV0QXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMubmV4dGF1dGhTZWNyZXRBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FSTiBvZiB0aGUgTmV4dEF1dGggc2VjcmV0JyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdOZXh0QXV0aFVybEFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLm5leHRhdXRoVXJsQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdBUk4gb2YgdGhlIE5leHRBdXRoIFVSTCBzZWNyZXQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0dvb2dsZUNsaWVudElkQXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMuZ29vZ2xlQ2xpZW50SWRBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FSTiBvZiB0aGUgR29vZ2xlIENsaWVudCBJRCBzZWNyZXQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0dvb2dsZUNsaWVudFNlY3JldEFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmdvb2dsZUNsaWVudFNlY3JldEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBHb29nbGUgQ2xpZW50IFNlY3JldCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpS2V5c1NlY3JldEFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFwaUtleXNTZWNyZXRBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FSTiBvZiB0aGUgQVBJIGtleXMgc2VjcmV0JyxcbiAgICB9KTtcbiAgfVxufSAiXX0=