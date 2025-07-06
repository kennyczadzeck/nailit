#!/usr/bin/env tsx

/**
 * Check AWS Secrets Manager Configuration
 * 
 * This script checks what environment variables are currently
 * configured in AWS Secrets Manager for the App Runner deployment
 */

import { SecretsManagerClient, ListSecretsCommand, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function checkSecretsManager() {
  console.log('🔍 Checking AWS Secrets Manager Configuration...\n');
  
  try {
    // List all secrets that match our naming pattern
    const listCommand = new ListSecretsCommand({
      Filters: [
        {
          Key: 'name',
          Values: ['nailit-']
        }
      ]
    });
    
    const listResponse = await client.send(listCommand);
    
    if (!listResponse.SecretList || listResponse.SecretList.length === 0) {
      console.log('❌ No secrets found matching "nailit-" pattern');
      console.log('\n💡 Expected secrets:');
      console.log('- nailit-database-development');
      console.log('- nailit-nextauth-secret-development');
      console.log('- nailit-google-client-secret-development');
      console.log('- nailit-google-maps-api-key-development');
      return;
    }
    
    console.log(`✅ Found ${listResponse.SecretList.length} secrets:\n`);
    
    // Check each secret
    for (const secret of listResponse.SecretList) {
      console.log(`📋 Secret: ${secret.Name}`);
      console.log(`   Description: ${secret.Description || 'No description'}`);
      console.log(`   Created: ${secret.CreatedDate?.toISOString() || 'Unknown'}`);
      console.log(`   Last Modified: ${secret.LastChangedDate?.toISOString() || 'Unknown'}`);
      
      // Try to get the secret value (just check if it exists, don't print the actual value)
      try {
        const getCommand = new GetSecretValueCommand({
          SecretId: secret.Name
        });
        
        const getResponse = await client.send(getCommand);
        if (getResponse.SecretString) {
          console.log(`   Status: ✅ Has value (${getResponse.SecretString.length} characters)`);
        } else {
          console.log(`   Status: ❌ No value found`);
        }
      } catch (error) {
        console.log(`   Status: ❌ Error accessing secret: ${error}`);
      }
      
      console.log('');
    }
    
    // Check for required secrets
    const requiredSecrets = [
      'nailit-database-development',
      'nailit-nextauth-secret-development', 
      'nailit-nextauth-url-development',
      'nailit-google-client-id-development',
      'nailit-google-client-secret-development',
      'nailit-google-maps-api-key-development'
    ];
    
    console.log('\n🎯 Required Secrets Analysis:');
    
    const foundSecrets = listResponse.SecretList.map((s: Record<string, unknown>) => s.Name);
    
    for (const required of requiredSecrets) {
      const found = foundSecrets.includes(required);
      console.log(`${found ? '✅' : '❌'} ${required}`);
    }
    
    const missingSecrets = requiredSecrets.filter(required => !foundSecrets.includes(required));
    
    if (missingSecrets.length > 0) {
      console.log('\n🚨 Missing Secrets:');
      missingSecrets.forEach(secret => {
        console.log(`- ${secret}`);
      });
      
      console.log('\n💡 To fix the OAuth issue, you likely need to add the missing secrets to AWS Secrets Manager.');
      console.log('   Use the AWS Console or CLI to add these secrets with values from your .env.local file.');
    } else {
      console.log('\n✅ All required secrets are present in AWS Secrets Manager.');
    }
    
  } catch (error) {
    console.error('❌ Error checking AWS Secrets Manager:', error);
    console.log('\n💡 Make sure you have AWS credentials configured and proper permissions.');
  }
}

checkSecretsManager(); 