/**
 * Terms of Service Page
 * 
 * Legal terms and conditions for using DukaNest
 */

export const dynamic = 'force-dynamic';

import MarketingHeader from '@/components/marketing/header';
import { Footer } from '@/components/marketing/footer';

export const metadata = {
  title: 'Terms of Service | DukaNest',
  description: 'Terms and conditions for using DukaNest e-commerce platform',
};

export default function TermsOfServicePage() {
  return (
    <>
      <MarketingHeader />
      <div className="min-h-screen bg-white pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-[#0c0528] mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By accessing or using DukaNest (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). 
                If you disagree with any part of these terms, you may not access the Service.
              </p>
              <p className="text-gray-700 leading-relaxed">
                These Terms apply to all visitors, users, and others who access or use the Service. By using our Service, 
                you agree to comply with and be bound by these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">2. Use License</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Permission is granted to temporarily access the materials on DukaNest&apos;s website for personal, non-commercial 
                transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display (commercial or non-commercial)</li>
                <li>Attempt to decompile or reverse engineer any software contained on DukaNest&apos;s website</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or &quot;mirror&quot; the materials on any other server</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">3. Account Registration</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To access certain features of the Service, you must register for an account. When you register, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and identification</li>
                <li>Accept all responsibility for activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">4. Subscription and Payment</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Some aspects of the Service may be provided for a fee. You will be provided pricing and payment terms prior to 
                any charge. By providing a payment method, you expressly authorize us to charge the applicable fees to that payment method.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Subscription Terms:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Subscriptions automatically renew unless cancelled</li>
                <li>You may cancel your subscription at any time</li>
                <li>Cancellation takes effect at the end of the current billing period</li>
                <li>We reserve the right to change our pricing with 30 days notice</li>
                <li>All fees are non-refundable except as required by law or as stated in our Refund Policy</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">5. Refund Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We want you to be satisfied with your purchase. If you are not satisfied, we offer the following refund options:
              </p>
              
              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">5.1 Subscription Refunds</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Monthly Subscriptions:</strong> You may request a full refund within 14 days of your initial subscription 
                purchase. After 14 days, refunds are prorated based on the remaining unused portion of your subscription period.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Annual Subscriptions:</strong> You may request a full refund within 30 days of your initial subscription 
                purchase. After 30 days, refunds are prorated based on the remaining unused months of your annual subscription.
              </p>

              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">5.2 Product and Service Refunds</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Digital Products:</strong> Due to the nature of digital products, refunds for digital goods (themes, templates, 
                add-ons) are generally not available unless the product is defective or not as described. Refund requests must be 
                submitted within 7 days of purchase.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Services:</strong> Refunds for services (custom development, setup assistance, etc.) are evaluated on a 
                case-by-case basis. If you are not satisfied with a service, please contact us within 7 days of service completion.
              </p>

              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">5.3 Refund Process</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                To request a refund:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                <li>Contact our support team at support@dukanest.com</li>
                <li>Provide your account information and order details</li>
                <li>Explain the reason for your refund request</li>
                <li>We will review your request and respond within 5 business days</li>
              </ol>
              <p className="text-gray-700 leading-relaxed mb-4">
                Approved refunds will be processed to your original payment method within 10-14 business days.
              </p>

              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">5.4 Non-Refundable Items</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The following are not eligible for refunds:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Services that have been fully completed and delivered</li>
                <li>Digital products that have been downloaded or accessed</li>
                <li>Third-party fees (payment processing, domain registration, etc.)</li>
                <li>Refunds requested after the specified time periods above</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">6. User Content</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You retain ownership of any content you submit, post, or display on or through the Service (&quot;User Content&quot;). 
                By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, 
                modify, and distribute your User Content solely for the purpose of operating and providing the Service.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are responsible for your User Content and agree not to submit content that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Violates any law or regulation</li>
                <li>Infringes on the rights of others</li>
                <li>Is defamatory, harassing, or abusive</li>
                <li>Contains viruses or malicious code</li>
                <li>Is spam or unsolicited commercial content</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">7. Prohibited Uses</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may not use the Service:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>To submit false or misleading information</li>
                <li>To upload or transmit viruses or any other type of malicious code</li>
                <li>To collect or track the personal information of others</li>
                <li>To spam, phish, pharm, pretext, spider, crawl, or scrape</li>
                <li>For any obscene or immoral purpose</li>
                <li>To interfere with or circumvent the security features of the Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">8. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service and its original content, features, and functionality are and will remain the exclusive property of 
                DukaNest and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and 
                trade dress may not be used in connection with any product or service without our prior written consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">9. Termination</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or 
                liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited 
                to a breach of the Terms.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you wish to terminate your account, you may simply discontinue using the Service or contact us to request 
                account deletion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">10. Disclaimer</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The information on this Service is provided on an &quot;as is&quot; basis. To the fullest extent permitted by law, DukaNest:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Excludes all representations, warranties, and conditions relating to our Service and the use of this Service</li>
                <li>Excludes all liability for damages arising out of or in connection with your use of this Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">11. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                In no event shall DukaNest, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable 
                for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of 
                profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">12. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms shall be interpreted and governed by the laws of the jurisdiction in which DukaNest operates, without 
                regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be 
                considered a waiver of those rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">13. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is 
                material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a 
                material change will be determined at our sole discretion.
              </p>
              <p className="text-gray-700 leading-relaxed">
                By continuing to access or use our Service after any revisions become effective, you agree to be bound by the 
                revised terms. If you do not agree to the new terms, you are no longer authorized to use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">14. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>Email:</strong> support@dukanest.com</p>
                <p className="text-gray-700 mb-2"><strong>Phone:</strong> 1-800-DUKA-NEST</p>
                <p className="text-gray-700"><strong>Address:</strong> 123 Commerce Street, San Francisco, CA 94102</p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

