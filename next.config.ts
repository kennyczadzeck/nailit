import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // Re-enabled, switching to Redoc for API docs
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  
  // Optimize for serverless deployment
  output: 'standalone',
  
  // Force environment variables to be available at runtime
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_MIGRATION_URL: process.env.DATABASE_MIGRATION_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NAILIT_AWS_REGION: process.env.NAILIT_AWS_REGION,
    NAILIT_S3_BUCKET: process.env.NAILIT_S3_BUCKET,
    NAILIT_SQS_EMAIL_QUEUE: process.env.NAILIT_SQS_EMAIL_QUEUE,
    NAILIT_SNS_TOPIC: process.env.NAILIT_SNS_TOPIC,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
  
  /* config options here */
};

export default nextConfig;
