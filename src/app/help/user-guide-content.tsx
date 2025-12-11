/**
 * User Guide Content Component
 * 
 * Displays user guide with images and interactive sections
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { 
  ChevronDownIcon, 
  ChevronUpIcon,
  ShoppingCartIcon,
  UserIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  CreditCardIcon,
  TruckIcon,
  HeartIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

interface UserGuideContentProps {
  tenantName?: string | null;
}

export default function UserGuideContent({ tenantName }: UserGuideContentProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          User Guide
        </h1>
        <p className="text-xl text-gray-600">
          Everything you need to know about shopping at {tenantName || 'our store'}
        </p>
      </div>

      {/* Quick Navigation */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="#getting-started" className="flex flex-col items-center p-3 bg-white rounded-lg hover:shadow-md transition">
            <UserIcon className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Getting Started</span>
          </a>
          <a href="#shopping" className="flex flex-col items-center p-3 bg-white rounded-lg hover:shadow-md transition">
            <ShoppingCartIcon className="w-8 h-8 text-green-600 mb-2" />
            <span className="text-sm font-medium">Shopping</span>
          </a>
          <a href="#account" className="flex flex-col items-center p-3 bg-white rounded-lg hover:shadow-md transition">
            <UserIcon className="w-8 h-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium">My Account</span>
          </a>
          <a href="#faq" className="flex flex-col items-center p-3 bg-white rounded-lg hover:shadow-md transition">
            <QuestionMarkCircleIcon className="w-8 h-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium">FAQ</span>
          </a>
        </div>
      </div>

      {/* Getting Started Section */}
      <section id="getting-started" className="mb-12">
        <div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer"
          onClick={() => toggleSection('getting-started')}
        >
          <div className="p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <UserIcon className="w-6 h-6 text-blue-600" />
              Getting Started
            </h2>
            {expandedSections.has('getting-started') ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            )}
          </div>
          {expandedSections.has('getting-started') && (
            <div className="px-6 pb-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Creating an Account</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 mb-4">
                      Creating an account allows you to track orders, save addresses, and enjoy faster checkout.
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                      <li>Click &quot;Sign Up&quot; or &quot;Create Account&quot; in the header</li>
                      <li>Fill in your information (name, email, password)</li>
                      <li>Verify your email address</li>
                      <li>Start shopping!</li>
                    </ol>
                  </div>
                  {/* Screenshot */}
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <Image
                      src="/images/user-guide/signup-page.png"
                      alt="Customer registration form"
                      width={1200}
                      height={800}
                      className="w-full h-auto"
                      unoptimized
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Shopping Section */}
      <section id="shopping" className="mb-12">
        <div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer"
          onClick={() => toggleSection('shopping')}
        >
          <div className="p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <ShoppingCartIcon className="w-6 h-6 text-green-600" />
              Shopping Guide
            </h2>
            {expandedSections.has('shopping') ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            )}
          </div>
          {expandedSections.has('shopping') && (
            <div className="px-6 pb-6 space-y-8">
              {/* Browsing Products */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MagnifyingGlassIcon className="w-5 h-5 text-blue-600" />
                  Browsing Products
                </h3>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Search Products</h4>
                      <p className="text-sm text-gray-600">
                        Use the search bar in the header to find products by name, SKU, or keywords.
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Browse Categories</h4>
                      <p className="text-sm text-gray-600">
                        Click on category names in the navigation to filter products.
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 mb-2">📸 Screenshot: Product Listing Page</p>
                    <p className="text-sm text-gray-400">Add screenshot of product grid with search and filters</p>
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Viewing Product Details</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 mb-4">
                      Click on any product to view detailed information including images, description, price, and variants.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      <li>View product images (click to zoom)</li>
                      <li>Read product description</li>
                      <li>Select variants (size, color, etc.)</li>
                      <li>Check stock availability</li>
                      <li>Add to cart</li>
                    </ul>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 mb-2">📸 Screenshot: Product Detail Page</p>
                    <p className="text-sm text-gray-400">Add screenshot of product page with images and add to cart button</p>
                  </div>
                </div>
              </div>

              {/* Shopping Cart */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <ShoppingCartIcon className="w-5 h-5 text-green-600" />
                  Shopping Cart
                </h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 mb-4">
                      Manage your cart items, update quantities, and proceed to checkout.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      <li>View all items in your cart</li>
                      <li>Update quantities using +/- buttons</li>
                      <li>Remove items you no longer want</li>
                      <li>Continue shopping or proceed to checkout</li>
                    </ul>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 mb-2">📸 Screenshot: Shopping Cart Page</p>
                    <p className="text-sm text-gray-400">Add screenshot of cart with items and checkout button</p>
                  </div>
                </div>
              </div>

              {/* Checkout Process */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CreditCardIcon className="w-5 h-5 text-purple-600" />
                  Checkout Process
                </h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Step-by-Step Checkout</h4>
                    <ol className="list-decimal list-inside space-y-2 text-blue-800">
                      <li>Enter shipping address (or select saved address)</li>
                      <li>Enter billing address</li>
                      <li>Review your order items and totals</li>
                      <li>Select payment method</li>
                      <li>Complete payment</li>
                      <li>Receive order confirmation</li>
                    </ol>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 mb-2">📸 Screenshot: Checkout Page</p>
                    <p className="text-sm text-gray-400">Add screenshot of checkout form with address and payment fields</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Account Management Section */}
      <section id="account" className="mb-12">
        <div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer"
          onClick={() => toggleSection('account')}
        >
          <div className="p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <UserIcon className="w-6 h-6 text-purple-600" />
              Managing Your Account
            </h2>
            {expandedSections.has('account') ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            )}
          </div>
          {expandedSections.has('account') && (
            <div className="px-6 pb-6 space-y-6">
              {/* Profile Management */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Profile & Settings</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Update Profile</h4>
                    <p className="text-sm text-gray-600">
                      Go to &quot;My Account&quot; → &quot;Profile&quot; to update your name, email, and phone number.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Change Password</h4>
                    <p className="text-sm text-gray-600">
                      Use &quot;Forgot Password?&quot; on the login page or update it in account settings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Manage Addresses</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 mb-4">
                    Save multiple addresses for faster checkout. Set a default address for automatic selection.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Add new shipping or billing addresses</li>
                    <li>Edit existing addresses</li>
                    <li>Set default address</li>
                    <li>Delete unused addresses</li>
                  </ul>
                </div>
                <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 mt-4">
                  <p className="text-gray-500 mb-2">📸 Screenshot: Address Management Page</p>
                  <p className="text-sm text-gray-400">Add screenshot of saved addresses list</p>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <TruckIcon className="w-5 h-5 text-blue-600" />
                  Order History & Tracking
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 mb-4">
                    View all your past orders, track shipments, and manage returns.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <h4 className="font-semibold mb-2">View Orders</h4>
                      <p className="text-sm text-gray-600">
                        Go to &quot;My Account&quot; → &quot;Orders&quot; to see all your orders with status and tracking information.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Track Shipments</h4>
                      <p className="text-sm text-gray-600">
                        Click &quot;Track Order&quot; on any shipped order to view real-time tracking updates.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 mt-4">
                  <p className="text-gray-500 mb-2">📸 Screenshot: Order History Page</p>
                  <p className="text-sm text-gray-400">Add screenshot of orders list with tracking info</p>
                </div>
              </div>

              {/* Wishlist */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <HeartIcon className="w-5 h-5 text-red-600" />
                  Wishlist
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 mb-4">
                    Save products you love for later. Add items to your wishlist and purchase them when ready.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Click heart icon on product page to add to wishlist</li>
                    <li>View all saved items in &quot;My Account&quot; → &quot;Wishlist&quot;</li>
                    <li>Add items directly to cart from wishlist</li>
                    <li>Remove items you no longer want</li>
                  </ul>
                </div>
                <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 mt-4">
                  <p className="text-gray-500 mb-2">📸 Screenshot: Wishlist Page</p>
                  <p className="text-sm text-gray-400">Add screenshot of wishlist with saved products</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Support Section */}
      <section id="support" className="mb-12">
        <div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer"
          onClick={() => toggleSection('support')}
        >
          <div className="p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <EnvelopeIcon className="w-6 h-6 text-orange-600" />
              Support & Help
            </h2>
            {expandedSections.has('support') ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            )}
          </div>
          {expandedSections.has('support') && (
            <div className="px-6 pb-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Creating Support Tickets</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 mb-4">
                    Need help? Create a support ticket and our team will assist you.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>Go to &quot;Support&quot; page</li>
                    <li>Click &quot;Create Ticket&quot;</li>
                    <li>Fill in subject, department, priority, and description</li>
                    <li>Attach files if needed</li>
                    <li>Submit and wait for response</li>
                  </ol>
                </div>
                <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 mt-4">
                  <p className="text-gray-500 mb-2">📸 Screenshot: Support Ticket Form</p>
                  <p className="text-sm text-gray-400">Add screenshot of ticket creation form</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="mb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-6">
              <QuestionMarkCircleIcon className="w-6 h-6 text-orange-600" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">How do I reset my password?</h3>
                <p className="text-gray-600">
                  Click &quot;Forgot Password?&quot; on the login page, enter your email, and follow the instructions in the email.
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Do I need an account to shop?</h3>
                <p className="text-gray-600">
                  No, you can shop as a guest. However, creating an account allows you to track orders and save addresses.
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">How do I track my order?</h3>
                <p className="text-gray-600">
                  Go to &quot;My Account&quot; → &quot;Orders&quot;, click on your order, and view the tracking information.
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">What payment methods are accepted?</h3>
                <p className="text-gray-600">
                  Payment methods vary by store. Common methods include credit cards, PayPal, and mobile money (M-Pesa).
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Can I cancel my order?</h3>
                <p className="text-gray-600">
                  Yes, if the order hasn&apos;t been shipped yet. Go to your order details and click &quot;Cancel Order&quot;.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How do I contact support?</h3>
                <p className="text-gray-600">
                  Use the &quot;Support&quot; page to create a ticket, or contact the store owner directly via email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="mb-12">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">💡 Tips & Best Practices</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Shopping Tips</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>Create an account for faster checkout</li>
                <li>Save addresses to speed up future purchases</li>
                <li>Use wishlist to save products for later</li>
                <li>Check product reviews before purchasing</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Account Security</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>Use a strong password (8+ characters)</li>
                <li>Don&apos;t share your password</li>
                <li>Log out on shared computers</li>
                <li>Keep your email updated</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="text-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Still Need Help?</h2>
          <p className="text-gray-600 mb-6">
            Can&apos;t find what you&apos;re looking for? We&apos;re here to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/support"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition"
            >
              <EnvelopeIcon className="w-5 h-5 mr-2" />
              Contact Support
            </a>
            <a
              href="/support"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              Create Support Ticket
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

