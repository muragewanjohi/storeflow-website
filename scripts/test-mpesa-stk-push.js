/**
 * M-Pesa STK Push Test Script
 * 
 * Standalone script to test M-Pesa STK Push functionality
 * Run with: node scripts/test-mpesa-stk-push.js
 * 
 * This script will:
 * 1. Load environment variables from .env.local
 * 2. Initialize M-Pesa service
 * 3. Get OAuth access token
 * 4. Initiate STK Push
 * 5. Display detailed logs for troubleshooting
 */

require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// Configuration from environment
const config = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortCode: process.env.MPESA_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  environment: (process.env.MPESA_ENVIRONMENT || 'sandbox'),
  callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://dukanest.com/api/mpesa/subscription/callback',
};

// Test parameters
const testParams = {
  phoneNumber: '254724511201',
  amount: 1, // Ksh 1
  accountReference: `TEST-${Date.now()}`,
  transactionDesc: 'Test Payment Script',
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logError(message) {
  log(`❌ ERROR: ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Validate configuration
function validateConfig() {
  logSection('1. Validating Configuration');
  
  const missing = [];
  if (!config.consumerKey) missing.push('MPESA_CONSUMER_KEY');
  if (!config.consumerSecret) missing.push('MPESA_CONSUMER_SECRET');
  if (!config.shortCode) missing.push('MPESA_SHORTCODE');
  if (!config.passkey) missing.push('MPESA_PASSKEY');
  
  if (missing.length > 0) {
    logError(`Missing environment variables: ${missing.join(', ')}`);
    logInfo('Please check your .env.local file');
    process.exit(1);
  }
  
  logSuccess('All required environment variables are set');
  logInfo(`Environment: ${config.environment.toUpperCase()}`);
  logInfo(`Base URL: ${config.environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'}`);
  logInfo(`Short Code: ${config.shortCode}`);
  logInfo(`Callback URL: ${config.callbackUrl}`);
  
  if (config.environment === 'production') {
    logWarning('⚠️  USING PRODUCTION ENVIRONMENT - REAL MONEY WILL BE CHARGED!');
  }
  
  return true;
}

// Format phone number
function formatPhoneNumber(phoneNumber) {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    return `254${cleaned.substring(1)}`;
  }
  
  if (cleaned.startsWith('254')) {
    return cleaned;
  }
  
  if (cleaned.length === 9) {
    return `254${cleaned}`;
  }
  
  return cleaned;
}

// Generate timestamp
function generateTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Generate password
function generatePassword(timestamp) {
  const passwordString = `${config.shortCode}${config.passkey}${timestamp}`;
  return Buffer.from(passwordString).toString('base64');
}

// Get OAuth access token
async function getAccessToken() {
  logSection('2. Getting OAuth Access Token');
  
  const baseUrl = config.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
  
  const credentials = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString('base64');
  
  const url = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
  
  logInfo(`Request URL: ${url}`);
  logInfo(`Authorization: Basic ${credentials.substring(0, 20)}...`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });
    
    logInfo(`Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      logError(`Failed to get access token: ${response.status}`);
      logError(`Response: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.access_token) {
      logError('No access_token in response');
      logError(`Response: ${JSON.stringify(data, null, 2)}`);
      throw new Error('Invalid access token response');
    }
    
    logSuccess('Access token obtained successfully');
    logInfo(`Token (first 20 chars): ${data.access_token.substring(0, 20)}...`);
    logInfo(`Expires in: ${data.expires_in} seconds`);
    
    return data.access_token;
  } catch (error) {
    logError(`Error getting access token: ${error.message}`);
    if (error.cause) {
      logError(`Cause: ${error.cause.message || error.cause}`);
    }
    throw error;
  }
}

// Initiate STK Push
async function initiateStkPush(accessToken) {
  logSection('3. Initiating STK Push');
  
  const baseUrl = config.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
  
  const timestamp = generateTimestamp();
  const password = generatePassword(timestamp);
  const phoneNumber = formatPhoneNumber(testParams.phoneNumber);
  const amount = Math.round(testParams.amount);
  
  // Validate phone number
  if (!/^254\d{9}$/.test(phoneNumber)) {
    logError(`Invalid phone number format: ${phoneNumber}`);
    logError('Phone number must be in format: 254XXXXXXXXX (12 digits)');
    throw new Error('Invalid phone number format');
  }
  
  const payload = {
    BusinessShortCode: config.shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerBuyGoodsOnline',
    Amount: amount.toString(),
    PartyA: phoneNumber,
    PartyB: config.shortCode,
    PhoneNumber: phoneNumber,
    CallBackURL: config.callbackUrl,
    AccountReference: testParams.accountReference,
    TransactionDesc: testParams.transactionDesc,
  };
  
  logInfo('Request Details:');
  logInfo(`  Phone Number: ${phoneNumber}`);
  logInfo(`  Amount: ${amount} KES`);
  logInfo(`  Short Code: ${config.shortCode}`);
  logInfo(`  Timestamp: ${timestamp}`);
  logInfo(`  Password (Base64): ${password.substring(0, 30)}...`);
  logInfo(`  Account Reference: ${testParams.accountReference}`);
  logInfo(`  Transaction Desc: ${testParams.transactionDesc}`);
  logInfo(`  Callback URL: ${config.callbackUrl}`);
  
  const url = `${baseUrl}/mpesa/stkpush/v1/processrequest`;
  
  logInfo(`\nRequest URL: ${url}`);
  logInfo(`Request Method: POST`);
  logInfo(`Authorization: Bearer ${accessToken.substring(0, 20)}...`);
  
  logInfo('\nRequest Payload:');
  console.log(JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    logInfo(`\nResponse Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      logError('Failed to parse response as JSON');
      logError(`Raw Response: ${responseText}`);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }
    
    logInfo('\nResponse Body:');
    console.log(JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      logError(`HTTP Error: ${response.status}`);
      logError(`Response Description: ${data.ResponseDescription || data.errorMessage || 'Unknown error'}`);
      throw new Error(`STK Push failed: ${response.status}`);
    }
    
    if (data.ResponseCode !== '0') {
      logError(`M-Pesa Error Code: ${data.ResponseCode}`);
      logError(`Response Description: ${data.ResponseDescription || 'Unknown error'}`);
      throw new Error(`STK Push failed: ${data.ResponseDescription}`);
    }
    
    logSuccess('STK Push initiated successfully!');
    logInfo(`Merchant Request ID: ${data.MerchantRequestID}`);
    logInfo(`Checkout Request ID: ${data.CheckoutRequestID}`);
    logInfo(`Customer Message: ${data.CustomerMessage}`);
    
    logWarning('\n⚠️  Check your phone (254724511201) for the STK Push prompt!');
    logInfo('You should receive a payment request on your phone.');
    logInfo('\n⏳ Waiting 5 seconds, then querying status...');
    
    // Wait a bit then query status
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Query status to see what M-Pesa says
    try {
      await queryStkPushStatus(accessToken, data.CheckoutRequestID);
    } catch (queryError) {
      logWarning('Could not query status (this is optional)');
    }
    
    return {
      merchantRequestID: data.MerchantRequestID,
      checkoutRequestID: data.CheckoutRequestID,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
      customerMessage: data.CustomerMessage,
    };
  } catch (error) {
    logError(`Error initiating STK Push: ${error.message}`);
    if (error.cause) {
      logError(`Cause: ${error.cause.message || error.cause}`);
    }
    throw error;
  }
}

// Query STK Push Status
async function queryStkPushStatus(accessToken, checkoutRequestID) {
  logSection('4. Querying STK Push Status');
  
  const baseUrl = config.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
  
  const timestamp = generateTimestamp();
  const password = generatePassword(timestamp);
  
  const payload = {
    BusinessShortCode: config.shortCode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestID,
  };
  
  logInfo('Query Payload:');
  console.log(JSON.stringify(payload, null, 2));
  
  const url = `${baseUrl}/mpesa/stkpushquery/v1/query`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      logError('Failed to parse query response as JSON');
      logError(`Raw Response: ${responseText}`);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }
    
    logInfo('\nQuery Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.ResultCode === '0') {
      logSuccess('✅ Payment completed successfully!');
    } else if (data.ResultCode === '1032') {
      logWarning('❌ User cancelled the payment');
    } else if (data.ResultCode === '1037') {
      logWarning('⏱️  Payment timeout - STK push expired');
    } else if (data.ResultCode === '1') {
      logError('❌ Payment failed');
      logError(`Result Description: ${data.ResultDesc}`);
    } else if (data.ResultCode === '2002') {
      logError('❌ CRITICAL ERROR: Agent number and Store number mismatch');
      logError(`Result Description: ${data.ResultDesc}`);
      logError('\n🔍 DIAGNOSIS: Till Number Configuration Issue');
      logError('This error means:');
      logError('  - Your Till Number (9584650) may not be properly configured');
      logError('  - There may be a mismatch between Agent number and Store number');
      logError('  - The Till Number may not be activated for Buy Goods transactions');
      logError('\n💡 SOLUTIONS:');
      logError('1. Contact Safaricom to verify Till Number configuration');
      logError('2. Ensure Till Number 9584650 is activated for "Buy Goods"');
      logError('3. Verify Agent number and Store number match in Safaricom system');
      logError('4. Check Safaricom Developer Portal for Till Number status');
      logError('5. Request Safaricom to reconfigure your Till Number if needed');
      logError('\n📞 Contact Safaricom Support:');
      logError('  - Email: developer@safaricom.co.ke');
      logError('  - Provide Till Number: 9584650');
      logError('  - Mention error code: 2002');
      logError('  - Request: Verify Agent/Store number configuration');
    } else if (data.ResultCode === '1031') {
      logError('❌ Unable to process payment');
      logError(`Result Description: ${data.ResultDesc}`);
      logError('\n🔍 DIAGNOSIS: Account or Phone Number Issue');
      logError('Possible causes:');
      logError('  - Phone number not registered with M-Pesa');
      logError('  - M-Pesa account is inactive or suspended');
      logError('  - Insufficient balance');
      logError('  - Phone number does not match registered M-Pesa number');
    } else {
      logWarning(`⚠️  Payment status: ${data.ResultCode}`);
      logWarning(`Result Description: ${data.ResultDesc}`);
    }
    
    return data;
  } catch (error) {
    logError(`Error querying status: ${error.message}`);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    logSection('M-Pesa STK Push Test Script');
    logInfo(`Test Phone: ${testParams.phoneNumber}`);
    logInfo(`Test Amount: ${testParams.amount} KES`);
    logInfo(`Test Reference: ${testParams.accountReference}`);
    
    // Validate configuration
    validateConfig();
    
    // Get access token
    const accessToken = await getAccessToken();
    
    // Initiate STK Push
    const result = await initiateStkPush(accessToken);
    
    logSection('5. Test Summary');
    logSuccess('STK Push request accepted by M-Pesa!');
    logInfo(`Checkout Request ID: ${result.checkoutRequestID}`);
    logInfo(`Merchant Request ID: ${result.merchantRequestID}`);
    
    logWarning('\n⚠️  IMPORTANT: If you did NOT receive STK Push on your phone:');
    logInfo('\n🔍 Troubleshooting Checklist:');
    logInfo('1. ✅ Verify phone number is correct: 254724511201');
    logInfo('2. ✅ Check phone has M-Pesa registered and active');
    logInfo('3. ✅ Ensure phone number matches the one registered with M-Pesa');
    logInfo('4. ✅ Check phone has network connectivity (Safaricom network)');
    logInfo('5. ✅ Verify Till Number (9584650) is active in Safaricom system');
    logInfo('6. ✅ Check M-Pesa account is not suspended or restricted');
    logInfo('7. ✅ Try calling *234# to check M-Pesa account status');
    logInfo('8. ✅ Wait 1-2 minutes - sometimes STK push is delayed');
    logInfo('\n💡 Common Issues:');
    logInfo('- Phone number not registered with M-Pesa');
    logInfo('- M-Pesa account suspended or needs activation');
    logInfo('- Till Number not properly configured in Safaricom');
    logInfo('- Phone number format mismatch (must match registered number)');
    logInfo('\n📞 Next Steps:');
    logInfo('1. Check your phone (254724511201) for STK Push');
    logInfo('2. If no push received, query status using Checkout Request ID');
    logInfo('3. Contact Safaricom support if issue persists');
    logInfo('4. Verify Till Number configuration in Safaricom Developer Portal');
    
  } catch (error) {
    logSection('Error Summary');
    logError(`Test failed: ${error.message}`);
    logInfo('\nTroubleshooting Tips:');
    logInfo('1. Verify your credentials are correct');
    logInfo('2. Check if you\'re using production credentials with production environment');
    logInfo('3. Ensure phone number is registered with M-Pesa');
    logInfo('4. Verify callback URL is publicly accessible');
    logInfo('5. Check network connectivity');
    logInfo('6. Review M-Pesa API documentation for error codes');
    logInfo('\n💡 If you got 200 OK but no STK Push:');
    logInfo('- Phone number may not be registered with M-Pesa');
    logInfo('- M-Pesa account may be inactive or suspended');
    logInfo('- Till Number may not be properly configured');
    logInfo('- Try querying status to see what M-Pesa says');
    process.exit(1);
  }
}

// Run the script
main();
