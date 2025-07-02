#!/usr/bin/env node

console.log('=== Environment Variable Debug (Updated 2025-06-28) ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
console.log('NEXT_PUBLIC_BUILD_TIME:', process.env.NEXT_PUBLIC_BUILD_TIME);

console.log('\n=== All NEXT_PUBLIC_ Variables ===');
Object.keys(process.env)
  .filter(key => key.startsWith('NEXT_PUBLIC_'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key]}`);
  });

console.log('\n=== All Environment Variables ===');
Object.keys(process.env).sort().forEach(key => {
  console.log(`${key}: ${process.env[key]}`);
}); 