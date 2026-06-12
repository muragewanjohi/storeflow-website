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
    question: 'Can I use my own domain?',
    answer: 'Custom domain support is being rolled out. Your store currently uses a DukaNest subdomain, and you can share it professionally while we expand domain options.',
  },
  {
    question: 'Do I need coding knowledge?',
    answer: 'No. DukaNest is built for business owners, not developers. If you can use a smartphone and social media, you can set up and run your store.',
  },
  {
    question: 'Can I receive M-Pesa payments?',
    answer: 'Yes. DukaNest supports M-Pesa and other payment methods so customers can pay directly through your online store.',
  },
  {
    question: 'Can I track expenses?',
    answer: 'Yes. Track operating expenses and COGS in the dashboard and mobile app for clearer profit and loss reporting.',
  },
  {
    question: 'Can customers order via WhatsApp?',
    answer: 'Yes. Share your store link on WhatsApp and other channels. Customers browse and order themselves while you track everything in one place.',
  },
  {
    question: 'Can I add staff?',
    answer: 'Yes. Pro plans support staff accounts with roles and permissions so your team can help manage products, orders, and operations.',
  },
  {
    question: 'How long does setup take?',
    answer: 'Most stores go live in under 20 minutes. Choose a theme, add products, set up payments, and start sharing your store link.',
  },
  {
    question: 'Is there a mobile app?',
    answer: 'Yes. The DukaNest Android app is available on Google Play. Manage products, orders, and analytics from your phone.',
  },
  {
    question: 'Can I manage multiple stores?',
    answer: 'Each account is designed around a single store. Contact us if you need to discuss multi-store requirements for your business.',
  },
  {
    question: 'Is hosting included?',
    answer: 'Yes. Hosting, SSL, and platform maintenance are included in your subscription — no separate hosting bills.',
  },
  {
    question: 'Who is DukaNest for?',
    answer: 'DukaNest is built for small businesses and entrepreneurs selling physical products online, especially those already selling on WhatsApp, Instagram, Facebook, Jiji, or Jumia.',
  },
  {
    question: 'What is included in the 14-day free trial?',
    answer: 'The free trial gives you access to core store features so you can test your storefront, add products, and experience order flow. No credit card is required.',
  },
  {
    question: 'How much does DukaNest cost?',
    answer: 'Plans start from Ksh 1,000 per month. Begin with a free trial and upgrade when you are ready to grow.',
  },
  {
    question: 'Can I manage inventory and orders in one place?',
    answer: 'Yes. Products, stock levels, and customer orders are managed from a single dashboard and mobile app.',
  },
  {
    question: 'Does DukaNest support delivery zones?',
    answer: 'Yes. Set delivery zones and fees so customers see delivery costs upfront at checkout.',
  },
  {
    question: 'Can I upgrade from Basic to Pro?',
    answer: 'Yes. Upgrade anytime as your business grows and you need staff accounts and advanced features.',
  },
  {
    question: 'Is my storefront mobile-friendly?',
    answer: 'Yes. Your store looks great on phones, tablets, and desktops so customers can shop from any device.',
  },
  {
    question: 'What payment methods are supported?',
    answer: 'M-Pesa, card payments via Pesapal, and other options depending on your plan and configuration.',
  },
  {
    question: 'What support do I get?',
    answer: 'Access our Help Center, guides, and support team when you need help launching or growing your store.',
  },
  {
    question: 'What happens if I cancel?',
    answer: 'Cancellation stops future billing. Access and data handling follow your billing terms and platform policy.',
  },
  {
    question: 'Can I try a demo store first?',
    answer: 'Yes. Visit our demo stores page to explore live examples before signing up.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-[#f8f9fb] py-24 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-[#0c0528] md:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-[#8d8d8d]">
            Everything you need to know about getting started with DukaNest.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full rounded-3xl border border-[#eaeaea] bg-white px-6 shadow-sm">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`item-${index}`}>
              <AccordionTrigger className="text-left font-medium text-[#0c0528] hover:text-[#0B33B7]">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-[#555]">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 border-t border-[#eaeaea] pt-8 text-center">
          <p className="mb-4 text-lg text-[#555]">Still have questions?</p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#0B33B7] bg-white px-6 py-3 font-semibold text-[#0B33B7] transition-all hover:bg-[#0B33B7] hover:text-white"
            >
              Contact Us
            </Link>
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0B33B7] to-[#082a94] px-6 py-3 font-semibold text-white shadow-md transition-all hover:-translate-y-0.5"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
