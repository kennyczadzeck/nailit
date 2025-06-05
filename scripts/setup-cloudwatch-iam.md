# CloudWatch Logging Setup for AWS Amplify

## Option 1: IAM Role (Recommended - Most Secure)

### 1. Create IAM Policy

Create a new IAM policy with these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream", 
                "logs:PutLogEvents",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams"
            ],
            "Resource": [
                "arn:aws:logs:us-east-1:*:log-group:/nailit/*",
                "arn:aws:logs:us-east-1:*:log-group:/nailit/*:*"
            ]
        }
    ]
}
```

### 2. Create IAM Role

1. Go to IAM Console → Roles → Create role
2. Select "AWS service" → "Lambda" (as Amplify runs on Lambda)
3. Attach the policy created above
4. Name it: `AmplifyCloudWatchLogsRole`

### 3. Configure Amplify Service Role

1. Go to Amplify Console → Your App → App settings → General
2. Edit "Service role" 
3. Select the role created above or create a new one with CloudWatch permissions

## Option 2: Access Keys (Simpler - Less Secure)

### 1. Create IAM User

1. Go to IAM Console → Users → Create user
2. Username: `nailit-cloudwatch-user`
3. Attach the CloudWatch policy above
4. Create access keys

### 2. Add Environment Variables to Amplify

Go to Amplify Console → Your App → Environment variables:

```
AWS_ACCESS_KEY_ID = your-access-key-id
AWS_SECRET_ACCESS_KEY = your-secret-access-key
AWS_REGION = us-east-1
```

## Testing

After setup, test with:
- `/api/test-cloudwatch` - Direct CloudWatch test
- `/api/debug-env` - Check credential status
- `/api/test-logging` - Full logging test

## Troubleshooting

If you see "Could not load credentials":
1. Check environment variables are set
2. Verify IAM permissions
3. Check AWS region configuration
4. Ensure role is attached to Amplify service

## Current Status

Your app currently shows:
- ✅ Environment detection working
- ✅ AWS infrastructure configured  
- ❌ CloudWatch credentials missing
- ✅ Winston logging working (console/file)

Once credentials are configured, CloudWatch logs will appear in:
`/nailit/staging/application` log group 