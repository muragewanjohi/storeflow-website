/**
 * Marketing Landing Page
 * 
 * Modern landing page for StoreFlow platform
 * Inspired by Nazmart.net layout and design
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  Globe, 
  Palette,
  Languages,
  CreditCard,
  Package,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Image from 'next/image';

export default function MarketingLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pricingTab, setPricingTab] = useState<'monthly' | 'yearly' | 'lifetime'>('monthly');

  const features = [
    {
      icon: Globe,
      title: 'Custom Domain',
      description: 'Use your own domain name for a professional brand presence. Perfect for building trust with your customers.',
    },
    {
      icon: Palette,
      title: 'Amazing Themes',
      description: 'Choose from beautiful, customizable themes designed for different industries. Make your store stand out.',
    },
    {
      icon: Languages,
      title: 'Unlimited Language',
      description: 'Support multiple languages to reach customers worldwide. Expand your business globally with ease.',
    },
    {
      icon: CreditCard,
      title: '18 Payment Gateway',
      description: 'Accept payments from customers worldwide with support for 18+ payment gateways including M-Pesa, PayPal, and more.',
    },
    {
      icon: Package,
      title: 'Inventory System',
      description: 'Manage your products and stock levels efficiently with our advanced inventory management system.',
    },
    {
      icon: Smartphone,
      title: 'Mobile Version',
      description: 'Your store looks perfect on all devices. Mobile-responsive design ensures great experience everywhere.',
    },
  ];

  const themes = [
    { name: 'Default', description: 'Modern electronics store theme' },
    { name: 'Modern', description: 'Sleek and contemporary design' },
    { name: 'HexFashion', description: 'Fashion-forward retail theme' },
    { name: 'Minimal', description: 'Clean and minimalist aesthetic' },
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Register & Setup',
      description: 'Create your account and set up your store in minutes. Our intuitive wizard guides you through the process.',
    },
    {
      step: '2',
      title: 'Upload Products',
      description: 'Add your products with images, descriptions, and pricing. Bulk import available for large catalogs.',
    },
    {
      step: '3',
      title: 'Get Sales',
      description: 'Start selling immediately. Accept orders, process payments, and manage your business from one dashboard.',
    },
  ];

  const whyChooseUs = [
    {
      title: 'Start Online Business',
      description: 'Launch your online store quickly with our easy-to-use platform. No technical knowledge required.',
    },
    {
      title: 'Move your Business Online',
      description: 'Take your existing business online seamlessly. Import products and start selling in no time.',
    },
    {
      title: 'Switch to our Platform',
      description: 'Migrate from other platforms easily. We provide tools and support to make the transition smooth.',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Total Domains' },
    { value: '50K+', label: 'Total Subdomain' },
    { value: '25K+', label: 'Total Tenant' },
    { value: '1M+', label: 'Total Product' },
  ];

  const testimonials = [
    {
      name: 'Williamson Johnson',
      company: 'Daraz',
      content: 'I was able to learn a large amount in a short amount of time. The practical nature helped me understand what we were trying to do, and how to achieve it.',
    },
    {
      name: 'Austin Hull',
      company: 'eBay',
      content: 'I was able to learn a large amount in a short amount of time. The practical nature helped me understand what we were trying to do, and how to achieve it.',
    },
    {
      name: 'Albert Flores',
      company: 'EG Commerce',
      content: 'I was able to learn a large amount in a short amount of time. The practical nature helped me understand what we were trying to do, and how to achieve it.',
    },
  ];

  const blogPosts = [
    {
      title: 'You ten occasional saw everything but conviction',
      date: '14 Mar 2022',
    },
    {
      title: 'Had a great time together are added and seal there single',
      date: '14 Mar 2022',
    },
    {
      title: 'Tune great time together are added and seal there single',
      date: '14 Mar 2022',
    },
    {
      title: 'Political a great time together are added and seal there single',
      date: '14 Mar 2022',
    },
  ];

  const faqs = [
    {
      question: 'What is the membership fee for joining?',
      answer: 'StoreFlow offers flexible pricing plans to suit businesses of all sizes. We have free plans for getting started, and paid plans starting from $29/month. All plans include a 14-day free trial so you can try before you commit.',
    },
    {
      question: 'Can I use my own domain name?',
      answer: 'Yes! StoreFlow supports custom domains for all plans. You can connect your existing domain or purchase a new one through our platform. Custom domain setup is included in Professional and Enterprise plans.',
    },
    {
      question: 'How many products can I add?',
      answer: 'The number of products depends on your plan. Free plans allow up to 20 products, while paid plans offer unlimited products. Check our pricing section for detailed limits.',
    },
    {
      question: 'Do you offer payment gateway integrations?',
      answer: 'Yes! StoreFlow supports 18+ payment gateways including M-Pesa, PayPal, Stripe, Pesapal, and many more. You can accept payments from customers worldwide.',
    },
  ];

  const pricingPlans = {
    monthly: [
      {
        name: 'Free',
        badge: 'Risk free',
        price: '$0',
        period: '/mo',
        features: ['Page 20', 'Product 20', 'Blog 20', 'Storage 2000 MB'],
        cta: 'Get Now',
        highlight: false,
      },
      {
        name: 'Business',
        badge: 'Advance Plan',
        price: '$350',
        period: '/mo',
        features: ['Page 20', 'Product 20', 'Blog 20', 'Storage 100 MB'],
        cta: 'Try Now',
        highlight: false,
      },
      {
        name: 'Ultimate',
        badge: 'Ultimate Plan',
        price: '$599',
        period: '/mo',
        features: ['Page 50', 'Product 500', 'Blog 100', 'Storage 500 MB'],
        cta: 'Try Now',
        highlight: true,
      },
    ],
    yearly: [
      {
        name: 'Royal',
        badge: 'Large Plan',
        price: '$500',
        period: '/yr',
        features: ['Page 50', 'Product 50', 'Blog 50', 'Storage 500 MB'],
        cta: 'Try Now',
        highlight: false,
      },
      {
        name: 'Digital Plan',
        badge: 'DigiPlan',
        price: '$799',
        period: '/yr',
        features: ['Page 50', 'Product 50', 'Blog 50', 'Storage 500 MB'],
        cta: 'Buy Now',
        highlight: false,
      },
      {
        name: 'All Feature Plan',
        badge: 'All Feature Plan',
        price: '$789',
        period: '/yr',
        features: ['Page 50', 'Product 50', 'Blog 50', 'Storage 500 MB'],
        cta: 'Try Now',
        highlight: true,
      },
    ],
    lifetime: [
      {
        name: 'Enterprise',
        badge: 'Medium Plan',
        price: '$999',
        period: '/lt',
        features: ['Page 100', 'Product 200', 'Blog 100', 'Storage 50 MB'],
        cta: 'Buy Now',
        highlight: false,
      },
      {
        name: 'Life Time',
        badge: 'Life Time Package',
        price: '$889',
        period: '/lt',
        features: ['Page 100', 'Product 100', 'Blog 100', 'Storage 500 MB'],
        cta: 'Buy Now',
        highlight: false,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">StoreFlow</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#home" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="#themes" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pages
              </Link>
              <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing plan
              </Link>
              <Link href="#blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Blog
              </Link>
              <Link href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
              <Button asChild>
                <Link href="/pricing">Get Started</Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-4">
              <Link href="#home" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
                Home
              </Link>
              <Link href="#about" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
                About
              </Link>
              <Link href="#themes" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
                Pages
              </Link>
              <Link href="#pricing" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
                Pricing plan
              </Link>
              <Link href="#blog" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
                Blog
              </Link>
              <Link href="#contact" className="block text-sm font-medium text-muted-foreground hover:text-foreground">
                Contact
              </Link>
              <Button asChild className="w-full">
                <Link href="/pricing">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                Instant Build your
                <br />
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  eCommerce Platform
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl">
                Start selling online in minutes. Create your store, add products, and accept payments - all in one powerful platform.
              </p>
              
              <Button asChild size="lg" className="text-lg px-8 py-6 group">
                <Link href="/pricing">
                  Get 14 Days Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
            <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80"
                alt="Ecommerce platform dashboard"
                fill
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-lg bg-background border hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                <Link href="#features" className="text-primary hover:underline text-sm font-medium inline-flex items-center">
                  Explore
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Amazing Themes Section */}
      <section id="themes" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Amazing Themes</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose from beautiful, professionally designed themes for every industry
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {themes.map((theme, index) => {
              const themeImages = [
                'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80', // Default
                'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&q=80', // Modern
                'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80', // HexFashion
                'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600&q=80', // Minimal
              ];
              return (
                <div
                  key={index}
                  className="p-0 rounded-lg bg-background border hover:shadow-lg transition-all duration-300 text-center overflow-hidden"
                >
                  <div className="relative h-48 w-full">
                    <Image
                      src={themeImages[index]}
                      alt={theme.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold mb-2">{theme.name}</h3>
                    <p className="text-sm text-muted-foreground">{theme.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How it Works?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get your online store up and running in just three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => {
              const images = [
                'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80', // Register/Setup
                'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800&q=80', // Upload Products
                'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&q=80', // Get Sales
              ];
              return (
                <div key={index} className="text-center">
                  <div className="relative h-48 rounded-lg overflow-hidden mb-6 shadow-lg">
                    <Image
                      src={images[index]}
                      alt={step.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-lg text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose us?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to succeed in ecommerce, all in one place
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {whyChooseUs.map((item, index) => {
              const images = [
                'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', // Start Online Business
                'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80', // Move Business Online
                'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80', // Switch Platform
              ];
              return (
                <div key={index} className="p-6 rounded-lg bg-background border hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="relative h-48 rounded-lg overflow-hidden mb-4 -mx-2 -mt-2">
                    <Image
                      src={images[index]}
                      alt={item.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Pricing Plan</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
            
            {/* Pricing Tabs */}
            <div className="flex justify-center gap-4 mb-12">
              <Button
                variant={pricingTab === 'monthly' ? 'default' : 'outline'}
                onClick={() => setPricingTab('monthly')}
              >
                Monthly
              </Button>
              <Button
                variant={pricingTab === 'yearly' ? 'default' : 'outline'}
                onClick={() => setPricingTab('yearly')}
              >
                Yearly
              </Button>
              <Button
                variant={pricingTab === 'lifetime' ? 'default' : 'outline'}
                onClick={() => setPricingTab('lifetime')}
              >
                Lifetime
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans[pricingTab].map((plan, index) => (
              <div
                key={index}
                className={`p-8 rounded-lg border-2 ${
                  plan.highlight ? 'border-primary bg-primary/5' : 'bg-background'
                } hover:shadow-lg transition-all duration-300 relative`}
              >
                {plan.highlight && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-sm text-muted-foreground mb-2">{plan.badge}</div>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mb-4">
                  <Link href="#pricing" className="text-sm text-primary hover:underline">
                    View All Features
                  </Link>
                </div>
                <Button asChild className="w-full" variant={plan.highlight ? 'default' : 'outline'}>
                  <Link href="/pricing">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Feedback Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Customer Feedback</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Credibly actualize interoperable technology without prospective processes. Conveniently mesh tally parallel task cross-media.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => {
              const avatars = [
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
              ];
              return (
                <div
                  key={index}
                  className="p-6 rounded-lg bg-background border hover:shadow-lg transition-all duration-300"
                >
                  <p className="text-muted-foreground mb-6 italic">&quot;{testimonial.content}&quot;</p>
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={avatars[index]}
                        alt={testimonial.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Blog Updates Section */}
      <section id="blog" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Blog Updates</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {blogPosts.map((post, index) => {
              const blogImages = [
                'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
                'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&q=80',
                'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600&q=80',
                'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
              ];
              return (
                <div
                  key={index}
                  className="p-0 rounded-lg bg-background border hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="relative h-48 w-full">
                    <Image
                      src={blogImages[index]}
                      alt={post.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold mb-3 line-clamp-2">{post.title}</h3>
                    <div className="flex items-center justify-between">
                      <Link href="#blog" className="text-sm text-primary hover:underline">
                        Keep Reading
                      </Link>
                      <span className="text-sm text-muted-foreground">{post.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
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

      {/* Newsletter Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Get Updates as soon as they happen.
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Signup now for our newsletter and app launch.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg border bg-background"
            />
            <Button size="lg">Subscribe</Button>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>example@storeflow.com</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>+1 (555) 123-4567</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 px-4 sm:px-6 lg:px-8 border-t bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">About Us</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Work Portfolio</Link></li>
                <li><Link href="#about" className="hover:text-foreground transition-colors">About us</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Team</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Web Design</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Ui/Ux Design</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">App Development</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Game Development</Link></li>
              </ul>
            </div>
            <div className="col-span-2">
              <h3 className="font-semibold mb-4">Our Address</h3>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>Unit 4, The Courtyard, Lynton Road, Crouch End N8 8SL</p>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} All right reserved By StoreFlow</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
