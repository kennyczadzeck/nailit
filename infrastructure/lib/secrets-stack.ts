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

    // Database credentials secret
    const databaseSecret = new secretsmanager.Secret(this, 'DatabaseCredentials', {
      secretName: `nailit-database-${props.environment}`,
      description: 'Database connection string for NailIt application',
      secretStringValue: cdk.SecretValue.unsafePlainText(
        'postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require'
      ),
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
      secretStringValue: cdk.SecretValue.unsafePlainText('https://krkvn7z28m.us-east-1.awsapprunner.com'),
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