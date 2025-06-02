import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
interface NailItInfrastructureStackProps extends cdk.StackProps {
    environment: string;
    envConfig: {
        amplifyBranch: string;
        databaseBranch: string;
        resourceSuffix: string;
    };
}
export declare class NailItInfrastructureStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: NailItInfrastructureStackProps);
}
export {};
