/**
 * Script to find landlord account email
 * 
 * Usage: npx tsx scripts/find-landlord-account.ts
 */

import { createAdminClient } from '../src/lib/supabase/admin';

async function findLandlordAccounts() {
  try {
    const adminClient = createAdminClient();

    // List all users from Supabase Auth
    const { data, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users:', error);
      process.exit(1);
    }

    if (!data || !data.users || data.users.length === 0) {
      console.log('No users found in Supabase Auth.');
      console.log('\nTo create a landlord account:');
      console.log('1. Visit http://localhost:3000/admin/register');
      console.log('2. Or use the registration API: POST /api/auth/landlord/register');
      process.exit(0);
    }

    // Filter for landlord users
    const landlordUsers = data.users.filter(
      (user) => user.user_metadata?.role === 'landlord'
    );

    if (landlordUsers.length === 0) {
      console.log('No landlord accounts found.');
      console.log('\nTo create a landlord account:');
      console.log('1. Visit http://localhost:3000/admin/register');
      console.log('2. Or use the registration API: POST /api/auth/landlord/register');
      console.log('\nAll users found:');
      data.users.forEach((user) => {
        console.log(`  - ${user.email} (role: ${user.user_metadata?.role || 'none'})`);
      });
      process.exit(0);
    }

    console.log('\n✅ Landlord Accounts Found:\n');
    landlordUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.user_metadata?.name || 'Not set'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log('');
    });

    console.log('\n💡 To use in tests, add to .env.test:');
    console.log(`TEST_LANDLORD_EMAIL=${landlordUsers[0].email}`);
    console.log('TEST_LANDLORD_PASSWORD=your_password_here');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findLandlordAccounts();

