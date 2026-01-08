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
 * Create Contact page template
 */
export function createContactPageTemplate(tenantName: string): PageBuilderData {
  return {
    sections: [
      {
        id: 'contact-hero-1',
        type: 'hero',
        order: 1,
        title: 'Get in Touch',
        subtitle: 'We\'d love to hear from you',
        description: 'Have a question or need assistance? Contact us and we\'ll get back to you as soon as possible.',
      },
      {
        id: 'contact-text-1',
        type: 'text',
        order: 2,
        content: `
          <h2>Contact Information</h2>
          <p>You can reach us through the following methods:</p>
          
          <h3>Email</h3>
          <p>Send us an email and we'll respond within 24 hours.</p>
          
          <h3>Phone</h3>
          <p>Call us during business hours for immediate assistance.</p>
          
          <h3>Address</h3>
          <p>Visit us at our location or send us mail.</p>
          
          <h2>Business Hours</h2>
          <p>Monday - Friday: 9:00 AM - 6:00 PM<br>
          Saturday: 10:00 AM - 4:00 PM<br>
          Sunday: Closed</p>
        `,
      },
      {
        id: 'contact-features-1',
        type: 'features',
        order: 3,
        title: 'Ways to Reach Us',
        columns: 3,
        features: [
          {
            id: 'contact-email',
            title: 'Email Support',
            description: 'Send us an email anytime',
          },
          {
            id: 'contact-phone',
            title: 'Phone Support',
            description: 'Call us during business hours',
          },
          {
            id: 'contact-location',
            title: 'Visit Us',
            description: 'Come see us in person',
          },
        ],
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
  templateGenerator: (tenantName: string) => PageBuilderData;
}

/**
 * Get all additional page templates to create
 */
export function getAdditionalPageTemplates(tenantName: string): PageTemplateConfig[] {
  return [
    {
      slug: 'about',
      title: 'About Us',
      metaTitle: `About ${tenantName} - Our Story`,
      metaDescription: `Learn more about ${tenantName}, our mission, values, and commitment to providing exceptional products and service.`,
      templateGenerator: createAboutPageTemplate,
    },
    {
      slug: 'contact',
      title: 'Contact',
      metaTitle: `Contact ${tenantName} - Get in Touch`,
      metaDescription: `Contact ${tenantName} for questions, support, or inquiries. We're here to help!`,
      templateGenerator: createContactPageTemplate,
    },
    {
      slug: 'shop',
      title: 'Shop',
      metaTitle: `Shop at ${tenantName} - Browse Our Collection`,
      metaDescription: `Browse our wide selection of products at ${tenantName}. Find quality items at great prices.`,
      templateGenerator: createShopPageTemplate,
    },
  ];
}
