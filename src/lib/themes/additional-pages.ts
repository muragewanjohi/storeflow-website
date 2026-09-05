/**
 * Additional Page Templates
 * 
 * Generates page builder content for standard pages (About, Contact, Shop)
 * that are created automatically when a theme is installed.
 */

import { PageBuilderData, PageSection } from '@/lib/content/page-builder-types';

/**
 * Create About Us page template
 */
export function createAboutPageTemplate(tenantName: string): PageBuilderData {
  return {
    sections: [
      {
        id: 'about-hero-1',
        type: 'hero',
        order: 1,
        title: `About ${tenantName}`,
        subtitle: 'Our Story',
        description: `Welcome to ${tenantName}. We are committed to providing exceptional products and outstanding customer service.`,
        cta_text: 'Shop Now',
        cta_link: '/products',
      },
      {
        id: 'about-text-1',
        type: 'text',
        order: 2,
        content: `
          <h2>Our Mission</h2>
          <p>At ${tenantName}, we believe in delivering quality products and exceptional service to our customers. Our mission is to make shopping easy, enjoyable, and accessible for everyone.</p>
          
          <h2>Our Values</h2>
          <ul>
            <li><strong>Quality First:</strong> We carefully select every product to ensure it meets our high standards.</li>
            <li><strong>Customer Focus:</strong> Your satisfaction is our top priority.</li>
            <li><strong>Innovation:</strong> We continuously improve our services and offerings.</li>
            <li><strong>Integrity:</strong> We conduct business with honesty and transparency.</li>
          </ul>
          
          <h2>Why Choose Us?</h2>
          <p>With years of experience and a dedicated team, we've built a reputation for excellence. We're here to serve you and help you find exactly what you're looking for.</p>
        `,
      },
      {
        id: 'about-features-1',
        type: 'features',
        order: 3,
        title: 'What We Offer',
        subtitle: 'Discover the benefits of shopping with us',
        columns: 3,
        features: [
          {
            id: 'feature-1',
            title: 'Quality Products',
            description: 'Carefully curated selection of high-quality items',
          },
          {
            id: 'feature-2',
            title: 'Fast Shipping',
            description: 'Quick and reliable delivery to your doorstep',
          },
          {
            id: 'feature-3',
            title: 'Customer Support',
            description: 'Dedicated team ready to assist you',
          },
        ],
      },
    ],
  };
}

/**
 * Create Contact page template with hero and split layout
 * @param tenantName - Name of the tenant/store
 * @param contactFormId - Optional ID of the contact form to embed
 * @param contactEmail - Optional contact email address
 */
export function createContactPageTemplate(tenantName: string, contactFormId?: string, contactEmail?: string): PageBuilderData {
  const emailAddress = contactEmail || 'info@example.com';
  return {
    sections: [
      {
        id: 'contact-split-1',
        type: 'split_layout',
        order: 1,
        layout_ratio: '50-50',
        mobile_behavior: 'stack',
        reverse_desktop: false,
        left_side: {
          type: 'text',
          title: 'Contact Information',
          content: `
            <p>You can reach us through the following channels:</p>
            
            <div style="margin-top: 24px;">
              <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 20px;">
                <div style="width: 24px; height: 24px; flex-shrink: 0; margin-top: 4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 100%; height: 100%;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <strong>Email</strong><br>
                  <a href="mailto:${emailAddress}" style="color: #14b8a6; text-decoration: none;">${emailAddress}</a>
                </div>
              </div>
              
              <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 20px;">
                <div style="width: 24px; height: 24px; flex-shrink: 0; margin-top: 4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 100%; height: 100%;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                </div>
                <div>
                  <strong>Response Time</strong><br>
                  We typically respond within 24 hours during business days.
                </div>
              </div>
              
              <div style="display: flex; align-items: start; gap: 12px; margin-bottom: 20px;">
                <div style="width: 24px; height: 24px; flex-shrink: 0; margin-top: 4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 100%; height: 100%;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15.75h1.5a.75.75 0 00.75-.75v-1.372a.75.75 0 00-.363-.643l-4.5-2.651a.75.75 0 00-.786 0L6.75 21.75a.75.75 0 01-.75-.75v-4.5A.75.75 0 014.5 16.5l1.5-.432M15.75 21.75v-8.25" />
                  </svg>
                </div>
                <div>
                  <strong>Business Hours</strong><br>
                  Monday - Friday: 9:00 AM - 6:00 PM
                </div>
              </div>
            </div>
            
            <div style="margin-top: 32px; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
              <strong>Need Immediate Help?</strong><br>
              <p style="margin: 8px 0 0 0; font-size: 14px;">For urgent matters, please send an email to <a href="mailto:${emailAddress}" style="color: #14b8a6; text-decoration: none;">${emailAddress}</a> with 'URGENT' in the subject line.</p>
            </div>
          `,
          text_alignment: 'left',
        },
        right_side: {
          type: 'form',
          form_id: contactFormId || undefined,
        },
        spacing: {
          section_padding_top: 64,
          section_padding_bottom: 64,
          column_gap: 48,
          content_padding: 32,
        },
      },
      {
        id: 'contact-location-1',
        type: 'location',
        order: 2,
        title: 'Find Us',
        subtitle: 'Visit us at our office',
        address: 'Loita Street, Nairobi, Kenya',
        map_type: 'roadmap',
        zoom: 15,
        height: 400,
        show_info_window: true,
      },
    ],
  };
}

/**
 * Create Shop page template
 */
export function createShopPageTemplate(tenantName: string): PageBuilderData {
  return {
    sections: [
      {
        id: 'shop-hero-1',
        type: 'hero',
        order: 1,
        title: 'Shop',
        subtitle: 'Browse Our Collection',
        description: `Discover our wide selection of products at ${tenantName}. Find exactly what you're looking for.`,
        cta_text: 'View All Products',
        cta_link: '/products',
      },
      {
        id: 'shop-products-1',
        type: 'products',
        order: 2,
        title: 'Featured Products',
        subtitle: 'Our most popular items',
        limit: 12,
        columns: 4,
      },
      {
        id: 'shop-text-1',
        type: 'text',
        order: 3,
        content: `
          <h2>Shop with Confidence</h2>
          <p>At ${tenantName}, we offer a wide variety of products to meet all your needs. Browse our categories, use filters to find exactly what you're looking for, and enjoy secure checkout with multiple payment options.</p>
          
          <h3>What You Can Expect</h3>
          <ul>
            <li>Wide selection of quality products</li>
            <li>Competitive prices</li>
            <li>Secure payment processing</li>
            <li>Easy returns and exchanges</li>
          </ul>
        `,
      },
    ],
  };
}

/**
 * Page template configuration
 */
export interface PageTemplateConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  templateGenerator: (tenantName: string, contactFormId?: string, contactEmail?: string) => PageBuilderData;
}

/**
 * Get all additional page templates to create
 */
export function getAdditionalPageTemplates(tenantName: string): PageTemplateConfig[] {
  return [
    {
      slug: 'about',
      title: '', // Empty title to allow full customization via page builder
      metaTitle: `About ${tenantName} - Our Story`,
      metaDescription: `Learn more about ${tenantName}, our mission, values, and commitment to providing exceptional products and service.`,
      templateGenerator: createAboutPageTemplate,
    },
    {
      slug: 'contact',
      title: '', // Empty title to allow full customization via page builder
      metaTitle: `Contact ${tenantName} - Get in Touch`,
      metaDescription: `Contact ${tenantName} for questions, support, or inquiries. We're here to help!`,
      templateGenerator: createContactPageTemplate,
    },
    {
      slug: 'shop',
      title: '', // Empty title to allow full customization via page builder
      metaTitle: `Shop at ${tenantName} - Browse Our Collection`,
      metaDescription: `Browse our wide selection of products at ${tenantName}. Find quality items at great prices.`,
      templateGenerator: createShopPageTemplate,
    },
  ];
}
