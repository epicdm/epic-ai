/**
 * Database Schema Diagnostic Script
 *
 * This script checks the actual database schema to identify
 * the column naming pattern used in the memberships table.
 *
 * Run with: npx tsx scripts/check-db-schema.ts
 *
 * Prerequisites:
 * - DATABASE_URL environment variable must be set
 * - Must be run from the root of the project
 */

import { PrismaClient } from '@epic-ai/database';

const prisma = new PrismaClient();

async function checkDatabaseSchema() {
  console.log('🔍 Checking Database Schema...\n');

  try {
    // Test 1: Check if we can query memberships table
    console.log('Test 1: Querying memberships table...');
    const membershipCount = await prisma.membership.count();
    console.log(`✅ Found ${membershipCount} memberships in database\n`);

    // Test 2: Try to fetch a sample membership
    console.log('Test 2: Fetching sample membership...');
    const sampleMembership = await prisma.membership.findFirst();

    if (sampleMembership) {
      console.log('✅ Sample membership retrieved:');
      console.log(JSON.stringify(sampleMembership, null, 2));
      console.log('');
    } else {
      console.log('⚠️  No memberships found in database\n');
    }

    // Test 3: Check column names with raw query
    console.log('Test 3: Checking actual column names in memberships table...');
    const result = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'memberships'
      ORDER BY ordinal_position;
    `;

    console.log('✅ Memberships table columns:');
    console.table(result);
    console.log('');

    // Test 4: Identify column naming pattern
    console.log('Test 4: Identifying column naming pattern...');
    const columnNames = result.map(col => col.column_name);

    const hasUserId = columnNames.includes('userId');
    const hasUser_id = columnNames.includes('user_id');
    const hasOrganizationId = columnNames.includes('organizationId');
    const hasOrganization_id = columnNames.includes('organization_id');

    console.log('Column name patterns:');
    console.log(`  - "userId" (camelCase): ${hasUserId ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`  - "user_id" (snake_case): ${hasUser_id ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`  - "organizationId" (camelCase): ${hasOrganizationId ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`  - "organization_id" (snake_case): ${hasOrganization_id ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log('');

    // Test 5: Recommend which pattern to use
    console.log('Test 5: Recommendation for createOrganization() fix...');
    if (hasUser_id && hasOrganization_id) {
      console.log('✅ RECOMMENDATION: Use snake_case pattern (Pattern 3)');
      console.log('   The database uses snake_case columns (user_id, organization_id)');
      console.log('   This means Prisma @map directive should work correctly.');
    } else if (hasUserId && hasOrganizationId) {
      console.log('✅ RECOMMENDATION: Use camelCase pattern (Pattern 2)');
      console.log('   The database uses camelCase columns (userId, organizationId)');
      console.log('   This is unusual - database might need schema sync.');
    } else {
      console.log('⚠️  UNKNOWN PATTERN: Column names don\'t match expected patterns');
      console.log('   Please check the column names above and update the script.');
    }
    console.log('');

    // Test 6: Try to create a test membership (dry run)
    console.log('Test 6: Testing membership creation patterns...');
    console.log('⚠️  Skipping actual creation to avoid test data');
    console.log('   Use the Facebook Quick Setup to test in staging environment');
    console.log('');

  } catch (error) {
    console.error('❌ Error checking database schema:', error);

    if (error instanceof Error) {
      console.error('\nError details:');
      console.error('  Message:', error.message);
      console.error('  Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnostic
checkDatabaseSchema()
  .then(() => {
    console.log('✅ Database schema check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
