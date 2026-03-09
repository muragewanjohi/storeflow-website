'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Plus, Store, Smartphone, Shield, TrendingUp, Zap } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { trackMetaPixelEvent } from '@/lib/analytics/meta-pixel';

const trustPills = ['No credit card', '14-day free trial', '2,500+ stores'];

const featureCards = [
  { icon: Smartphone, title: 'Mobile First', text: 'Everything at your fingertips', gradient: 'from-emerald-500 to-teal-500' },
  { icon: Zap, title: 'Fast setup', text: 'Live in 5 minutes', gradient: 'from-amber-500 to-orange-500' },
  { icon: Shield, title: 'Secure & safe', text: 'SSL included free', gradient: 'from-sky-500 to-cyan-500' },
  { icon: TrendingUp, title: 'Grow sales', text: 'Track everything', gradient: 'from-violet-500 to-fuchsia-500' },
];

const steps = [
  { title: 'Sign up', time: '2 min', text: 'Create account in 2 minutes', icon: Plus, color: 'from-fuchsia-500 to-pink-500' },
  { title: 'Setup Your Store', time: '10 min', text: 'Customize your store !', icon: Store, color: 'from-sky-500 to-cyan-500' },
  { title: 'Add Products', time: '5 min', text: 'Upload your products with photos.', icon: Check, color: 'from-emerald-500 to-teal-500' },
  { title: 'Start selling', time: 'Now', text: 'Share your store link', icon: ArrowRight, color: 'from-orange-500 to-red-500' },
];

const quickAnswers = [
  {
    q: 'How quickly can I start?',
    a: "Most stores go live in under 20 minutes. Just sign up, add products, and you're ready to sell.",
  },
  {
    q: 'Does it really work?',
    a: 'Yes. DukaNest is mobile-first for both store owners and customers.',
  },
  {
    q: 'What if I need help?',
    a: 'We provide support and guides so you can launch confidently.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, you can cancel any time. No long-term lock-in.',
  },
];

const testimonials = [
  { initials: 'SK', name: 'Sarah Kimani', company: 'Nairobi Fashion', quote: 'Got my store online in 20 minutes. Works perfectly!', metric: 'KSh 100K	/month' },
  { initials: 'DO', name: 'David Ochieng', company: 'TechZone Kenya', quote: 'Best decision for my electronics store. Customers love it.', metric: 'KSh 200K/month' },
  { initials: 'MW', name: 'Mary Wanjiku', company: "Mama's Kitchen", quote: 'So easy to use! Taking orders has never been this simple.', metric: 'KSh 80K/month' },
];

export function MobileLandingPage() {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[440px] overflow-x-hidden bg-white text-[#101828]">
      <section className="relative bg-gradient-to-b from-[#eff6ff] via-white to-white px-4 pb-12 pt-4">
        <div className="pointer-events-none absolute -left-20 top-40 h-48 w-48 rounded-full bg-[#e9d4ff]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#bedbff]/30 blur-3xl" />

        <header className="flex h-14 items-center">
          <Link href="/" className="relative flex h-8 w-[170px] items-center">
            {!logoError ? (
              <img
                src="/logo_with_name.png"
                alt="DukaNest"
                className="h-8 w-auto object-contain object-left"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-[32px] font-black leading-none text-[#355cad]">DukaNest</span>
            )}
          </Link>
        </header>

        <div className="mt-8 rounded-full border border-[#bedbff] bg-gradient-to-r from-[#dbeafe] to-[#f3e8ff] px-4 py-2 text-center text-[13px] font-bold text-[#355cad]">
          <span className="inline-flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Built for Kenyan Businesses
          </span>
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-[36px] font-black leading-[45px] tracking-[-0.9px]">
            Sell online in
            <br />
            <span className="bg-gradient-to-b from-[#355cad] to-[#4a7bd9] bg-clip-text text-transparent">
              5 minutes
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-[330px] text-[18px] leading-[29px] text-[#4a5565]">
            Launch your online store in minutes. Scale without limits.
          </p>
        </div>

        <Link
          href="/register"
          onClick={() => trackMetaPixelEvent('Lead', { content_name: 'Start free trial', content_category: 'mobile_hero' })}
          className="mt-7 flex h-[68px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#355cad] to-[#4a7bd9] text-[18px] font-bold text-white shadow-[0_20px_25px_rgba(43,127,255,0.3),0_8px_10px_rgba(43,127,255,0.3)]"
        >
          Start free trial
          <ArrowRight className="h-5 w-5" />
        </Link>

        <p className="mt-5 text-center text-sm text-[#6a7282]">
          {trustPills.join(' • ')}
        </p>

        <div className="mt-10 overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
          <div className="bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] p-2">
            <div className="relative h-[600px] w-full overflow-hidden rounded-2xl">
              <img src="/man_in_shop.jpg" alt="DukaNest preview" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12">
        <h2 className="text-center text-[24px] font-black leading-8">Loved by businesses</h2>
        <p className="mt-1 text-center text-[16px] leading-6 text-[#4a5565]">See what they&apos;re saying</p>

        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
          {testimonials.map((item) => (
            <article
              key={item.name}
              className="min-h-[328px] min-w-[320px] snap-start rounded-3xl border border-[#dbeafe] bg-gradient-to-br from-[#eff6ff] to-[#faf5ff] p-6"
            >
              <p className="text-lg text-[#f59e0b]">★★★★★</p>
              <p className="mt-3 text-[18px] font-semibold leading-7">&ldquo;{item.quote}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-[#355cad] to-[#4a7bd9] text-sm font-bold text-white">
                  {item.initials}
                </div>
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm text-[#4a5565]">{item.company}</p>
                </div>
              </div>
              <div className="mt-4 border-t border-[#bedbff] pt-3">
                <p className="text-xs uppercase tracking-wide text-[#6a7282]">Monthly Sales</p>
                <p className="text-xl font-black text-[#355cad]">{item.metric}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#d1d5dc]" />
          <span className="h-2 w-2 rounded-full bg-[#d1d5dc]" />
          <span className="h-2 w-2 rounded-full bg-[#d1d5dc]" />
        </div>
      </section>

      <section className="bg-gradient-to-b from-[#eff6ff] to-white px-4 py-12">
        <h2 className="text-center text-[30px] font-black">Why DukaNest?</h2>
        <p className="mt-1 text-center text-base text-[#4a5565]">Built for Kenyan entrepreneurs</p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          {featureCards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="min-h-[176px] rounded-3xl border border-[#f3f4f6] bg-white p-5 shadow-[0_10px_15px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.1)]">
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} text-white`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-[18px] font-black leading-7">{item.title}</h3>
                <p className="mt-1 text-sm text-[#4a5565]">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-[#eff6ff] px-4 py-12">
        <h2 className="text-center text-[30px] font-black">How it works</h2>
        <p className="mt-1 text-center text-[18px] leading-7 text-[#4a5565]">From zero to selling in under 20 minutes</p>

        <div className="mt-8 space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title}>
                <div className="h-[133px] rounded-3xl border border-[#f3f4f6] bg-white px-5 py-6 shadow-[0_10px_15px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.1)]">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-[#6a7282]">Step {index + 1}</p>
                          <h3 className="text-[20px] font-black leading-7">{step.title}</h3>
                        </div>
                        <span className="rounded-full bg-gradient-to-r from-[#dbeafe] to-[#f3e8ff] px-3 py-1 text-xs font-bold text-[#355cad]">
                          {step.time}
                        </span>
                      </div>
                      <p className="text-[16px] leading-[26px] text-[#4a5565]">{step.text}</p>
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && <div className="mx-auto h-4 w-1 rounded-full bg-gradient-to-b from-[#e5e7eb] to-[#f3f4f6]" />}
              </article>
            );
          })}
        </div>

        <div className="mx-auto mt-9 w-fit rounded-full border border-[#b9f8cf] bg-gradient-to-r from-[#dcfce7] to-[#d0fae5] px-6 py-3 text-sm font-black">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#00c950]" />
            Total time: ~20 minutes
          </span>
        </div>
      </section>

      <section className="bg-white px-4 pb-10 pt-12">
        <h2 className="text-center text-[30px] font-black">Simple pricing</h2>
        <p className="mt-1 text-center text-[18px] leading-7 text-[#4a5565]">Everything included, no surprises</p>

        <div className="relative mt-11 rounded-3xl bg-gradient-to-b from-[#355cad] to-[#4a7bd9] px-8 pb-8 pt-10 text-white shadow-[0_25px_50px_rgba(43,127,255,0.3)]">
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#ff6900] to-[#fb2c36] px-4 py-2 text-sm font-black shadow-lg">
            Most Popular
          </span>
          <p className="text-center text-xs font-bold uppercase tracking-wider text-[#bedbff]">Growth Plan</p>
          <p className="mt-3 text-center text-[60px] font-black leading-[60px]">
            <span className="text-[20px] font-normal">KSh </span>1,000
            <span className="text-[20px] font-normal text-[#bedbff]"> /month</span>
          </p>
          <p className="mt-1 text-center text-sm text-[#dbeafe]">or KSh 800/month billed annually</p>

          <div className="mt-7 rounded-2xl border border-white/20 bg-white/10 p-4 text-center">
            <p className="text-lg font-black">Start with 14-day free trial</p>
            <p className="text-sm text-[#dbeafe]">No credit card required</p>
          </div>

          <ul className="mt-7 space-y-3">
            {['Unlimited products', 'Mobile-optimized store', 'Real-time inventory', '24/7 support', 'Free SSL & domain'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-4 w-4" />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/register"
            className="mt-8 flex h-16 items-center justify-center rounded-2xl bg-white text-lg font-black text-[#355cad] shadow-[0_20px_25px_rgba(0,0,0,0.1),0_8px_10px_rgba(0,0,0,0.1)]"
          >
            Start free trial
          </Link>
        </div>

        <p className="mt-7 text-center text-base font-bold text-[#355cad]">
          <Link href="/pricing">See other plans →</Link>
        </p>
        <p className="mt-3 text-center text-sm text-[#6a7282]">
          Join 2,500+ Kenyan businesses • Cancel anytime
        </p>
      </section>

      <section className="bg-white px-4 pb-28 pt-12">
        <h2 className="text-center text-[30px] font-black">Quick answers</h2>
        <p className="mt-1 text-center text-[18px] leading-7 text-[#4a5565]">Everything you need to know</p>

        <div className="mt-8 rounded-3xl border border-[#e5e7eb] bg-[#f9fafb] p-5">
          <Accordion type="single" collapsible className="w-full">
            {quickAnswers.map((item, index) => (
              <AccordionItem key={item.q} value={`mobile-faq-${index}`}>
                <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-[#4a5565]">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-7 text-center">
            <p className="text-sm text-[#101828]">Still have questions?</p>
            <p className="mt-1 text-sm text-[#4a5565]">Our team is here to help you get started</p>
            <Link href="/contact" className="mt-2 inline-block rounded-full bg-gradient-to-b from-[#355cad] to-[#4a7bd9] px-5 py-2 text-sm font-bold text-white">
              Chat with us
            </Link>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e5e7eb] bg-white px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.12)]">
        <div className="mx-auto flex w-full max-w-[440px] items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">Ready to sell online?</p>
            <p className="text-xs text-[#4a5565]">Free 14-day trial • No credit card</p>
          </div>
          <Link
            href="/register"
            onClick={() => trackMetaPixelEvent('Lead', { content_name: 'Sticky Start Now', content_category: 'mobile_sticky_cta' })}
            className="flex h-12 items-center justify-center gap-1 rounded-2xl bg-gradient-to-b from-[#355cad] to-[#4a7bd9] px-5 text-sm font-bold text-white shadow-[0_10px_15px_rgba(43,127,255,0.3)]"
          >
            Start now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

