'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'What is the membership fee for joining?',
    answer: 'DukaNest offers flexible pricing plans to suit businesses of all sizes. We have free plans for getting started, and paid plans starting from $29/month. All plans include a 14-day free trial so you can try before you commit.',
  },
  {
    question: 'Can I use my own domain name?',
    answer: 'Yes! DukaNest supports custom domains for all plans. You can connect your existing domain or purchase a new one through our platform. Custom domain setup is included in Professional and Enterprise plans.',
  },
  {
    question: 'How many products can I add?',
    answer: 'The number of products depends on your plan. Free plans allow up to 20 products, while paid plans offer unlimited products. Check our pricing section for detailed limits.',
  },
  {
    question: 'Do you offer payment gateway integrations?',
    answer: 'Yes! DukaNest supports 18+ payment gateways including M-Pesa, PayPal, Stripe, Pesapal, and many more. You can accept payments from customers worldwide.',
  },
];

export function FAQ() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Question</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
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
      </div>
    </section>
  );
}
