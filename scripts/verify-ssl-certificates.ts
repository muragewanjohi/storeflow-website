/**
 * SSL Certificate Verification Script
 * 
 * This script verifies SSL certificates for all domains and subdomains.
 * 
 * Usage:
 *   tsx scripts/verify-ssl-certificates.ts
 */

import * as https from 'https';
import * as tls from 'tls';

interface SSLInfo {
  domain: string;
  valid: boolean;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
  daysUntilExpiry?: number;
  error?: string;
}

function getSSLInfo(domain: string): Promise<SSLInfo> {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      method: 'GET',
      rejectUnauthorized: false, // We'll check manually
    };

    const req = https.request(options, (res) => {
      const socket = res.socket as tls.TLSSocket;
      const cert = socket.getPeerCertificate(true);

      if (cert && cert.valid_from && cert.valid_to) {
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const now = new Date();
        const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        resolve({
          domain,
          valid: now >= validFrom && now <= validTo,
          issuer: cert.issuer?.CN || cert.issuer?.O || 'Unknown',
          validFrom,
          validTo,
          daysUntilExpiry,
        });
      } else {
        resolve({
          domain,
          valid: false,
          error: 'Could not retrieve certificate information',
        });
      }
    });

    req.on('error', (error) => {
      resolve({
        domain,
        valid: false,
        error: error.message,
      });
    });

    req.end();
  });

  req.on('error', (error) => {
    resolve({
      domain,
      valid: false,
      error: error.message,
    });
  });
}

async function verifyDomain(domain: string): Promise<SSLInfo> {
  console.log(`🔍 Checking SSL for ${domain}...`);
  const info = await getSSLInfo(domain);
  return info;
}

async function main() {
  console.log('🔒 SSL Certificate Verification\n');
  console.log('='.repeat(60) + '\n');

  const domains = [
    'www.dukanest.com',
    'dukanest.com',
    'test-deployment.dukanest.com', // Test subdomain
  ];

  const results: SSLInfo[] = [];

  for (const domain of domains) {
    const info = await verifyDomain(domain);
    results.push(info);
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 SSL Certificate Status:\n');

  results.forEach((info) => {
    const icon = info.valid ? '✅' : '❌';
    console.log(`${icon} ${info.domain}`);

    if (info.valid) {
      console.log(`   Issuer: ${info.issuer}`);
      console.log(`   Valid From: ${info.validFrom?.toLocaleDateString()}`);
      console.log(`   Valid To: ${info.validTo?.toLocaleDateString()}`);
      
      if (info.daysUntilExpiry !== undefined) {
        if (info.daysUntilExpiry < 30) {
          console.log(`   ⚠️  Warning: Certificate expires in ${info.daysUntilExpiry} days!`);
        } else {
          console.log(`   ✅ Certificate expires in ${info.daysUntilExpiry} days`);
        }
      }
    } else {
      console.log(`   ❌ Error: ${info.error || 'Invalid certificate'}`);
    }
    console.log('');
  });

  // Summary
  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.filter((r) => !r.valid).length;

  console.log('='.repeat(60));
  console.log(`✅ Valid: ${validCount}`);
  console.log(`❌ Invalid: ${invalidCount}`);
  console.log(`📊 Total: ${results.length}\n`);

  if (invalidCount > 0) {
    console.log('⚠️  Some certificates are invalid. Please check the errors above.\n');
    process.exit(1);
  } else {
    console.log('🎉 All SSL certificates are valid!\n');
    process.exit(0);
  }
}

main();
