import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
interface LoggingStackProps extends cdk.StackProps {
    environment: string;
    envConfig: {
        resourceSuffix: string;
    };
}
export declare class LoggingStack extends cdk.Stack {
    readonly loggingRole: iam.IRole;
    readonly applicationLogGroup: logs.LogGroup;
    readonly applicationLogGroupName: string;
    constructor(scope: Construct, id: string, props: LoggingStackProps);
}
export {};
