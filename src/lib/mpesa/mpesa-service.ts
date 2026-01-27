/**
 * M-Pesa Service
 * 
 * Handles all M-Pesa API interactions for subscription payments
 * Uses Buy Goods (Till Number) for subscription payments
 * 
 * Based on Safaricom M-Pesa API Documentation
 * Reference: https://developer.safaricom.co.ke/
 */

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  passkey: string;
  environment: 'sandbox' | 'production';
}

export interface StkPushRequest {
  phoneNumber: string; // Format: 254XXXXXXXXX
  amount: number; // Amount in KES
  accountReference: string; // Unique subscription reference
  transactionDesc: string; // Description
  callbackUrl: string;
}

export interface StkPushResponse {
  merchantRequestID: string;
  checkoutRequestID: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export interface StkPushQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

export class MpesaService {
  private config: MpesaConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: MpesaConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    
    // Log environment on initialization (for debugging)
    console.log(`[MpesaService] Initialized with environment: ${config.environment}`);
    console.log(`[MpesaService] Using base URL: ${this.baseUrl}`);
  }

  /**
   * Generate OAuth access token
   * Tokens are valid for 1 hour (3600 seconds)
   * We cache tokens and refresh 5 minutes before expiry
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date(Date.now() + 5 * 60 * 1000)) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString('base64');

    try {
      const response = await fetch(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          method: 'GET',
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get M-Pesa access token: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('Invalid access token response from M-Pesa');
      }

      const token: string = data.access_token;
      this.accessToken = token;
      // Set expiry to 55 minutes (token is valid for 1 hour, refresh early)
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);

      return token;
    } catch (error) {
      console.error('[MpesaService] Error getting access token:', error);
      throw error;
    }
  }

  /**
   * Generate STK Push password
   * Password = Base64(SHORTCODE + PASSKEY + TIMESTAMP)
   * 
   * Format: YYYYMMDDHHmmss (14 digits)
   */
  private generatePassword(): { password: string; timestamp: string } {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
    
    const passwordString = `${this.config.shortCode}${this.config.passkey}${timestamp}`;
    const password = Buffer.from(passwordString).toString('base64');

    return { password, timestamp };
  }

  /**
   * Format phone number to M-Pesa format (254XXXXXXXXX)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      return `254${cleaned.substring(1)}`;
    }
    
    // If already starts with 254, return as is
    if (cleaned.startsWith('254')) {
      return cleaned;
    }
    
    // If 9 digits, assume it's missing 254 prefix
    if (cleaned.length === 9) {
      return `254${cleaned}`;
    }
    
    // Return as is if already in correct format
    return cleaned;
  }

  /**
   * Initiate STK Push for subscription payment
   * Uses CustomerBuyGoodsOnline transaction type for Till Number
   */
  async initiateStkPush(request: StkPushRequest): Promise<StkPushResponse> {
    const accessToken = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();

    // Format phone number (ensure it starts with 254)
    const phoneNumber = this.formatPhoneNumber(request.phoneNumber);

    // Validate phone number format
    if (!/^254\d{9}$/.test(phoneNumber)) {
      throw new Error('Invalid phone number format. Must be 254XXXXXXXXX');
    }

    // Round amount (M-Pesa requires whole numbers, no decimals)
    const amount = Math.round(request.amount);
    
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const payload = {
      BusinessShortCode: this.config.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline', // Buy Goods transaction type
      Amount: amount.toString(), // M-Pesa requires string
      PartyA: phoneNumber,
      PartyB: this.config.shortCode, // Till Number
      PhoneNumber: phoneNumber,
      CallBackURL: request.callbackUrl,
      AccountReference: request.accountReference,
      TransactionDesc: request.transactionDesc,
    };

    try {
      console.log(`[MpesaService] Initiating STK Push to: ${this.baseUrl}/mpesa/stkpush/v1/processrequest`);
      console.log(`[MpesaService] Phone: ${phoneNumber}, Amount: ${amount}, ShortCode: ${this.config.shortCode}`);
      
      const response = await fetch(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[MpesaService] STK Push HTTP error: ${response.status}`, errorText);
        throw new Error(`STK Push request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log(`[MpesaService] STK Push response:`, {
        ResponseCode: data.ResponseCode,
        ResponseDescription: data.ResponseDescription,
        CustomerMessage: data.CustomerMessage,
      });

      // M-Pesa returns ResponseCode: "0" for success
      if (data.ResponseCode !== '0') {
        console.error(`[MpesaService] STK Push failed with code: ${data.ResponseCode}`, data.ResponseDescription);
        throw new Error(data.ResponseDescription || `STK Push request failed (Code: ${data.ResponseCode})`);
      }

      return {
        merchantRequestID: data.MerchantRequestID,
        checkoutRequestID: data.CheckoutRequestID,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription,
        customerMessage: data.CustomerMessage,
      };
    } catch (error) {
      console.error('[MpesaService] Error initiating STK Push:', error);
      throw error;
    }
  }

  /**
   * Query STK Push status
   * Use this to check payment status if callback is delayed
   */
  async queryStkPushStatus(checkoutRequestID: string): Promise<StkPushQueryResponse> {
    const accessToken = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();

    const payload = {
      BusinessShortCode: this.config.shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestID,
    };

    try {
      const response = await fetch(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`STK Push query failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[MpesaService] Error querying STK Push status:', error);
      throw error;
    }
  }
}

// Singleton instance
let mpesaServiceInstance: MpesaService | null = null;

/**
 * Get M-Pesa service instance (singleton)
 * Creates instance on first call using environment variables
 */
export function getMpesaService(): MpesaService {
  if (!mpesaServiceInstance) {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const environment = (process.env.MPESA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

    if (!consumerKey || !consumerSecret || !shortCode || !passkey) {
      throw new Error(
        'M-Pesa configuration is missing. Please set the following environment variables:\n' +
        '- MPESA_CONSUMER_KEY\n' +
        '- MPESA_CONSUMER_SECRET\n' +
        '- MPESA_SHORTCODE (your Till Number)\n' +
        '- MPESA_PASSKEY\n' +
        '- MPESA_ENVIRONMENT (optional, defaults to sandbox)'
      );
    }

    mpesaServiceInstance = new MpesaService({
      consumerKey,
      consumerSecret,
      shortCode,
      passkey,
      environment,
    });
  }

  return mpesaServiceInstance;
}
