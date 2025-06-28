import * as cdk from 'aws-cdk-lib';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import { Construct } from 'constructs';
interface AppRunnerStackProps extends cdk.StackProps {
    environment: string;
    envConfig: {
        amplifyBranch: string;
        databaseBranch: string;
        resourceSuffix: string;
    };
    githubConnectionArn?: string;
    ecrRepositoryUri?: string;
    secretArns?: {
        databaseSecretArn: string;
        nextauthSecretArn: string;
        nextauthUrlArn: string;
        googleClientIdArn: string;
        googleClientSecretArn: string;
        apiKeysSecretArn: string;
    };
}
export declare class AppRunnerStack extends cdk.Stack {
    readonly appRunnerService: apprunner.CfnService;
    constructor(scope: Construct, id: string, props: AppRunnerStackProps);
    private getSourceConfiguration;
    private getRuntimeEnvironmentVariables;
    private getRuntimeEnvironmentSecrets;
    private addOutputs;
    private getCodeConfiguration;
}
export {};
