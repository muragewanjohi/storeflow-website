/**
 * About Us Page
 * 
 * Public-facing about page for the storefront
 */

import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenant-context/server';
import StorefrontHeader from '@/components/storefront/header-server';
import StorefrontFooter from '@/components/storefront/footer';
import ThemeProviderWrapper from '@/components/storefront/theme-provider-wrapper';
import { generateStorefrontMetadata } from '@/lib/seo/storefront-metadata';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await requireTenant();
  return generateStorefrontMetadata({
    tenant,
    title: 'About Us',
    description: `Learn more about ${tenant.name || tenant.subdomain}. Our story, mission, and values.`,
    url: '/about',
  });
}

export default async function AboutPage() {
  const tenant = await requireTenant();

  return (
    <ThemeProviderWrapper>
      <div className="min-h-screen flex flex-col bg-white">
        <StorefrontHeader />
        <main className="flex-1">
          {/* Hero Section */}
          <div className="bg-gradient-to-b from-gray-50 to-white py-16 px-4">
            <div className="container mx-auto max-w-4xl text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                About {tenant.name || 'Us'}
              </h1>
              <p className="text-xl text-gray-600">
                Your trusted online store for quality products
              </p>
            </div>
          </div>

          {/* Content Section */}
          <div className="container mx-auto max-w-4xl px-4 py-12">
            <div className="prose prose-lg max-w-none">
              {/* Our Story */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Welcome to {tenant.name || 'our store'}! We started with a simple mission: to provide 
                  high-quality products at affordable prices, delivered right to your doorstep.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  What began as a small operation has grown into a trusted online marketplace, 
                  serving thousands of satisfied customers every day.
                </p>
              </section>

              {/* Our Mission */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We believe that everyone deserves access to quality products without breaking the bank. 
                  That&apos;s why we carefully curate our selection, partnering with reliable suppliers to 
                  bring you the best value.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Quality First</h3>
                    <p className="text-gray-600">
                      Every product is carefully selected and tested to meet our high standards.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Fast Delivery</h3>
                    <p className="text-gray-600">
                      We process orders quickly and ship them promptly to get products to you fast.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Customer Care</h3>
                    <p className="text-gray-600">
                      Our support team is always ready to help with any questions or concerns.
                    </p>
                  </div>
                </div>
              </section>

              {/* Why Choose Us */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Us</h2>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-700">Wide selection of quality products</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-700">Competitive prices and regular discounts</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-700">Secure payment processing</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-700">Fast and reliable shipping</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-700">Excellent customer support</span>
                  </li>
                </ul>
              </section>

              {/* Call to Action */}
              <section className="bg-primary text-white p-8 rounded-lg text-center">
                <h2 className="text-2xl font-bold mb-4">Start Shopping Today</h2>
                <p className="mb-6">
                  Browse our catalog and discover amazing products at great prices
                </p>
                <a 
                  href="/products"
                  className="inline-block bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  View Products
                </a>
              </section>
            </div>
          </div>
        </main>
        <StorefrontFooter />
      </div>
    </ThemeProviderWrapper>
  );
}
