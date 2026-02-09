# DukaNest Development Roadmap

## Overview

This document outlines planned features and enhancements for DukaNest. Features are organized by priority and implementation phase.

---

## ✅ Completed Features

### Core Platform
- ✅ Multi-tenant architecture with subdomain/custom domain support
- ✅ Tenant lifecycle management (active, expired, suspended, deleted)
- ✅ Row-Level Security (RLS) for data isolation
- ✅ Authentication system (Supabase Auth)
- ✅ Theme system with multiple pre-built themes

### E-Commerce Features
- ✅ Product management (variants, categories, inventory)
- ✅ Shopping cart and checkout flow
- ✅ Order management and processing
- ✅ Customer management
- ✅ Payment methods (Cash, M-Pesa)
- ✅ Delivery zones and shipping
- ✅ Tax calculation and display
- ✅ Coupons and discounts

### Analytics & Reporting
- ✅ Basic analytics dashboard
- ✅ Advanced analytics (Pro/Premium plans)
  - ✅ Conversion funnel tracking
  - ✅ Geographic analytics
  - ✅ Product performance deep dive
  - ✅ Refunds & returns tracking
  - ✅ Real-time analytics
  - ✅ Period comparison
- ✅ Analytics tracking system (sessions, page views, events)
- ✅ Traffic sources analytics
- ✅ Scheduled reports

### Social Media & Marketing
- ✅ Open Graph meta tags for product sharing
- ✅ Twitter Cards for rich previews
- ✅ Social sharing buttons (Facebook, Twitter, LinkedIn, WhatsApp, Pinterest, Instagram)
- ✅ Structured data (Schema.org) for SEO

### Admin Features
- ✅ Landlord admin dashboard
- ✅ Tenant management
- ✅ User management
- ✅ Platform settings
- ✅ Cron job monitoring
- ✅ Staff users (landlord and tenant side) with plan-based limits enforced in API

---

## 🚧 In Progress / Planned Features

### Phase 1: Core Enhancements (High Priority)

#### 0. Plan Limits Enforcement & Usage Visibility

**Status:** Partially implemented (staff enforced; products/orders enforced in API; usage shown in tenant subscription). Remaining: storage enforcement, orders-per-month semantics, full usage display, and UI blocks with upgrade CTA.

**Pricing alignment (from pricing table):**

| Limit            | Basic (Ksh 1,000) | Pro (Ksh 3,000) | Premium   |
|------------------|-------------------|------------------|-----------|
| Staff Users      | 1                 | 5                | 10        |
| Products         | 100               | 1,000            | Unlimited |
| Orders per Month | 500               | 5,000            | Unlimited |
| Storage          | 5 GB              | 25 GB            | 200 GB    |
| Customers        | 1,000             | 10,000           | Unlimited |

**Implementation plan:**

1. **Plan data alignment**
   - Ensure `price_plans.features` JSON in DB matches the pricing table for Basic, Pro, and Premium (e.g. `max_staff_users`, `max_products`, `max_orders_per_month` or `max_orders`, `max_storage_mb`, `max_customers`; use `-1` for unlimited).
   - Add/run a seed or migration so existing plans have correct `features` (e.g. Basic: 1 staff, 100 products, 500 orders/month, 5120 MB storage, 1000 customers).

2. **Enforcement (backend)**
   - **Staff users:** Already enforced in tenant user create/invite API (landlord and tenant side). Keep as-is.
   - **Products:** Already enforced in products create API via `canCreateProduct`. Keep as-is.
   - **Orders:** Currently `canCreateOrder` uses total order count. Decide and implement: either (a) keep total cap, or (b) add `max_orders_per_month` and count orders in current billing month; enforce in checkout/order-creation API.
   - **Storage:** Implement real storage usage: query Supabase Storage (bucket per tenant or prefix) for total bytes; enforce in upload API using `canUseStorage` and block upload when over limit; store/use `max_storage_mb` from plan `features` (5 GB = 5120 MB, 25 GB = 25600 MB, 200 GB = 204800 MB).
   - **Customers:** Add `canCreateCustomer` (or equivalent) and enforce in customer registration/invite API when plan has `max_customers`.
   - **Pages / Blogs:** Use existing `canCreatePage` and `canCreateBlog` in page and blog create APIs if not already; add if missing.

3. **Showcasing to the tenant (dashboard)**
   - **Subscription / Billing page:** Already shows usage vs limits for products, orders, pages, blogs, customers. Add: (a) **Storage:** current usage (from Supabase) and limit (from plan); (b) **Staff users:** current count and limit. Use same pattern (progress bar, “X / Y”, “Approaching limit” at e.g. 90%).
   - **Usage API:** Extend `getTenantUsage` (or equivalent) to return storage (bytes/MB from Supabase) and staff count; ensure subscription page reads from this so all numbers are consistent.
   - **Contextual messaging:** When a limit is reached or near (e.g. 90%+), show a short message and CTA: “You’ve reached your plan limit. Upgrade to add more [products/staff/storage/…].”

4. **UI blocks and upgrade CTA**
   - **Create product:** If at product limit, disable or hide “Add product” and show banner: “Product limit reached. Upgrade your plan to add more products” with link to subscription/upgrade.
   - **Add staff user:** Already blocked by API with clear message; optionally show same message in UI before opening the form (e.g. check limit on “Add user” click).
   - **Upload media / storage:** Before upload, check storage limit (or after upload in API); if over, reject and show: “Storage limit reached. Upgrade your plan for more storage” with link to subscription.
   - **Create page / blog:** If at limit, show similar banner and link to upgrade.
   - **Checkout / new order:** If order limit (total or per-month) reached, block checkout with message and link to upgrade.

5. **Landlord (admin) side**
   - **Tenant detail / settings:** Show tenant’s current plan name and key limits (staff, products, orders, storage, customers) and optionally current usage so landlords can see at a glance.
   - **Creating/editing tenant:** When assigning a plan, show the limits for that plan (from `price_plans.features`) so admins know what the tenant will get.

6. **Documentation and testing**
   - Document in admin/tenant docs: where limits are defined (DB + pricing page), how enforcement works (which APIs and UI), and how to upgrade.
   - Add or extend tests: enforce limits in API tests (products, orders, staff, storage when implemented); optionally E2E for “at limit” flows (e.g. create product when at limit shows upgrade CTA).

**Dependencies:** Supabase Storage API for storage usage and tenant-scoped buckets/prefixes; existing `lib/subscriptions/limits.ts` and plan `features` schema.

**Related code:** `src/lib/subscriptions/limits.ts`, `src/app/api/admin/users/route.ts`, `src/app/api/products/route.ts`, `src/app/api/checkout/route.ts`, `src/app/dashboard/subscription/` (page + client), `src/app/pricing/page.tsx` (feature table).

---

#### 0.1. Theme selector on demo websites

**Status:** Planned.

**Goal:** Allow visitors on a demo store (e.g. electronics.dukanest.com) to **select and switch themes** so that **one demo website per business type** can showcase **multiple themes** (e.g. Multipurpose, Grocery, Fashion) with the same content. Each business-type demo remains a single tenant/store, but the storefront can be viewed in different theme “skins” for comparison.

**Use cases:**
- Visitor lands on Electronics demo (Multipurpose theme) and can switch to “Grocery theme” or “Fashion theme” to see how the same electronics store would look in another theme.
- One URL per business type (e.g. electronics.dukanest.com), multiple theme options — no need for a separate demo URL per theme per business type.

**Implementation outline:**

1. **Data / configuration**
   - For demo tenants (e.g. `data.is_demo === true`), define which themes are available for preview (e.g. list of theme slugs: `grocery`, `default`, etc.). Could live in tenant `data.demo_themes` or in a shared config.
   - Ensure each theme has a storefront implementation (layout, components) so switching theme_slug actually changes the rendered storefront.

2. **Theme selector UI (storefront)**
   - On demo storefront only: show a **theme selector** (dropdown, pills, or sidebar) that lists available themes for this demo. Placement: e.g. in the demo banner, in the sticky “Create your own store” area, or a compact floating control so it doesn’t block content.
   - On change: either (a) persist selection in URL (e.g. `?theme=grocery`) or (b) persist in session/cookie for the demo tenant so the chosen theme is used for subsequent requests.
   - Server or client resolves the selected theme and renders the storefront with that theme’s layout/styles (reuse existing theme system by setting or overriding `theme_slug` for the request).

3. **Rendering by selected theme**
   - When a theme is selected for a demo tenant, the storefront should render using that theme’s components/layout (same products, categories, pages; different theme). Options:
     - **Option A:** Override or pass `theme_slug` per request (e.g. from query or cookie) so the existing theme pipeline (ThemeProviderWrapper, theme-specific components) uses the selected theme for that demo tenant.
     - **Option B:** If themes are fully separate builds/tenants, keep one demo per business type and add a “preview theme” mode that loads the same content with a different theme bundle/slug (may require theme switching API or redirect to a preview URL that encodes theme).
   - Prefer reusing the current tenant + theme_slug model so one tenant (one business type) can render with different theme_slug values without duplicating data.

4. **One website per business type, different themes**
   - Each demo remains **one website (one tenant) per business type** (e.g. electronics = one tenant, grocery = another). Within that website, the **theme selector** only changes which theme is used to render that same content.
   - No requirement for “one website per theme” — the same demo URL serves multiple themes via the selector.

5. **Edge cases**
   - Non-demo tenants: no theme selector; normal single-theme behavior.
   - If a selected theme is removed or renamed, fall back to the tenant’s default theme_slug.
   - Optional: persist “last selected theme” per visitor (cookie/localStorage) for the demo so returning visitors see their last choice.

**Dependencies:** Existing theme system (theme_slug, ThemeProviderWrapper, theme-specific components); demo tenant flag (`data.is_demo`); possibly URL or cookie for selected theme.

**Related code:** Demo storefront components (e.g. demo banner, demo-storefront-extras), theme provider/layout, `tenant_themes` / theme resolution; marketing theme pages (e.g. `/themes/multipurpose`).

---

#### 1. Payment Gateway Integration
- [ ] Stripe integration
- [ ] PayPal integration
- [ ] M-Pesa API integration (automated verification)
- [ ] Payment webhooks handling
- [ ] Refund processing

#### 2. Email Marketing
- [ ] Email campaign builder
- [ ] Customer segmentation for emails
- [ ] Abandoned cart recovery emails
- [ ] Newsletter functionality
- [ ] Email templates library

#### 3. Inventory Management
- [ ] Low stock alerts
- [ ] Bulk inventory operations
- [ ] Inventory history tracking
- [ ] Stock transfer between locations
- [ ] Barcode scanning support

#### 4. Customer Features
- [ ] Customer loyalty program
- [ ] Wishlist functionality
- [ ] Product reviews and ratings (partially implemented)
- [ ] Customer referral program
- [ ] Gift cards

#### 5. User Learning & Onboarding System

**Status:** Planned - High Priority

**Goal:** Help users learn how to use the system effectively through comprehensive learning resources, interactive guides, and contextual help, similar to what popular ecommerce platforms (Shopify, WooCommerce, BigCommerce) offer.

**High Priority (Quick Wins):**

1. **Help Center / Knowledge Base** ✅
   - [x] Searchable help center with categorized articles
   - [x] Article categories (Getting Started, Products, Orders, Settings, Payments, etc.)
   - [ ] Video tutorials embedded in articles
   - [ ] PDF guides for download
   - [ ] FAQ section with common questions
   - [x] Search functionality with autocomplete
   - **Status:** Implemented - Available at `/dashboard/help` with searchable articles and categories

2. **Contextual Help Tooltips**
   - [ ] Help icon (?) buttons next to complex features
   - [ ] Inline help text explaining what each field does
   - [ ] Contextual help panels that slide in
   - [ ] "Learn more" links to relevant documentation
   - [ ] Feature discovery tooltips for new features
   - **Implementation:** Add help tooltip component and integrate into dashboard forms

3. **Setup Checklist Widget**
   - [ ] Dashboard checklist widget ("Complete your store setup")
   - [ ] Progress bars showing store completion percentage
   - [ ] Suggested next steps based on current progress
   - [ ] Completion tracking (products added, payment configured, etc.)
   - **Implementation:** Create checklist component for dashboard with progress tracking

4. **Welcome Email Series**
   - [ ] Welcome email on signup (Day 1)
   - [ ] Follow-up emails (Day 3, 7, 14)
   - [ ] Tips and tricks emails
   - [ ] Feature announcement emails
   - [ ] Best practices newsletter
   - **Implementation:** Email templates and automated email sending system

**Medium Priority (User Engagement):**

5. **Video Tutorials**
   - [ ] Video library organized by topic
   - [ ] Embedded videos in help articles
   - [ ] YouTube channel integration
   - [ ] Screen recordings for complex workflows
   - [ ] Live webinars for new users

6. **Interactive Onboarding Tour**
   - [ ] First-time user welcome modal with quick tour option
   - [ ] Step-by-step setup wizard (connect domain, add products, configure payments)
   - [ ] Interactive tooltips highlighting key features
   - [ ] Progress checklist showing completed steps
   - [ ] Skip/dismiss functionality

7. **In-App Help Widgets**
   - [ ] Floating help widget on dashboard pages
   - [ ] Contextual help panels
   - [ ] Quick access to relevant articles
   - [ ] Support ticket creation from widget
   - [ ] Chat support integration (future)

8. **Community Forum**
   - [ ] Community forum for user discussions
   - [ ] User groups or Discord/Slack community
   - [ ] Expert marketplace for hiring help
   - [ ] Q&A section

**Low Priority (Nice to Have):**

9. **Achievement Badges & Gamification**
   - [ ] Achievement badges for completing milestones
   - [ ] Progress tracking with visual indicators
   - [ ] Completion rewards

10. **Sample Data & Templates**
    - [ ] Option to import sample products during setup
    - [ ] Demo store mode for testing
    - [ ] Pre-configured templates for different industries
    - [ ] Example product categories and attributes

11. **Feature Discovery & Announcements**
    - [ ] "What's New" modal for feature updates
    - [ ] Feature spotlight banners
    - [ ] In-app notifications for new features
    - [ ] Release notes with links to tutorials

12. **Guided Workflows**
    - [ ] Guided product import wizard
    - [ ] Step-by-step payment setup
    - [ ] Guided theme customization
    - [ ] Walkthrough for first order processing

**Implementation Priority:**
1. Help Center / Knowledge Base (Foundation)
2. Contextual Help Tooltips (Quick wins)
3. Setup Checklist Widget (User engagement)
4. Welcome Email Series (Automated support)

**Dependencies:** 
- Content management system for help articles
- Email service for automated emails
- Video hosting (YouTube or self-hosted)
- User progress tracking system

**Related Documentation:**
- Help articles structure and content guidelines
- Email template designs
- Video tutorial scripts
- Onboarding flow diagrams

---

### Phase 2: Marketing & Growth (Medium Priority)

#### 6. Social Media Integration
- [x] Basic social sharing (Facebook, Twitter, LinkedIn, WhatsApp, Pinterest, Instagram)
- [ ] **Instagram Shopping Integration** (Advanced)
  - [ ] Facebook Catalog API integration
  - [ ] Product sync to Facebook Catalog
  - [ ] Instagram Shopping API integration
  - [ ] Product tagging in Instagram posts
  - [ ] Shopping tab on Instagram profile
  - [ ] Direct checkout from Instagram
  - [ ] Instagram Stories product stickers
  - [ ] Catalog management dashboard
  - [ ] Real-time inventory sync
  - [ ] Price synchronization
  - [ ] Product image optimization for Instagram

**Requirements:**
- Instagram Business account
- Facebook Business account
- Facebook Catalog setup
- Instagram Shopping approval
- API credentials and permissions

**Estimated Complexity:** High
**Dependencies:** Facebook Graph API, Instagram Graph API, Catalog management system

#### 7. SEO Enhancements
- [ ] Advanced SEO settings per product/page
- [ ] XML sitemap generation
- [ ] Robots.txt management
- [ ] Schema.org markup enhancements
- [ ] Meta tag customization
- [ ] URL structure optimization

#### 8. Content Management
- [ ] Advanced blog features
- [ ] Media library improvements
- [ ] Page builder (drag-and-drop)
- [ ] Form builder enhancements
- [ ] Custom fields for products

#### 9. Multi-Language Support
- [ ] Language switcher
- [ ] Translation management
- [ ] RTL language support
- [ ] Currency conversion

---

### Phase 3: Advanced Features (Lower Priority)

#### 10. Mobile App
- [ ] React Native mobile app
- [ ] Push notifications
- [ ] Mobile-specific features
- [ ] App store listings

#### 11. Advanced Analytics
- [ ] Predictive analytics
- [ ] Customer segmentation (advanced)
- [ ] A/B testing framework
- [ ] Custom dashboard builder
- [ ] Export to Excel/PDF

#### 12. API & Integrations
- [ ] RESTful API for third-party integrations
- [ ] Webhook system
- [ ] Zapier integration
- [ ] Google Analytics integration
- [ ] Facebook Pixel integration

#### 13. Advanced Shipping
- [ ] Multiple shipping providers
- [ ] Shipping rate calculator
- [ ] Label printing
- [ ] Tracking integration
- [ ] International shipping

---

## 📋 Feature Details

### Instagram Shopping Integration (Phase 2)

**Status:** Planned for future implementation

**Description:**
Full Instagram Shopping integration that allows tenants to tag products in Instagram posts and stories, enabling customers to shop directly from Instagram.

**Key Features:**
1. **Facebook Catalog Sync**
   - Automatic product sync to Facebook Catalog
   - Real-time inventory updates
   - Price synchronization
   - Product image optimization

2. **Instagram Shopping API**
   - Product tagging in Instagram posts (up to 5 tags per post)
   - Shopping tab on Instagram profile
   - Product stickers in Instagram Stories
   - Direct checkout from Instagram (if enabled)

3. **Catalog Management**
   - Dashboard for managing Facebook Catalog
   - Bulk product operations
   - Catalog health monitoring
   - Sync status tracking

4. **Analytics**
   - Instagram Shopping performance metrics
   - Conversion tracking from Instagram
   - Product tag analytics

**Technical Requirements:**
- Facebook Business Manager account
- Instagram Business account
- Facebook Catalog API access
- Instagram Graph API access
- OAuth flow for account connection
- Webhook handling for catalog updates

**Implementation Steps:**
1. Set up Facebook Catalog API integration
2. Create OAuth flow for Facebook/Instagram connection
3. Build catalog sync service
4. Implement Instagram Shopping API endpoints
5. Create catalog management dashboard
6. Add analytics tracking
7. Documentation and setup guides

**Estimated Timeline:** 4-6 weeks (depending on API approval process)

**Dependencies:**
- Facebook Developer account
- Instagram Business account approval
- API access approval from Facebook/Instagram
- Testing environment setup

**Related Documentation:**
- `docs/INSTAGRAM_SHARING_GUIDE.md` - Current Instagram sharing guide
- `docs/SOCIAL_MEDIA_SHARING_GUIDE.md` - Social media sharing overview

---

## 🎯 Priority Matrix

### High Priority (Next 3 Months)
1. **Plan limits enforcement & usage visibility** (staff ✅; products/orders ✅ in API; storage, orders-per-month, full usage display, UI blocks + upgrade CTA)
2. **Theme selector on demo websites** (one website per business type; visitors can switch themes on the same demo store)
3. **User Learning & Onboarding System** (Help center, contextual help, setup checklist, welcome emails)
4. Payment gateway integrations (Stripe, PayPal)
5. Email marketing features
6. Inventory management enhancements

### Medium Priority (3-6 Months)
6. User Learning & Onboarding (Video tutorials, interactive tours, community forum)
7. Instagram Shopping integration
8. SEO enhancements
9. Advanced content management

### Low Priority (6+ Months)
10. User Learning & Onboarding (Achievement badges, sample data, feature discovery)
11. Mobile app development
12. Advanced analytics features
13. Third-party integrations

---

## 📝 Notes

- Features marked with ✅ are completed
- Features marked with [ ] are planned
- Priority may change based on user feedback and business needs
- Some features may require external API access or approvals

---

## 🔄 How to Contribute

If you'd like to contribute to any of these features:

1. Check the existing documentation
2. Review the codebase structure
3. Create an issue or discussion
4. Follow the project's coding standards
5. Submit a pull request

---

## 📚 Related Documentation

- `docs/SOCIAL_MEDIA_SHARING_GUIDE.md` - Social sharing guide
- `docs/INSTAGRAM_SHARING_GUIDE.md` - Instagram sharing specifics
- `docs/ANALYTICS_FEATURE_COMPARISON.md` - Analytics features
- `docs/API_DOCUMENTATION.md` - API reference
- Plan limits: `src/lib/subscriptions/limits.ts` - Limit checks; tenant subscription UI: `src/app/dashboard/subscription/`

---

**Last Updated:** 2026-02-06
