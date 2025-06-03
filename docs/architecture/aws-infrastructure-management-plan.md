# NailIt AWS Infrastructure Management Plan

## Infrastructure as Code Strategy

### Recommended Approach: AWS CDK with TypeScript

For the NailIt multi-channel communication monitoring system, we recommend using **AWS CDK (Cloud Development Kit) with TypeScript** as our primary infrastructure management tool.

## Why AWS CDK?

### Technical Alignment
- **Language Consistency**: Same TypeScript used in Next.js frontend
- **Type Safety**: Compile-time validation of infrastructure configurations
- **Modern Development Experience**: IDE support, IntelliSense, refactoring
- **Testing**: Unit and integration tests for infrastructure code
- **Version Control**: Infrastructure changes tracked alongside application code

### Scalability Benefits
- **Reusable Constructs**: Create custom components for common patterns
- **Environment Management**: Easy dev/staging/prod deployments
- **Cross-Stack References**: Seamless integration between infrastructure components
- **Automated Deployments**: CI/CD integration with GitHub Actions

## Infrastructure Stack Organization

### Core Stacks Structure

```
infrastructure/
├── lib/
│   ├── core/
│   │   ├── networking-stack.ts      # VPC, subnets, security groups
│   │   ├── database-stack.ts        # RDS PostgreSQL, ElastiCache
│   │   └── storage-stack.ts         # S3 buckets, KMS keys
│   ├── compute/
│   │   ├── lambda-stack.ts          # All Lambda functions
│   │   ├── api-gateway-stack.ts     # API Gateway configuration
│   │   └── eventbridge-stack.ts     # Event-driven architecture
│   ├── ai-ml/
│   │   ├── bedrock-stack.ts         # AI/ML services configuration
│   │   └── transcribe-stack.ts      # Voice processing services
│   ├── frontend/
│   │   └── amplify-stack.ts         # Frontend hosting and CDN
│   └── monitoring/
│       ├── cloudwatch-stack.ts     # Monitoring and alerting
│       └── security-stack.ts       # IAM roles, security policies
├── bin/
│   └── nailit-app.ts              # CDK app entry point
├── test/
│   └── *.test.ts                   # Infrastructure unit tests
└── cdk.json                       # CDK configuration
```

### 1. Core Infrastructure Stack

```typescript
// lib/core/networking-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class NetworkingStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly securityGroups: { [key: string]: ec2.SecurityGroup };

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC with public and private subnets
    this.vpc = new ec2.Vpc(this, 'NailItVPC', {
      maxAzs: 3,
      natGateways: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Security Groups
    this.securityGroups = {
      lambda: new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
        vpc: this.vpc,
        description: 'Security group for Lambda functions',
        allowAllOutbound: true,
      }),
      database: new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
        vpc: this.vpc,
        description: 'Security group for RDS database',
        allowAllOutbound: false,
      }),
      cache: new ec2.SecurityGroup(this, 'CacheSecurityGroup', {
        vpc: this.vpc,
        description: 'Security group for ElastiCache',
        allowAllOutbound: false,
      }),
    };

    // Security group rules
    this.securityGroups.database.addIngressRule(
      this.securityGroups.lambda,
      ec2.Port.tcp(5432),
      'Allow Lambda to access PostgreSQL'
    );

    this.securityGroups.cache.addIngressRule(
      this.securityGroups.lambda,
      ec2.Port.tcp(6379),
      'Allow Lambda to access Redis'
    );
  }
}
```

### 2. Database Stack

```typescript
// lib/core/database-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  securityGroups: { [key: string]: ec2.SecurityGroup };
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly cache: elasticache.CfnCacheCluster;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // RDS PostgreSQL Database
    this.database = new rds.DatabaseInstance(this, 'NailItDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_3,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.securityGroups.database],
      multiAz: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: true,
      storageEncrypted: true,
      credentials: rds.Credentials.fromGeneratedSecret('nailit-db-admin'),
      databaseName: 'nailit',
    });

    // ElastiCache Redis
    const cacheSubnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: 'Subnet group for ElastiCache',
      subnetIds: props.vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    this.cache = new elasticache.CfnCacheCluster(this, 'NailItCache', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      cacheSubnetGroupName: cacheSubnetGroup.ref,
      vpcSecurityGroupIds: [props.securityGroups.cache.securityGroupId],
    });
  }
}
```

### 3. Lambda Functions Stack

```typescript
// lib/compute/lambda-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';

interface LambdaStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  securityGroups: { [key: string]: ec2.SecurityGroup };
  databaseSecret: rds.DatabaseSecret;
}

export class LambdaStack extends cdk.Stack {
  public readonly functions: { [key: string]: lambda.Function };

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const commonProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.securityGroups.lambda],
      environment: {
        DB_SECRET_ARN: props.databaseSecret.secretArn,
        NODE_ENV: 'production',
      },
      timeout: cdk.Duration.minutes(5),
    };

    // Email processing functions
    this.functions = {
      emailIngestion: new nodejs.NodejsFunction(this, 'EmailIngestionFunction', {
        ...commonProps,
        entry: 'src/lambda/email-ingestion/handler.ts',
        handler: 'handler',
        memorySize: 512,
      }),

      emailProcessing: new nodejs.NodejsFunction(this, 'EmailProcessingFunction', {
        ...commonProps,
        entry: 'src/lambda/email-processing/handler.ts',
        handler: 'handler',
        memorySize: 1024,
      }),

      aiAnalysis: new nodejs.NodejsFunction(this, 'AIAnalysisFunction', {
        ...commonProps,
        entry: 'src/lambda/ai-analysis/handler.ts',
        handler: 'handler',
        memorySize: 2048,
        timeout: cdk.Duration.minutes(10),
      }),

      smsProcessing: new nodejs.NodejsFunction(this, 'SMSProcessingFunction', {
        ...commonProps,
        entry: 'src/lambda/sms-processing/handler.ts',
        handler: 'handler',
        memorySize: 512,
      }),

      voiceProcessing: new nodejs.NodejsFunction(this, 'VoiceProcessingFunction', {
        ...commonProps,
        entry: 'src/lambda/voice-processing/handler.ts',
        handler: 'handler',
        memorySize: 1024,
      }),
    };

    // Grant permissions
    props.databaseSecret.grantRead(this.functions.emailIngestion);
    props.databaseSecret.grantRead(this.functions.emailProcessing);
    props.databaseSecret.grantRead(this.functions.aiAnalysis);

    // Bedrock permissions for AI functions
    this.functions.aiAnalysis.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:GetModel',
      ],
      resources: ['*'],
    }));
  }
}
```

## Environment Management

### Multi-Environment Setup

```typescript
// bin/nailit-app.ts
import * as cdk from 'aws-cdk-lib';
import { NetworkingStack } from '../lib/core/networking-stack';
import { DatabaseStack } from '../lib/core/database-stack';
import { LambdaStack } from '../lib/compute/lambda-stack';

const app = new cdk.App();

// Development Environment
const devNetworking = new NetworkingStack(app, 'NailIt-Dev-Networking', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
  tags: { Environment: 'dev', Project: 'nailit' },
});

const devDatabase = new DatabaseStack(app, 'NailIt-Dev-Database', {
  vpc: devNetworking.vpc,
  securityGroups: devNetworking.securityGroups,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
  tags: { Environment: 'dev', Project: 'nailit' },
});

const devLambda = new LambdaStack(app, 'NailIt-Dev-Lambda', {
  vpc: devNetworking.vpc,
  securityGroups: devNetworking.securityGroups,
  databaseSecret: devDatabase.database.secret!,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
  tags: { Environment: 'dev', Project: 'nailit' },
});

// Production Environment
const prodNetworking = new NetworkingStack(app, 'NailIt-Prod-Networking', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
  tags: { Environment: 'prod', Project: 'nailit' },
});

// ... similar for prod stacks
```

## Deployment Strategy

### 1. GitHub Actions CI/CD

```yaml
# .github/workflows/infrastructure.yml
name: Infrastructure Deployment

on:
  push:
    branches: [main]
    paths: ['infrastructure/**']
  pull_request:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  infrastructure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd infrastructure
          npm ci
          
      - name: Run CDK diff (PR)
        if: github.event_name == 'pull_request'
        run: |
          cd infrastructure
          npx cdk diff
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          
      - name: Deploy to staging
        if: github.ref == 'refs/heads/main'
        run: |
          cd infrastructure
          npx cdk deploy --all --require-approval never
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### 2. Local Development Workflow

```bash
# Initial setup
cd infrastructure
npm install
npx cdk bootstrap

# Development workflow
npx cdk diff            # Check changes
npx cdk synth           # Generate CloudFormation
npx cdk deploy          # Deploy changes
npx cdk destroy         # Clean up (dev only)
```

## Configuration Management

### Environment-Specific Configuration

```typescript
// lib/config/environment.ts
export interface EnvironmentConfig {
  databaseInstanceType: ec2.InstanceType;
  lambdaMemorySize: number;
  enableMultiAz: boolean;
  backupRetention: cdk.Duration;
  logRetention: logs.RetentionDays;
}

export const environments: { [key: string]: EnvironmentConfig } = {
  dev: {
    databaseInstanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
    lambdaMemorySize: 256,
    enableMultiAz: false,
    backupRetention: cdk.Duration.days(1),
    logRetention: logs.RetentionDays.ONE_WEEK,
  },
  staging: {
    databaseInstanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
    lambdaMemorySize: 512,
    enableMultiAz: true,
    backupRetention: cdk.Duration.days(3),
    logRetention: logs.RetentionDays.ONE_MONTH,
  },
  prod: {
    databaseInstanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
    lambdaMemorySize: 1024,
    enableMultiAz: true,
    backupRetention: cdk.Duration.days(7),
    logRetention: logs.RetentionDays.SIX_MONTHS,
  },
};
```

## Security Best Practices

### 1. IAM Roles and Policies

```typescript
// Principle of least privilege
const lambdaRole = new iam.Role(this, 'EmailProcessorRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
  ],
  inlinePolicies: {
    DatabaseAccess: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue'],
          resources: [databaseSecret.secretArn],
        }),
      ],
    }),
  },
});
```

### 2. Encryption Configuration

```typescript
// KMS keys for encryption
const kmsKey = new kms.Key(this, 'NailItKMSKey', {
  description: 'NailIt encryption key',
  enableKeyRotation: true,
});

// S3 bucket with encryption
const s3Bucket = new s3.Bucket(this, 'NailItStorage', {
  encryption: s3.BucketEncryption.KMS,
  encryptionKey: kmsKey,
  versioned: true,
  lifecycleRules: [{
    id: 'DeleteOldVersions',
    expiration: cdk.Duration.days(90),
  }],
});
```

## Cost Optimization

### 1. Resource Tagging Strategy

```typescript
// Apply consistent tags
cdk.Tags.of(this).add('Project', 'NailIt');
cdk.Tags.of(this).add('Environment', props.environment);
cdk.Tags.of(this).add('CostCenter', 'Engineering');
cdk.Tags.of(this).add('Owner', 'kenny@nailit.com');
```

### 2. Auto-Scaling Configuration

```typescript
// Lambda reserved concurrency
emailProcessor.addAlias('live', {
  reservedConcurrentExecutions: 10,
});

// RDS auto-scaling (for Aurora)
const readReplica = database.addReadReplica('ReadReplica', {
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
});
```

## Monitoring and Observability

### CloudWatch Integration

```typescript
// Custom metrics and alarms
const errorMetric = new cloudwatch.Metric({
  namespace: 'NailIt/EmailProcessing',
  metricName: 'ProcessingErrors',
  statistic: 'Sum',
});

new cloudwatch.Alarm(this, 'EmailProcessingErrors', {
  metric: errorMetric,
  threshold: 10,
  evaluationPeriods: 2,
  alarmDescription: 'High error rate in email processing',
});
```

## Migration Strategy

### Phase 1: Core Infrastructure (Week 1-2)
1. Set up CDK project structure
2. Deploy networking stack (VPC, security groups)
3. Deploy database stack (RDS, ElastiCache)
4. Test connectivity and security

### Phase 2: Compute Layer (Week 3-4)
1. Deploy Lambda functions
2. Set up API Gateway
3. Configure EventBridge
4. Test end-to-end flow

### Phase 3: AI/ML Services (Week 5-6)
1. Configure Bedrock access
2. Set up Transcribe service
3. Deploy AI processing functions
4. Test AI pipeline

## Next Steps

1. **Initialize CDK Project**
   ```bash
   mkdir nailit-infrastructure
   cd nailit-infrastructure
   npx cdk init app --language typescript
   ```

2. **Install Dependencies**
   ```bash
   npm install @aws-cdk/aws-ec2 @aws-cdk/aws-rds @aws-cdk/aws-lambda
   ```

3. **Set up AWS CLI and Credentials**
   ```bash
   aws configure
   npx cdk bootstrap
   ```

4. **Create First Stack**
   - Start with networking stack
   - Deploy to development environment
   - Test and iterate

This approach gives you:
- ✅ **Type Safety**: Catch errors before deployment
- ✅ **Maintainability**: Code-based infrastructure
- ✅ **Scalability**: Easy environment management
- ✅ **Best Practices**: Security and cost optimization built-in
- ✅ **Team Collaboration**: Infrastructure changes in git
- ✅ **CI/CD Ready**: Automated deployments 