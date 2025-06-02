import * as cdk from 'aws-cdk-lib';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import { Construct } from 'constructs';
interface AmplifyStackProps extends cdk.StackProps {
    repositoryUrl: string;
    accessToken: string;
    domainName?: string;
    environments: {
        [key: string]: {
            branchName: string;
            environmentVariables: {
                [key: string]: string;
            };
            subdomain?: string;
        };
    };
}
export declare class AmplifyStack extends cdk.Stack {
    readonly app: amplify.CfnApp;
    readonly branches: {
        [key: string]: amplify.CfnBranch;
    };
    constructor(scope: Construct, id: string, props: AmplifyStackProps);
}
export {};
