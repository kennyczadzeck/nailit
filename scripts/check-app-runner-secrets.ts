#!/usr/bin/env tsx

/**
 * Check App Runner Service Configuration
 * 
 * This script checks if the App Runner service is properly configured
 * to use AWS Secrets Manager secrets for environment variables
 */

import { AppRunnerClient, DescribeServiceCommand } from '@aws-sdk/client-apprunner';

const client = new AppRunnerClient({ region: 'us-east-1' });

async function checkAppRunnerSecrets() {
  console.log('🔍 Checking App Runner Service Configuration...\n');
  
  try {
    // The App Runner service ARN for development environment
    // You may need to update this ARN based on your actual service
    const serviceArn = 'arn:aws:apprunner:us-east-1:442433418686:service/nailit-dev/e8b7f6d5a4c3b2a1';
    
    console.log(`📋 Checking service: ${serviceArn}\n`);
    
    const command = new DescribeServiceCommand({
      ServiceArn: serviceArn
    });
    
    const response = await client.send(command);
    
    if (!response.Service) {
      console.log('❌ Service not found');
      return;
    }
    
    const service = response.Service;
    
    console.log(`✅ Service Found: ${service.ServiceName}`);
    console.log(`   Status: ${service.Status}`);
    console.log(`   Service URL: ${service.ServiceUrl}`);
    console.log(`   Created: ${service.CreatedAt?.toISOString()}`);
    console.log(`   Updated: ${service.UpdatedAt?.toISOString()}\n`);
    
    // Check source configuration
    if (service.SourceConfiguration) {
      console.log('📊 Source Configuration:');
      
      if (service.SourceConfiguration.ImageRepository) {
        console.log('   Type: Docker Image');
        console.log(`   Image: ${service.SourceConfiguration.ImageRepository.ImageIdentifier}`);
        console.log(`   Port: ${service.SourceConfiguration.ImageRepository.ImageConfiguration?.Port}`);
        
        // Check environment variables
        const envVars = service.SourceConfiguration.ImageRepository.ImageConfiguration?.RuntimeEnvironmentVariables;
        const envSecrets = service.SourceConfiguration.ImageRepository.ImageConfiguration?.RuntimeEnvironmentSecrets;
        
        if (envVars) {
          console.log('\n🔧 Runtime Environment Variables:');
          Object.entries(envVars).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
          });
        }
        
        if (envSecrets) {
          console.log('\n🔐 Runtime Environment Secrets:');
          Object.entries(envSecrets).forEach(([key, secretConfig]) => {
            console.log(`   ${key}: ${JSON.stringify(secretConfig)}`);
          });
        } else {
          console.log('\n❌ No Runtime Environment Secrets configured!');
          console.log('   This is likely the cause of the OAuth issue.');
        }
        
      } else if (service.SourceConfiguration.CodeRepository) {
        console.log('   Type: Source Code');
        console.log(`   Repository: ${service.SourceConfiguration.CodeRepository.RepositoryUrl}`);
        console.log(`   Branch: ${service.SourceConfiguration.CodeRepository.SourceCodeVersion?.Value}`);
      }
    }
    
    // Check instance configuration
    if (service.InstanceConfiguration) {
      console.log('\n⚙️ Instance Configuration:');
      console.log(`   CPU: ${service.InstanceConfiguration.Cpu}`);
      console.log(`   Memory: ${service.InstanceConfiguration.Memory}`);
      console.log(`   Instance Role ARN: ${service.InstanceConfiguration.InstanceRoleArn || 'Not set'}`);
    }
    
    // Check health check configuration
    if (service.HealthCheckConfiguration) {
      console.log('\n🏥 Health Check Configuration:');
      console.log(`   Protocol: ${service.HealthCheckConfiguration.Protocol}`);
      console.log(`   Path: ${service.HealthCheckConfiguration.Path}`);
      console.log(`   Interval: ${service.HealthCheckConfiguration.Interval} seconds`);
      console.log(`   Timeout: ${service.HealthCheckConfiguration.Timeout} seconds`);
      console.log(`   Healthy Threshold: ${service.HealthCheckConfiguration.HealthyThreshold}`);
      console.log(`   Unhealthy Threshold: ${service.HealthCheckConfiguration.UnhealthyThreshold}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking App Runner service:', error);
    
    if (error instanceof Error && error.message.includes('ResourceNotFoundException')) {
      console.log('\n💡 Service not found. You may need to update the service ARN in this script.');
      console.log('   Use: aws apprunner list-services --region us-east-1');
    } else {
      console.log('\n💡 Make sure you have AWS credentials configured and proper permissions.');
    }
  }
}

checkAppRunnerSecrets(); 