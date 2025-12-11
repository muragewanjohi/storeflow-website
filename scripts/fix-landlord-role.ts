/**
 * Script to fix landlord role for an existing account
 * 
 * Usage: 
 *   npx tsx scripts/fix-landlord-role.ts <email>
 * 
 * Example:
 *   npx tsx scripts/fix-landlord-role.ts admin@example.com
 */

import { createAdminClient } from '../src/lib/supabase/admin';

async function fixLandlordRole(email: string) {
  try {
    if (!email) {
      console.error('Usage: npx tsx scripts/fix-landlord-role.ts <email>');
      process.exit(1);
    }

    const adminClient = createAdminClient();

    // First, find the user by email
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();

    if (listError) {
      console.error('Error fetching users:', listError);
      process.exit(1);
    }

    const user = usersData?.users.find((u) => u.email === email);

    if (!user) {
      console.error(`Error: User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`\nFound user: ${email}`);
    console.log(`Current role: ${user.user_metadata?.role || 'none'}`);
    console.log(`User ID: ${user.id}\n`);

    // Update the user metadata to include landlord role
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          role: 'landlord',
          name: user.user_metadata?.name || 'Admin',
        },
      }
    );

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      process.exit(1);
    }

    console.log('✅ Landlord role updated successfully!\n');
    console.log(`Email: ${email}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Role: landlord`);
    console.log(`Name: ${updateData?.user.user_metadata?.name || 'Not set'}\n`);
    console.log('💡 You can now use this account for E2E tests.');
    console.log(`   Add to .env.test:`);
    console.log(`   TEST_LANDLORD_EMAIL=${email}`);
    console.log(`   TEST_LANDLORD_PASSWORD=your_password_here\n`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const email = args[0];

fixLandlordRole(email);

