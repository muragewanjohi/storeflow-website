/**
 * Privacy Policy Page
 * 
 * Privacy policy explaining how DukaNest collects, uses, and protects user data
 */

export const dynamic = 'force-dynamic';

import MarketingHeader from '@/components/marketing/header';
import { Footer } from '@/components/marketing/footer';

export const metadata = {
  title: 'Privacy Policy | DukaNest',
  description: 'Privacy policy explaining how DukaNest collects, uses, and protects user data',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <MarketingHeader />
      <div className="min-h-screen bg-white pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-[#0c0528] mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                DukaNest (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we 
                collect, use, disclose, and safeguard your information when you use our Service. Please read this Privacy Policy 
                carefully. If you do not agree with the terms of this Privacy Policy, please do not access the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">2.1 Information You Provide</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Account Information:</strong> Name, email address, phone number, password, and billing information</li>
                <li><strong>Profile Information:</strong> Business name, address, website URL, and other profile details</li>
                <li><strong>Payment Information:</strong> Credit card details, billing address, and payment history (processed securely through third-party payment processors)</li>
                <li><strong>Content:</strong> Product information, images, descriptions, and other content you upload to the Service</li>
                <li><strong>Communications:</strong> Messages, support tickets, and other communications you send to us</li>
              </ul>

              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">2.2 Information We Collect Automatically</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                When you use our Service, we automatically collect certain information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent, and other usage statistics</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers, and mobile network information</li>
                <li><strong>Location Data:</strong> General location information based on your IP address</li>
                <li><strong>Cookies and Tracking Technologies:</strong> Information collected through cookies, web beacons, and similar technologies (see our Cookie Policy for more details)</li>
              </ul>

              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">2.3 Information from Third Parties</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may receive information about you from third-party services, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Payment processors (transaction details)</li>
                <li>Analytics providers (usage statistics)</li>
                <li>Social media platforms (if you connect your account)</li>
                <li>Marketing partners (referral information)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Provide, maintain, and improve our Service</li>
                <li>Process transactions and send related information</li>
                <li>Send you technical notices, updates, security alerts, and support messages</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, prevent, and address technical issues and fraudulent activity</li>
                <li>Personalize and improve your experience</li>
                <li>Send you marketing communications (with your consent)</li>
                <li>Comply with legal obligations and enforce our terms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">4. How We Share Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share your information in the following circumstances:
              </p>
              
              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">4.1 Service Providers</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share your information with third-party service providers who perform services on our behalf, such as:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Payment processing</li>
                <li>Data analytics</li>
                <li>Email delivery</li>
                <li>Cloud hosting</li>
                <li>Customer support</li>
              </ul>

              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">4.2 Business Transfers</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                If we are involved in a merger, acquisition, or asset sale, your information may be transferred as part of that transaction.
              </p>

              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">4.3 Legal Requirements</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may disclose your information if required to do so by law or in response to valid requests by public authorities.
              </p>

              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">4.4 With Your Consent</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share your information with your explicit consent or at your direction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">5. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement appropriate technical and organizational security measures to protect your information against 
                unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication</li>
                <li>Secure payment processing</li>
                <li>Regular backups and disaster recovery procedures</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to 
                use commercially acceptable means to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">6. Your Privacy Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Objection:</strong> Object to processing of your personal information</li>
                <li><strong>Restriction:</strong> Request restriction of processing</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                To exercise these rights, please contact us at support@dukanest.com. We will respond to your request within 
                a reasonable timeframe.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">7. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy 
                Policy, unless a longer retention period is required or permitted by law. When we no longer need your information, 
                we will securely delete or anonymize it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">8. Children&apos;s Privacy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our Service is not intended for children under the age of 13. We do not knowingly collect personal information 
                from children under 13. If you are a parent or guardian and believe your child has provided us with personal 
                information, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your information may be transferred to and processed in countries other than your country of residence. These 
                countries may have data protection laws that differ from those in your country. We take appropriate measures to 
                ensure your information receives adequate protection in accordance with this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy 
                Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically 
                for any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">11. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy, please contact us at:
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

