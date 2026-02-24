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
    question: 'Who is DukaNest for?',
    answer: 'DukaNest is built for small businesses and entrepreneurs selling physical products online without their own website. It is ideal for sellers using channels like WhatsApp, Instagram, Facebook, Jiji, and Jumia.',
  },
  {
    question: 'Do I need coding skills to create my store?',
    answer: 'No. You can create and manage your store without writing code. DukaNest is designed for business owners who are comfortable using phones and social media, not developers.',
  },
  {
    question: 'What is included in the 14-day free trial?',
    answer: 'The free trial gives you access to core store setup features so you can test your storefront, add products, and experience order flow before choosing a paid plan. No credit card is required to start.',
  },
  {
    question: 'How much does DukaNest cost?',
    answer: 'DukaNest has affordable plans for small businesses, starting from Ksh 1,000 per month. You can begin with a free trial and upgrade to the plan that matches your stage.',
  },
  {
    question: 'Can I use DukaNest if I currently sell on WhatsApp or Instagram?',
    answer: 'Yes. DukaNest is designed for sellers already taking orders on social and chat channels. It helps you move to a more professional and organized online store experience.',
  },
  {
    question: 'Can I manage products, inventory, and orders in one place?',
    answer: 'Yes. DukaNest provides a single dashboard for managing products, tracking inventory, and handling customer orders.',
  },
  {
    question: 'Does DukaNest support delivery zones and delivery fees?',
    answer: 'Yes. You can set delivery zones and clear fees so customers know delivery charges upfront during checkout.',
  },
  {
    question: 'Can I add staff accounts?',
    answer: 'Yes. Pro is built for growing stores with staff and supports team access and role-based permissions. Basic is better for solo business owners.',
  },
  {
    question: 'Can I move from Basic to Pro later?',
    answer: 'Yes. You can upgrade as your business grows and you need more team and operational capabilities.',
  },
  {
    question: 'Is DukaNest mobile-friendly?',
    answer: 'Yes. Your storefront and dashboard are mobile-friendly, so both you and your customers can use DukaNest from phones.',
  },
  {
    question: 'Can I connect my own domain?',
    answer: 'Custom domain support is not currently available. For now, your store uses a DukaNest subdomain while custom domain functionality is being prepared.',
  },
  {
    question: 'What support do I get if I need help?',
    answer: 'You can use our Help Center guides and contact support for assistance. We are continuously improving onboarding resources to help you launch and grow faster.',
  },
  {
    question: 'What happens if I cancel?',
    answer: 'Cancellation stops future billing. Access and data handling follow your current billing terms and platform policy.',
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
