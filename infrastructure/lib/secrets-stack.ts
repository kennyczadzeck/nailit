import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface SecretsStackProps extends cdk.StackProps {
  environment: string;
}

export class SecretsStack extends cdk.Stack {
  public readonly databaseSecretArn: string;
  public readonly authSecretArn: string;
  public readonly googleSecretArn: string;
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

    // NextAuth credentials secret
    const authSecret = new secretsmanager.Secret(this, 'AuthCredentials', {
      secretName: `nailit-auth-${props.environment}`,
      description: 'NextAuth secret and URL for NailIt application',
      secretObjectValue: {
        NEXTAUTH_SECRET: cdk.SecretValue.unsafePlainText('+hP31rrZgohD7u3uHr/ASb1WE9j3MYjxHtTBmaaU+3M='),
        NEXTAUTH_URL: cdk.SecretValue.unsafePlainText('https://krkvn7z28m.us-east-1.awsapprunner.com'),
      },
    });

    // Google OAuth credentials secret
    const googleSecret = new secretsmanager.Secret(this, 'GoogleCredentials', {
      secretName: `nailit-google-${props.environment}`,
      description: 'Google OAuth credentials for NailIt application',
      secretObjectValue: {
        GOOGLE_CLIENT_ID: cdk.SecretValue.unsafePlainText('442433418686-sahpnrfagrs9lfs1pdee2m06e4g2ukdc.apps.googleusercontent.com'),
        GOOGLE_CLIENT_SECRET: cdk.SecretValue.unsafePlainText('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'),
      },
    });

    // API Keys secret (for public-facing keys that aren't as sensitive)
    const apiKeysSecret = new secretsmanager.Secret(this, 'ApiKeys', {
      secretName: `nailit-apikeys-${props.environment}`,
      description: 'API keys for NailIt application',
      secretObjectValue: {
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: cdk.SecretValue.unsafePlainText('AIzaSyDCLRbf1Nf6NxV4PqO_92-q1wE1rCNOaw0'),
      },
    });

    // Export ARNs for use in App Runner stack
    this.databaseSecretArn = databaseSecret.secretArn;
    this.authSecretArn = authSecret.secretArn;
    this.googleSecretArn = googleSecret.secretArn;
    this.apiKeysSecretArn = apiKeysSecret.secretArn;

    // Output the ARNs
    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecretArn,
      description: 'ARN of the database credentials secret',
    });

    new cdk.CfnOutput(this, 'AuthSecretArn', {
      value: this.authSecretArn,
      description: 'ARN of the auth credentials secret',
    });

    new cdk.CfnOutput(this, 'GoogleSecretArn', {
      value: this.googleSecretArn,
      description: 'ARN of the Google OAuth credentials secret',
    });

    new cdk.CfnOutput(this, 'ApiKeysSecretArn', {
      value: this.apiKeysSecretArn,
      description: 'ARN of the API keys secret',
    });
  }
} 