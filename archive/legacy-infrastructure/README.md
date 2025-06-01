# NailIt Infrastructure

AWS CDK infrastructure for the NailIt construction project management system with email monitoring capabilities.

## Overview

This infrastructure stack provides:

- **VPC**: Multi-AZ VPC with public, private, and database subnets
- **RDS PostgreSQL**: Encrypted database for storing email metadata and analysis
- **Redis ElastiCache**: Caching layer for performance optimization  
- **S3**: Secure bucket for email content and attachments
- **SQS**: Queues for email processing pipeline
- **SNS**: Notification system for alerts
- **API Gateway**: REST API for webhooks and external integrations
- **IAM**: Secure roles and policies for Lambda execution
- **KMS**: Encryption key for data at rest
- **CloudWatch**: Logging and monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Internet Gateway                   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────┐
│                 Public Subnets                         │
│  ┌─────────────────┐│┌─────────────────┐                │
│  │   NAT Gateway   ││  │   NAT Gateway   │                │
│  └─────────────────┘│└─────────────────┘                │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────┐
│                Private Subnets                         │
│  ┌─────────────────┐│┌─────────────────┐                │
│  │  Lambda        ││  │  Lambda        │                │
│  │  Functions     ││  │  Functions     │                │
│  └─────────────────┘│└─────────────────┘                │
│  ┌─────────────────┐│┌─────────────────┐                │
│  │  Redis Cache   ││  │  Redis Cache   │                │
│  └─────────────────┘│└─────────────────┘                │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────┐
│              Database Subnets (Isolated)               │
│  ┌─────────────────┐│┌─────────────────┐                │
│  │  PostgreSQL RDS││  │  PostgreSQL RDS│                │
│  └─────────────────┘│└─────────────────┘                │
└─────────────────────┴───────────────────────────────────┘
```

## Prerequisites

1. **AWS CLI** configured with appropriate permissions:
   ```bash
   aws configure
   ```

2. **Node.js 18+** and npm installed

3. **AWS CDK CLI** installed:
   ```bash
   npm install -g aws-cdk
   ```

4. **Docker** (for Lambda function bundling)

## Deployment

### 1. Install Dependencies
```bash
cd infrastructure
npm install
```

### 2. Bootstrap CDK (First time only)
```bash
npx cdk bootstrap
```

### 3. Deploy Development Environment
```bash
npx cdk deploy --context environment=dev
```

### 4. Deploy Production Environment
```bash
npx cdk deploy --context environment=production
```

## Configuration

### Environment Variables

Set these environment variables for your Lambda functions:

- `DATABASE_URL`: RDS connection string (automatically retrieved from Secrets Manager)
- `REDIS_ENDPOINT`: ElastiCache endpoint
- `EMAIL_BUCKET`: S3 bucket name for email storage
- `EMAIL_QUEUE_URL`: SQS queue URL for email processing
- `PROCESSING_QUEUE_URL`: SQS queue URL for AI processing
- `NOTIFICATION_TOPIC_ARN`: SNS topic ARN for notifications

### AWS Bedrock Models

Ensure these models are enabled in your AWS region:
- `anthropic.claude-3-5-sonnet-20241022-v2:0`
- `anthropic.claude-3-haiku-20240307-v1:0`

## Stack Outputs

After deployment, the following outputs are available:

| Output | Description |
|--------|-------------|
| `VpcId` | VPC identifier for Lambda deployment |
| `DatabaseEndpoint` | RDS PostgreSQL endpoint |
| `DatabaseSecretArn` | ARN for database credentials secret |
| `EmailBucketName` | S3 bucket for email storage |
| `EmailQueueUrl` | Email processing queue URL |
| `ProcessingQueueUrl` | AI processing queue URL |
| `NotificationTopicArn` | SNS notification topic ARN |
| `ApiEndpoint` | API Gateway endpoint URL |
| `EncryptionKeyArn` | KMS encryption key ARN |
| `RedisEndpoint` | Redis cluster endpoint |

## Security Features

- **Encryption at Rest**: All data encrypted with KMS
- **VPC Isolation**: Database in isolated subnets
- **Security Groups**: Restrictive network access
- **IAM Policies**: Least privilege access
- **Secrets Manager**: Database credentials rotation
- **Private Subnets**: Lambda functions in private subnets

## Cost Optimization

- **T3.micro instances**: Cost-effective for development
- **S3 Lifecycle**: Automatic transition to cheaper storage classes
- **SQS Dead Letter Queues**: Prevents infinite retry costs
- **CloudWatch Logs**: 30-day retention to control costs

## Monitoring

Monitor your infrastructure with:

- **CloudWatch Metrics**: API Gateway, Lambda, RDS metrics
- **CloudWatch Logs**: Application and infrastructure logs
- **X-Ray Tracing**: Distributed tracing for debugging
- **SNS Notifications**: Alert on critical events

## Cleanup

To destroy the infrastructure:

```bash
npx cdk destroy --context environment=dev
```

⚠️ **Warning**: This will permanently delete all resources and data.

## Next Steps

1. Deploy Lambda functions for email processing
2. Set up email provider webhooks (Gmail, Outlook)
3. Configure Bedrock model access
4. Set up monitoring dashboards
5. Implement CI/CD pipeline

## Support

For issues and questions:
- Check CloudWatch logs for errors
- Review IAM permissions
- Verify VPC connectivity
- Check security group rules
