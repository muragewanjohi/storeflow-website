/**
 * Onboarding Email Series
 *
 * Day-based onboarding emails for new tenant admins.
 */

import { sendPlatformEmail } from '@/lib/email/service';
import { getTenantStoreUrl } from '@/lib/subscriptions/tenant-url';
import { createOnboardingUnsubscribeToken } from './preferences';

type OnboardingEmailStage = 'day1' | 'day3' | 'day7' | 'day14';

interface OnboardingTenant {
  name: string;
  subdomain: string;
  custom_domain?: string | null;
}

interface SendTenantOnboardingEmailInput {
  to: string;
  tenantId: string;
  tenant: OnboardingTenant;
  stage: OnboardingEmailStage;
}

function getStageContent(stage: OnboardingEmailStage, tenantName: string, dashboardUrl: string, storeUrl: string) {
  switch (stage) {
    case 'day1':
      return {
        subject: `Welcome to DukaNest - ${tenantName} is ready`,
        heading: 'Welcome to DukaNest',
        intro: `Your store ${tenantName} is now live. Let's get your first sales quickly.`,
        bullets: [
          'Add your first products with clear prices and images',
          'Set up delivery options and checkout preferences',
          'Share your store link on WhatsApp and social channels',
        ],
        ctaLabel: 'Go to Dashboard',
        ctaUrl: dashboardUrl,
      };
    case 'day3':
      return {
        subject: `Day 3 setup tips for ${tenantName}`,
        heading: 'Day 3: Finish your core setup',
        intro: 'A complete setup helps customers trust your store and place orders faster.',
        bullets: [
          'Add a logo and complete your store branding',
          'Set delivery zones or flat rates clearly',
          'Review your first 5 products for image quality and descriptions',
        ],
        ctaLabel: 'Complete Store Setup',
        ctaUrl: dashboardUrl,
      };
    case 'day7':
      return {
        subject: `Day 7 growth ideas for ${tenantName}`,
        heading: 'Day 7: Start driving consistent sales',
        intro: 'Now that your store is set up, focus on repeatable growth.',
        bullets: [
          'Create your first promotion or discount campaign',
          'Share product links directly in WhatsApp/Instagram chats',
          'Track orders and top products from your dashboard analytics',
        ],
        ctaLabel: 'Open Analytics',
        ctaUrl: `${dashboardUrl.replace(/\/$/, '')}/analytics`,
      };
    case 'day14':
      return {
        subject: `Day 14 best practices for ${tenantName}`,
        heading: 'Day 14: Keep improving your conversion',
        intro: 'Great stores improve every week. Here are next best practices.',
        bullets: [
          'Keep high-performing products visible on your homepage',
          'Use clear delivery and payment messaging to reduce drop-offs',
          'Review low-stock alerts and restock best sellers early',
        ],
        ctaLabel: 'View Dashboard',
        ctaUrl: dashboardUrl,
      };
    default:
      return {
        subject: `Getting started with ${tenantName}`,
        heading: 'Getting Started',
        intro: 'Welcome to DukaNest.',
        bullets: ['Open your dashboard and continue setup.'],
        ctaLabel: 'Open Dashboard',
        ctaUrl: dashboardUrl,
      };
  }
}

export async function sendTenantOnboardingEmail({
  to,
  tenantId,
  tenant,
  stage,
}: SendTenantOnboardingEmailInput) {
  const dashboardUrl = getTenantStoreUrl(tenant as any, '/dashboard');
  const storeUrl = getTenantStoreUrl(tenant as any);
  const token = createOnboardingUnsubscribeToken(tenantId, to);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
  const content = getStageContent(stage, tenant.name, dashboardUrl, storeUrl);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${content.heading}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #0025cc; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">${content.heading}</h1>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px; padding: 24px;">
          <p style="margin-top: 0;">${content.intro}</p>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Store:</strong> ${tenant.name}</p>
            <p style="margin: 0;"><strong>URL:</strong> <a href="${storeUrl}" style="color: #0025cc;">${storeUrl}</a></p>
          </div>

          <p style="margin-bottom: 8px;"><strong>Recommended next actions:</strong></p>
          <ul style="margin-top: 0;">
            ${content.bullets.map((bullet) => `<li>${bullet}</li>`).join('')}
          </ul>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${content.ctaUrl}" style="display: inline-block; background: #0025cc; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 600;">
              ${content.ctaLabel}
            </a>
          </div>

          <p style="color: #6b7280; font-size: 12px; margin-bottom: 0;">
            You are receiving this onboarding email because you created a DukaNest store recently.
          </p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">
            Don't want onboarding emails? <a href="${unsubscribeUrl}" style="color: #0025cc;">Unsubscribe</a>
          </p>
        </div>
      </body>
    </html>
  `;

  return sendPlatformEmail({
    to,
    subject: content.subject,
    html,
  });
}

