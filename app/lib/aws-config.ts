// AWS Configuration for NailIt
// This file centralizes AWS configuration and environment variables

export const awsConfig = {
  region: process.env.NAILIT_AWS_REGION || 'us-east-1',
  
  // S3 Configuration
  s3: {
    bucketName: process.env.AWS_S3_BUCKET || '',
  },
  
  // SQS Configuration
  sqs: {
    emailQueueUrl: process.env.AWS_SQS_EMAIL_QUEUE || '',
    aiQueueUrl: process.env.AWS_SQS_AI_QUEUE || '',
  },
  
  // SNS Configuration
  sns: {
    topicArn: process.env.AWS_SNS_TOPIC || '',
  },
  
  // Database Configuration
  database: {
    secretArn: process.env.AWS_DATABASE_SECRET_ARN || '',
    endpoint: process.env.AWS_DATABASE_ENDPOINT || '',
  },
};

// Helper function to validate required AWS configuration
export function validateAwsConfig() {
  const required = [
    'NAILIT_AWS_REGION',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`Missing AWS environment variables: ${missing.join(', ')}`);
  }
  
  return missing.length === 0;
}

// Export region for direct use
export const AWS_REGION = awsConfig.region; 