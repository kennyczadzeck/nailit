import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
interface EcrStackProps extends cdk.StackProps {
    environment: string;
    envConfig: {
        resourceSuffix: string;
    };
}
export declare class EcrStack extends cdk.Stack {
    readonly repository: ecr.Repository;
    constructor(scope: Construct, id: string, props: EcrStackProps);
}
export {};
