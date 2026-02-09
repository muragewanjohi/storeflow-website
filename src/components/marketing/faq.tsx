'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'What is included in the 14-day free trial?',
    answer: 'The 14-day free trial includes full access to all features of your chosen plan. You can build your store, add products, configure payment methods, customize themes, and test all functionality. No credit card required to start. After 14 days, you can choose to continue with a paid subscription or your trial will end.',
  },
  
  {
    question: 'Can I use my own domain name?',
    answer: 'Custom domain support is not currently available, but it\'s a feature we\'re actively working on. For now, your store will use a DukaNest subdomain. We\'ll notify all users when custom domain support becomes available. This feature will allow you to connect your existing domain or purchase a new one through our platform.',
  },

  {
    question: 'Do you support multiple languages and currencies?',
    answer: 'Yes! Basic plans support 2 languages, Pro plans support 4 languages, and Premium plans offer unlimited languages. You can also configure multiple currencies, set up currency conversion, and provide localized shopping experiences for customers in different regions.',
  },
  {
    question: 'How do I manage orders and inventory?',
    answer: 'DukaNest includes comprehensive order management with status tracking (Pending, Processing, Shipped, Delivered), order history, and customer communication. Inventory management features include stock tracking, low stock alerts, bulk inventory updates, and inventory history. All plans include these core features.',
  },
  {
    question: 'What analytics and reporting features are available?',
    answer: 'Basic plans include essential analytics (sales, orders, customers). Pro and Premium plans include advanced analytics with conversion funnel tracking, geographic analytics, product performance insights, real-time analytics, period comparisons, and scheduled reports. You can export data for further analysis.',
  },
  {
    question: 'Can I add staff members to manage my store?',
    answer: 'Yes! You can add staff users with different roles and permissions. Basic plans allow 1 staff user, Pro plans allow 5 staff users, and Premium plans allow 10 staff users. Each staff member can have customized access levels to products, orders, customers, and settings.',
  },
  {
    question: 'Do you offer shipping and delivery zone management?',
    answer: 'Yes! All plans include delivery zone configuration, allowing you to set up shipping rates for different regions. You can configure multiple delivery zones, set shipping costs, and manage fulfillment. Order tracking and customer notifications are included.',
  },
  {
    question: 'Can I create custom pages and blog posts?',
    answer: 'Absolutely! All plans include custom page creation (Basic: 10 pages, Pro: 50 pages, Premium: Unlimited). Blog functionality is available on all plans, with Basic offering unlimited blog posts. You can create About pages, Terms & Conditions, Privacy Policy, and more.',
  },
  {
    question: 'What happens if I exceed my plan limits?',
    answer: 'If you approach your plan limits, you\'ll receive notifications. For products and orders, you can upgrade to a higher plan. Storage limits can be increased by upgrading. We make it easy to upgrade your plan at any time to accommodate your growing business.',
  },
  {
    question: 'Is there a mobile app for managing my store?',
    answer: 'DukaNest is fully responsive and works seamlessly on mobile devices. You can manage your store, view orders, add products, and access all features from any smartphone or tablet through your web browser. Native mobile apps are planned for future releases.',
  },
 
];

export function FAQ() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <p className="text-[#0025cc] font-medium mb-2">Got Questions?</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#0c0528]">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-lg text-[#8d8d8d] max-w-2xl mx-auto">
            Find answers to common questions about DukaNest features, pricing, and how to get started with your online store.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* CTA after FAQ */}
        <div className="text-center mt-12 pt-8 border-t">
          <p className="text-lg text-[#555] mb-4">Still have questions?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/contact" 
              className="bg-white text-[#0025cc] px-6 py-3 rounded-lg border-2 border-[#0025cc] hover:bg-[#0025cc] hover:text-white transition-all font-semibold inline-flex items-center justify-center gap-2"
            >
              Contact Us
            </Link>
            <Link 
              href="/register" 
              className="group bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-6 py-3 rounded-lg hover:shadow-xl transition-all inline-flex items-center justify-center gap-2 font-semibold"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
