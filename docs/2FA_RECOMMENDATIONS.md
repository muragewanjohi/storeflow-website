# Two-Factor Authentication (2FA) Recommendations

**Last Updated:** 2024

---

## Industry Best Practices

### What Major E-commerce Platforms Do

#### **Shopify**
- ✅ **2FA Available:** Yes, for store owners and staff
- ⚠️ **Mandatory:** Optional for store owners, but store owners can **require** it for staff members
- 📱 **Methods:** Authenticator apps (TOTP), SMS, built-in authenticators
- 💡 **Recommendation:** Shopify encourages 2FA but doesn't force it on store owners

#### **WooCommerce / WordPress**
- ✅ **2FA Available:** Via plugins (Wordfence, iThemes Security, etc.)
- ⚠️ **Mandatory:** Usually optional, but can be enforced via plugins
- 📱 **Methods:** TOTP, Email OTP, SMS, Backup codes

#### **BigCommerce**
- ✅ **2FA Available:** Yes
- ⚠️ **Mandatory:** Optional but recommended
- 📱 **Methods:** Authenticator apps, SMS

#### **Magento / Adobe Commerce**
- ✅ **2FA Available:** Yes (built-in)
- ⚠️ **Mandatory:** Optional, but can be enforced per role
- 📱 **Methods:** TOTP, Email OTP, SMS, Duo Security

---

## Should 2FA Be Mandatory?

### **Recommendation: Make it Optional (But Strongly Encouraged)**

#### ✅ **Reasons to Keep It Optional:**

1. **User Experience**
   - Some users may not have immediate access to email during login
   - Reduces friction for legitimate users
   - Allows gradual adoption

2. **Flexibility**
   - Different users have different security needs
   - Store owners can choose based on their risk tolerance
   - Easier onboarding for new users

3. **Industry Standard**
   - Most platforms (Shopify, WooCommerce) make it optional
   - Users expect choice in security settings
   - Can be made mandatory per organization/tenant

#### ⚠️ **When to Make It Mandatory:**

1. **High-Risk Accounts**
   - Accounts with elevated permissions
   - Accounts handling sensitive data (payment info, customer PII)
   - Accounts with access to financial transactions

2. **Compliance Requirements**
   - PCI DSS (for payment processing)
   - GDPR (for EU data)
   - Industry-specific regulations

3. **Enterprise/Pro Plans**
   - Can be a feature of premium tiers
   - Enterprise customers often expect mandatory 2FA

---

## Email-Based vs. TOTP (Authenticator App)

### **Email-Based 2FA** (Current Implementation)

#### ✅ **Pros:**
- **User-Friendly:** No app installation required
- **Universal Access:** Everyone has email
- **Easy Setup:** No QR code scanning
- **Familiar:** Users understand email codes

#### ❌ **Cons:**
- **Less Secure:** Email accounts can be compromised
- **Dependency:** Requires email service to be working
- **Delays:** Email delivery can be slow
- **Phishing Risk:** Users might fall for fake emails

### **TOTP (Authenticator App)** (Previous Implementation)

#### ✅ **Pros:**
- **More Secure:** Codes generated locally on device
- **Offline:** Works without internet (after initial setup)
- **Fast:** Instant code generation
- **Industry Standard:** Used by Google, Microsoft, GitHub, etc.

#### ❌ **Cons:**
- **Setup Complexity:** Requires QR code scanning
- **Device Dependency:** Need phone/device with app
- **User Friction:** Some users find it confusing

---

## Our Recommendation

### **For Your Platform:**

1. **Default: Email-Based 2FA (Current)**
   - ✅ Easier for users to adopt
   - ✅ No additional setup required
   - ✅ Good balance of security and UX

2. **Optional: TOTP Support (Future)**
   - Offer both methods
   - Let users choose their preferred method
   - More security-conscious users can use TOTP

3. **Mandatory 2FA:**
   - ✅ **MANDATORY for landlord/admin accounts** (Security requirement)
   - ✅ **Mandatory for tenant admins** (Required for all tenant admin accounts)
   - ✅ **Allow store owners to require it for their staff**
   - ✅ **Consider mandatory for Pro/Enterprise plans**

---

## Implementation Recommendations

### **Current Implementation (Email-Based)**

✅ **What We Have:**
- Email OTP codes (6 digits)
- 10-minute expiration
- Database storage with cleanup
- SendGrid integration

✅ **What's Good:**
- Simple and user-friendly
- Works with existing email infrastructure
- Good for most use cases

### **Future Enhancements**

1. **Add TOTP Option**
   - Let users choose between email and TOTP
   - More security-conscious users can use TOTP

2. **Backup Codes**
   - Generate 10 one-time backup codes
   - Users can use if they lose access to email/device
   - Store securely (hashed)

3. **Trusted Devices**
   - Remember device for 30 days
   - Skip 2FA on trusted devices
   - Optional feature

4. **Rate Limiting**
   - Limit OTP requests (e.g., 3 per hour)
   - Prevent abuse and email spam
   - Already implemented in SendGrid

5. **SMS Option** (Optional)
   - Add SMS as third option
   - Requires Twilio or similar service
   - Good for users without reliable email

---

## Security Best Practices

### ✅ **Do:**

1. **Expire Codes Quickly**
   - Current: 10 minutes ✅
   - Industry standard: 5-15 minutes

2. **One-Time Use**
   - Codes can only be used once ✅
   - Mark as used after verification ✅

3. **Rate Limiting**
   - Limit OTP requests per user/IP
   - Prevent brute force attacks
   - Prevent email spam

4. **Secure Storage**
   - Store OTPs in database (not plain text in logs)
   - Hash OTPs if possible (though 6-digit codes are short-lived)
   - Clean up expired codes regularly

5. **Clear Error Messages**
   - Don't reveal if email exists
   - Generic error messages for security

### ❌ **Don't:**

1. **Don't Make Codes Too Long**
   - 6 digits is standard ✅
   - Longer codes are harder to enter

2. **Don't Store Passwords**
   - Never store passwords in plain text
   - Use secure session management

3. **Don't Skip 2FA on Password Reset**
   - Always require 2FA for sensitive operations
   - Even if user just reset password

---

## User Communication

### **Enable 2FA Prompt:**

> "Protect your account with two-factor authentication. We'll send a code to your email each time you log in."

### **During Login:**

> "A 6-digit code has been sent to your email. Please check your inbox and enter the code below."

### **If Code Doesn't Arrive:**

> "Didn't receive the code? Check your spam folder or click 'Resend code'. Codes expire in 10 minutes."

---

## Compliance Considerations

### **PCI DSS (Payment Processing)**
- ✅ 2FA recommended for admin accounts
- ⚠️ May be required for certain operations
- 📋 Check PCI DSS requirements for your use case

### **GDPR (EU Data)**
- ✅ 2FA helps protect personal data
- ✅ Shows due diligence in security
- 📋 Not explicitly required, but recommended

### **SOC 2**
- ✅ 2FA is often required for SOC 2 compliance
- 📋 Check with your compliance team

---

## Summary

### **Our Recommendation:**

1. ✅ **2FA is MANDATORY for Landlord Accounts** (Security requirement - always enforced)
2. ✅ **2FA is Mandatory for Tenant Admins** (Required for all tenant admin accounts, matching landlord security requirements)
3. ✅ **Use Email-Based 2FA** (current implementation)
4. ✅ **Allow Store Owners to Require 2FA for Staff**
5. 🔮 **Future: Add TOTP Option** for more security-conscious users

### **Industry Alignment:**

- ✅ Matches Shopify's approach (optional but recommended)
- ✅ Matches WooCommerce's approach (optional via plugins)
- ✅ Matches most e-commerce platforms

### **User Experience:**

- ✅ Easy to enable (just toggle in settings)
- ✅ Simple to use (check email, enter code)
- ✅ No additional apps or devices required
- ✅ Works for all users (everyone has email)

---

**Conclusion:** Your current email-based 2FA implementation is a good balance of security and user experience. Making it optional (but encouraged) aligns with industry best practices and user expectations.

