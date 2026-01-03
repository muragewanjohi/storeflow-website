/**
 * Cookie Policy Page
 * 
 * Explains how DukaNest uses cookies and similar tracking technologies
 */

import MarketingHeader from '@/components/marketing/header';
import { Footer } from '@/components/marketing/footer';

export const metadata = {
  title: 'Cookie Policy | DukaNest',
  description: 'Cookie policy explaining how DukaNest uses cookies and tracking technologies',
};

export default function CookiePolicyPage() {
  return (
    <>
      <MarketingHeader />
      <div className="min-h-screen bg-white pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl font-bold text-[#0c0528] mb-4">Cookie Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">1. What Are Cookies?</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Cookies are small text files that are placed on your device when you visit a website. They are widely used to 
                make websites work more efficiently and provide information to website owners. Cookies allow a website to 
                recognize your device and store some information about your preferences or past actions.
              </p>
              <p className="text-gray-700 leading-relaxed">
                We use cookies and similar tracking technologies to track activity on our Service and hold certain information. 
                Cookies are files with a small amount of data which may include an anonymous unique identifier.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">2. Types of Cookies We Use</h2>
              
              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">2.1 Essential Cookies</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                These cookies are necessary for the Service to function and cannot be switched off in our systems. They are usually 
                only set in response to actions made by you, such as setting your privacy preferences, logging in, or filling in forms. 
                You can set your browser to block or alert you about these cookies, but some parts of the Service may not work.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Examples:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Authentication cookies (to keep you logged in)</li>
                <li>Session cookies (to maintain your session)</li>
                <li>Security cookies (to protect against fraud)</li>
                <li>Load balancing cookies (to distribute traffic)</li>
              </ul>

              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">2.2 Performance and Analytics Cookies</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our Service. 
                They help us understand how visitors interact with our Service by providing information about areas visited, time spent, 
                and any issues encountered.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Examples:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Google Analytics cookies</li>
                <li>Page view tracking</li>
                <li>Error tracking cookies</li>
                <li>Performance monitoring</li>
              </ul>

              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">2.3 Functionality Cookies</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                These cookies enable the Service to provide enhanced functionality and personalization. They may be set by us or by 
                third-party providers whose services we have added to our pages.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Examples:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Language preference cookies</li>
                <li>Region/location cookies</li>
                <li>User preference cookies</li>
                <li>Remember me cookies</li>
              </ul>

              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">2.4 Targeting and Advertising Cookies</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                These cookies may be set through our Service by our advertising partners. They may be used to build a profile of your 
                interests and show you relevant advertisements on other sites. They do not store directly personal information but are 
                based on uniquely identifying your browser and internet device.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Examples:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Social media advertising cookies</li>
                <li>Retargeting cookies</li>
                <li>Conversion tracking cookies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">3. Third-Party Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Service, 
                deliver advertisements, and so on. These third parties may include:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Google Analytics:</strong> To analyze how visitors use our Service</li>
                <li><strong>Payment Processors:</strong> To process payments securely</li>
                <li><strong>Social Media Platforms:</strong> To enable social sharing features</li>
                <li><strong>Advertising Networks:</strong> To deliver relevant advertisements</li>
                <li><strong>Customer Support Tools:</strong> To provide customer support services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">4. How Long Do Cookies Last?</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Cookies can be either &quot;persistent&quot; or &quot;session&quot; cookies:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Session Cookies:</strong> These are temporary cookies that expire when you close your browser. They help 
                us remember what you did on one page when you move to the next page within the same session.</li>
                <li><strong>Persistent Cookies:</strong> These cookies remain on your device for a set period or until you delete them. 
                They help us remember your preferences and actions across multiple visits.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">5. How to Control Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your 
                preferences in your browser settings. Most browsers allow you to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>See what cookies you have and delete them individually</li>
                <li>Block third-party cookies</li>
                <li>Block all cookies from specific sites</li>
                <li>Block all cookies</li>
                <li>Delete all cookies when you close your browser</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-[#0c0528] mb-3 mt-6">5.1 Browser-Specific Instructions</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                To manage cookies in your browser, follow these links:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[#0025cc] hover:underline">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-[#0025cc] hover:underline">Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[#0025cc] hover:underline">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/windows/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-[#0025cc] hover:underline">Microsoft Edge</a></li>
              </ul>

              <p className="text-gray-700 leading-relaxed mb-4 mt-4">
                <strong>Note:</strong> If you choose to block cookies, some features of our Service may not function properly or may 
                not be available to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">6. Do Not Track Signals</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Some browsers include a &quot;Do Not Track&quot; (DNT) feature that signals to websites you visit that you do not want to have 
                your online activity tracked. Currently, there is no standard for how DNT signals should be interpreted. As a result, 
                our Service does not currently respond to DNT browser signals or mechanisms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">7. Other Tracking Technologies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                In addition to cookies, we may use other similar tracking technologies, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Web Beacons:</strong> Small graphic images that may be included in our Service or emails</li>
                <li><strong>Pixel Tags:</strong> Used to read cookies and track email open rates</li>
                <li><strong>Local Storage:</strong> HTML5 local storage to store information on your device</li>
                <li><strong>Session Storage:</strong> Temporary storage that is cleared when you close your browser</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">8. Updates to This Cookie Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, 
                legal, or regulatory reasons. We will notify you of any material changes by posting the new Cookie Policy on this 
                page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0c0528] mb-4">9. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
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

