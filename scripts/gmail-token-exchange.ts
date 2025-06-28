import { getTokens } from './gmail-oauth-setup';

const authorizationCode = process.argv[2];

if (!authorizationCode) {
  console.error('❌ Please provide authorization code as argument');
  console.log('Usage: npm run test:gmail:token <AUTHORIZATION_CODE>');
  console.log('');
  console.log('First run: npm run test:gmail:setup');
  console.log('Then copy the authorization code and run this command.');
  process.exit(1);
}

console.log('🔄 Exchanging authorization code for tokens...');
getTokens(authorizationCode); 