/**
 * Script to manually add a subdomain to Vercel
 * 
 * Usage: npx tsx scripts/add-subdomain-to-vercel.ts myduka
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { addTenantDomain } from '../src/lib/vercel-domains';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

const subdomain = process.argv[2];
const projectId = process.env.VERCEL_PROJECT_ID;

if (!subdomain) {
  console.error('Usage: npx tsx scripts/add-subdomain-to-vercel.ts <subdomain>');
  console.error('Example: npx tsx scripts/add-subdomain-to-vercel.ts myduka');
  process.exit(1);
}

if (!projectId) {
  console.error('Error: VERCEL_PROJECT_ID environment variable is not set');
  console.error('Add it to your .env.local file');
  process.exit(1);
}

const domain = `${subdomain}.dukanest.com`;

async function main() {
  try {
    console.log(`Adding ${domain} to Vercel project ${projectId}...`);
    
    const result = await addTenantDomain(domain, projectId);
    
    console.log('✅ Success!');
    console.log(`Domain ${domain} has been added to Vercel.`);
    console.log(`SSL certificate will be issued automatically (takes 5-15 minutes).`);
    console.log(`\nYou can check status at: https://vercel.com/dashboard`);
    console.log(`\nDomain info:`, JSON.stringify(result, null, 2));
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('✅ Domain already exists in Vercel');
      console.log('This is fine - the domain is already configured.');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

main();

