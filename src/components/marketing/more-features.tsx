'use client';

import Link from 'next/link';

const moreFeatures = [
  {
    icon: '📊',
    title: 'Easy to Use Dashboard',
    description: 'Manage your business effortlessly with an intuitive dashboard that gives you full control over products, orders, and analytics in one place.'
  },
  {
    icon: '🔒',
    title: 'Secure Payments',
    description: "Ensure your customers' data is protected with top-tier security for seamless and trusted payment processing."
  },
  {
    icon: '📈',
    title: 'Scalable for Growth',
    description: 'Our platform grows with your business, providing the flexibility to add new products, features, and users easily'
  },
  {
    icon: '💬',
    title: '24/7 Customer Support',
    description: 'Get round-the-clock support whenever you need it. Our team is here to help you with any issues or questions.'
  }
];

export function MoreFeatures() {
  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            <p className="text-[#0025cc] font-medium">Why To Choose Our Template</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#0c0528] leading-tight">
              Bring More Profit With More Features
            </h2>
            <p className="text-[#8d8d8d] leading-relaxed">
              With our platform, you get powerful tools, seamless integrations, and top-notch support to grow your business. We offer reliable performance, user-friendly features, and the flexibility to scale as you do. Choose us for a partner in your success.
            </p>
            <Link href="/customer-register" className="bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-xl transform hover:-translate-y-1 transition-all inline-block">
              Signup Now
            </Link>
          </div>

          {/* Right Content - Features Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {moreFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-2xl border border-[#eaeaea] hover:border-[#0025cc] hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-[#0c0528] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#8d8d8d] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
