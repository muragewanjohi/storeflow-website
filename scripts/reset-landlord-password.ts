/**
 * Script to reset landlord password
 * 
 * Usage: 
 *   npx tsx scripts/reset-landlord-password.ts <email> <new-password>
 * 
 * Example:
 *   npx tsx scripts/reset-landlord-password.ts admin@example.com NewPassword123!
 */

import { createAdminClient } from '../src/lib/supabase/admin';

async function resetLandlordPassword(email: string, newPassword: string) {
  try {
    if (!email || !newPassword) {
      console.error('Usage: npx tsx scripts/reset-landlord-password.ts <email> <new-password>');
      process.exit(1);
    }

    if (newPassword.length < 8) {
      console.error('Error: Password must be at least 8 characters long');
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

    // Verify it's a landlord
    if (user.user_metadata?.role !== 'landlord') {
      console.error(`Error: User ${email} is not a landlord (role: ${user.user_metadata?.role || 'none'})`);
      process.exit(1);
    }

    // Update the password using admin client
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
      }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      process.exit(1);
    }

    console.log('\n✅ Password updated successfully!\n');
    console.log(`Email: ${email}`);
    console.log(`User ID: ${user.id}`);
    console.log('\n💡 Update your .env.test file:');
    console.log(`TEST_LANDLORD_EMAIL=${email}`);
    console.log(`TEST_LANDLORD_PASSWORD=${newPassword}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const email = args[0];
const newPassword = args[1];

resetLandlordPassword(email, newPassword);

