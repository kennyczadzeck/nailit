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
}
export declare class AppRunnerStack extends cdk.Stack {
    readonly appRunnerService: apprunner.CfnService;
    constructor(scope: Construct, id: string, props: AppRunnerStackProps);
    private addOutputs;
}
export {};
