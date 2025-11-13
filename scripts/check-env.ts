/**
 * Script to check environment configuration
 * Run with: npx ts-node scripts/check-env.ts
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'SUPABASE_SERVICE_KEY',
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'ADMIN_SECRET_CODE',
  'FRONTEND_URL',
];

async function checkEnvironment() {
  console.log('🔍 Checking environment configuration...\n');

  // Check required variables
  let missingVars = 0;
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value || value.includes('YOUR_') || value.includes('your_')) {
      console.log(`❌ ${envVar}: Missing or placeholder value`);
      missingVars++;
    } else {
      console.log(`✅ ${envVar}: Configured`);
    }
  }

  if (missingVars > 0) {
    console.log(`\n⚠️  ${missingVars} environment variable(s) need configuration`);
    console.log('Please check .env file and replace placeholder values\n');
    process.exit(1);
  }

  // Test Supabase connection
  console.log('\n🔗 Testing Supabase connection...');
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );

    const { data, error } = await supabase.from('profiles').select('count').limit(1);

    if (error && !error.message.includes('relation "profiles" does not exist')) {
      console.log(`❌ Supabase connection error: ${error.message}`);
      process.exit(1);
    }

    console.log('✅ Supabase connection successful');
  } catch (error: any) {
    console.log(`❌ Supabase connection failed: ${error.message}`);
    process.exit(1);
  }

  console.log('\n✨ Environment configuration is valid!');
  console.log('\nNext steps:');
  console.log('1. Run: npx prisma generate');
  console.log('2. Run: npx prisma migrate dev --name init');
  console.log('3. Run: pnpm run start:dev\n');
}

checkEnvironment();
