/**
 * User-facing copy when OTP email delivery fails (Resend, network, DNS, etc.).
 * Keep API responses and the login UI aligned via these exports.
 */

export const OTP_SUPPORT_EMAIL = 'support@dukanest.com';

export const OTP_EMAIL_SERVICE_ERROR_CODE = 'EMAIL_SERVICE_ERROR';
export const OTP_SENDGRID_CREDITS_ERROR_CODE = 'SENDGRID_CREDITS_EXCEEDED';

/** Plain-text message for JSON APIs (no HTML). */
export function getOtpEmailDeliveryFailureMessage(): string {
  return `We can't send a verification code right now. Please try again later. If you need help, email ${OTP_SUPPORT_EMAIL}.`;
}

export function getOtpEmailSendingLimitMessage(): string {
  return `Our email service has reached its sending limit. Please try again later, or email ${OTP_SUPPORT_EMAIL} for help.`;
}

/** First sentence only — UI can append a linked support email. */
export function getOtpEmailDeliveryFailureLead(): string {
  return "We can't send a verification code right now. Please try again later.";
}

export function getOtpEmailSendingLimitLead(): string {
  return 'Our email service has reached its sending limit. Please try again later.';
}
