import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface SecretsStackProps extends cdk.StackProps {
    environment: string;
}
export declare class SecretsStack extends cdk.Stack {
    readonly databaseSecretArn: string;
    readonly nextauthSecretArn: string;
    readonly nextauthUrlArn: string;
    readonly googleClientIdArn: string;
    readonly googleClientSecretArn: string;
    readonly apiKeysSecretArn: string;
    constructor(scope: Construct, id: string, props: SecretsStackProps);
}
