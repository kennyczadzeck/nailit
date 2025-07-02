import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface SecretsStackProps extends cdk.StackProps {
  environment: string;
}

export class SecretsStack extends cdk.Stack {
  public readonly databaseSecretArn: string;
  public readonly nextauthSecretArn: string;
  public readonly nextauthUrlArn: string;
  public readonly googleClientIdArn: string;
  public readonly googleClientSecretArn: string;
  public readonly apiKeysSecretArn: string;

  constructor(scope: Construct, id: string, props: SecretsStackProps) {
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

    const config = envConfigs[props.environment as keyof typeof envConfigs];
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