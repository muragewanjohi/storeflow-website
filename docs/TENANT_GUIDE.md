# DukaNest Tenant Guide

**Complete guide to your store dashboard and storefront**

This guide is for **store owners (tenants)** using DukaNest. It lists all features available in your dashboard and explains how your **storefront** (the public-facing shop) works so you can share it with your team or use it for onboarding.

---

## Table of Contents

1. [Accessing Your Store](#accessing-your-store)
2. [Tenant Features Overview](#tenant-features-overview)
3. [Dashboard Features (Detailed)](#dashboard-features-detailed)
4. [The Storefront (Customer-Facing)](#the-storefront-customer-facing)
5. [Getting Started Checklist](#getting-started-checklist)
6. [Best Practices](#best-practices)
7. [Support & Resources](#support--resources)

---

## Accessing Your Store

| What | URL (example) |
|------|----------------|
| **Your storefront** (customers) | `https://yoursubdomain.dukanest.com` |
| **Dashboard** (you) | `https://yoursubdomain.dukanest.com/dashboard` |
| **Customer login** | `https://yoursubdomain.dukanest.com/customer-login` |

- Replace `yoursubdomain` with your store’s subdomain (e.g. `pharmacy`, `myelectronics`).
- If you use a **custom domain**, use that instead (e.g. `https://www.yourstore.com`).

**Two-factor authentication (2FA)** is required for dashboard login. You’ll receive a one-time code by email each time you sign in.

---

## Tenant Features Overview

As a tenant, you can use:

| Area | What you can do |
|------|------------------|
| **Dashboard** | Overview, quick actions, alerts |
| **Products** | Add, edit, organize, and manage product catalog |
| **Categories** | Organize products into categories |
| **Inventory** | Stock levels, adjustments, bulk updates, alerts, history |
| **Orders** | View, process, fulfill, cancel, and track orders |
| **Customers** | View customers, profiles, orders, addresses, notes |
| **Sales** | Create and manage promotions and sales campaigns |
| **Content** | Pages, blogs, media library, forms |
| **Themes** | Choose and customize storefront look and feel |
| **Settings** | Store info, currency, domains, delivery zones, attributes, users |
| **Analytics** | Sales, orders, customers, inventory, and export reports |
| **Users** | Add and manage staff (roles and permissions) |
| **Support** | Open and manage tickets with platform support |
| **Subscription** | View plan, upgrade, renew, billing history |

---

## Dashboard Features (Detailed)

### Dashboard (Home)

- **Summary metrics:** Sales, orders, low stock alerts, customer growth.
- **Recent orders** and **quick actions** (e.g. add product, view orders).
- **Alerts:** Low stock, pending orders, or other notifications.

---

### Products

- **Create product:** Name, description (rich text), short description, price, sale price, SKU, stock quantity, category, status (draft / active / inactive), main image, gallery.
- **Product variants:** Options (e.g. Size, Color) with their own SKU, price, and stock.
- **Edit / delete** products.
- **Link products to sales** (assign products to promotions).
- **Product list:** Search, filter, sort, bulk actions.

---

### Categories

- **Create category:** Name, slug, description, parent category (optional), image.
- **Edit / delete** categories.
- **List:** Manage hierarchy and order; categories are used on the storefront for browsing and filters.

---

### Inventory

- **Inventory dashboard:** Overview of stock levels and value.
- **Adjust stock:** Per-product quantity changes with reason/notes.
- **Bulk update:** Download CSV template, fill quantities, upload to update many products at once.
- **Alerts:** Products below low-stock threshold.
- **History:** Log of stock adjustments.

---

### Orders

- **Order list:** Order number, customer, total, status, payment status, date.
- **Filters:** Status, payment status, date range, customer, order number.
- **Order details:** Customer info, shipping/billing address, items, payment, notes.
- **Update status:** Pending → Processing → Shipped → Delivered (or Cancelled).
- **Fulfillment:** Mark as shipped, add tracking number and carrier; customer can be notified.
- **Cancel order:** With reason; customer notification and refund handling as per your settings.
- **Delivery quotes:** Optional; manage pending delivery quotes if enabled.

---

### Customers

- **Customer list:** Name, email, order count, total spent, last order.
- **Customer profile:** Contact details, order history, saved addresses, notes.
- **Notes:** Internal or customer-facing notes.
- **Export:** Customer list (e.g. CSV) for use outside the dashboard.

---

### Sales (Promotions)

- **Create sale:** Name, slug (URL), description, start/end dates, badge text and color, featured flag, banner image.
- **Add products:** Assign products to a sale with optional sale price and discount.
- **Status:** Draft, active, scheduled, ended.
- **Storefront:** Active sales appear on the **Sales** page and on product cards (sale badge, countdown if end date is set).
- **Share:** Copy storefront link or share to social (e.g. Facebook, Twitter, WhatsApp).

---

### Content

#### Pages

- **Create/edit pages:** Title, slug (URL), content (page builder with sections: hero, features, products, text, images, forms, etc.).
- **Page builder:** Drag-and-drop sections (hero, products, testimonials, CTA, contact form, etc.); customize per section (text, images, colors, layout).
- **Home page:** One page uses the “home” slug and is shown as the storefront homepage.
- **SEO:** Meta title and description per page.
- **Status:** Draft or published.

#### Blogs

- **Create/edit posts:** Title, content (rich text), excerpt, featured image, category, SEO, status.
- **Categories:** Create and manage blog categories.
- **Storefront:** Blog listing and individual post pages (e.g. `/blogs`, `/blog/[slug]`).

#### Media Library

- **Upload:** Images and files; used in products, pages, blogs, and settings.
- **Manage:** View, search, add alt text, delete unused files.

#### Forms

- **Create forms:** Contact form or custom forms (fields, validation, success message).
- **Embed:** Use form sections in pages (e.g. contact page).
- **Submissions:** View and manage form submissions.

---

### Themes

- **Browse themes:** View available themes (e.g. multipurpose, electronics, grocery).
- **Install / activate:** Install a theme and set it as active for your storefront.
- **Customize:** Colors, fonts, and sometimes layout; changes apply to the live storefront.
- **Preview:** Preview a theme before activating.

Your storefront header, footer, product cards, and overall layout follow the active theme.

---

### Settings

- **General / Store settings:** Store name, contact email, phone, address, timezone, **currency**.
- **Branding:** Store logo, favicon (used in browser tab).
- **Domains:** Connect a custom domain (e.g. `www.yourstore.com`) and follow DNS instructions.
- **Delivery zones:** Define zones and delivery rules/fees if you use delivery (optional).
- **Attributes:** Product attributes (e.g. Size, Color) used for variants and filters.
- **Contact email:** Used for contact form and notifications.
- **MFA (2FA):** Two-factor authentication settings for your account.
- **Trusted devices:** Manage devices that skip 2FA (if allowed).

---

### Analytics

- **Overview:** Key metrics and trends.
- **Sales:** Revenue, order count, average order value, trends.
- **Orders:** Order-focused metrics.
- **Customers:** New customers, growth, retention.
- **Inventory:** Stock levels, low stock, value.
- **Export:** Export data (e.g. CSV) for date ranges and reports.

---

### Users (Staff)

- **Roles:** Tenant admin (full access), tenant staff (limited).
- **Create user:** Name, email, password, role.
- **Edit / deactivate** users.
- **Roles & permissions:** View what each role can do (optional roles page).

Only invited users can log in to your store’s dashboard.

---

### Support

- **Tickets:** Open tickets to platform support (landlord).
- **View tickets:** List and open existing tickets.
- **Replies:** Full conversation history and replies; you can attach files.
- **Status:** Open, in progress, resolved, closed.

Use this for platform issues, billing questions, or feature requests.

---

### Subscription

- **Current plan:** Name, features, limits (e.g. products, orders).
- **Expiry:** Plan end date.
- **Upgrade:** Change to a higher plan (if available).
- **Renew:** Renew before or at expiry.
- **Billing history:** Invoices and payments.

Plan limits may affect product count, storage, or other usage; check your plan details.

---

## The Storefront (Customer-Facing)

The **storefront** is the public website customers see at your store URL. Everything you configure in the dashboard (products, categories, sales, pages, theme) shapes what appears here.

### Storefront URL Structure

| Path | Purpose |
|------|--------|
| `/` | Home page (page with slug `home` or default homepage) |
| `/products` | Product listing (all products; filters, sort, search) |
| `/products/[slug]` | Single product page (details, variants, add to cart, reviews) |
| `/sales` | All active sales/promotions |
| `/sales/[slug]` | Single sale page (products in that promotion) |
| `/cart` | Shopping cart |
| `/checkout` | Checkout (shipping, payment) |
| `/account` | Customer account (orders, profile, settings) |
| `/contact` | Contact form page |
| `/blogs` | Blog listing |
| `/blog/[slug]` | Single blog post |
| `/[slug]` | Custom page (e.g. About Us, FAQ) by page slug |
| `/customer-login` | Customer login |
| `/customer-register` | Customer registration |
| `/orders` | Customer order list (when logged in) |
| `/track-order` | Track order (e.g. by order number + email) |
| `/privacy-policy`, `/terms-of-service`, `/cookie-policy` | Policy pages (if configured) |

Your **navigation menu** (header) is usually built from these: Home, Products, Sales, About Us, Contact, Blogs, etc., depending on theme and settings.

---

### Home Page

- **Content:** Defined by the **page** with slug `home` in Content → Pages.
- **Page builder:** Hero, featured products, categories, banners, testimonials, CTA, etc.
- **Theme:** Layout, header, footer, and styles come from the active theme.

You edit the home page like any other page in the dashboard (Pages → edit the home page).

---

### Products Area

- **Listing (`/products`):** Grid/list of active products; search, category filters, sort (e.g. newest, price).
- **Product page (`/products/[slug]`):**  
  - Main image and gallery  
  - Title, price, sale price, SKU  
  - Variants (e.g. size, color) and variant-specific price/stock  
  - Quantity, Add to cart  
  - Description, full description  
  - Customer reviews (if enabled)  
  - Related products  

Product data (name, price, images, variants, stock) is what you set in Dashboard → Products.

---

### Sales Area

- **All sales (`/sales`):** Cards for each **active** sale (name, description, product count, countdown if end date set, “Shop now”).
- **Sale page (`/sales/[slug]`):** Products in that sale; filters/sort; same add-to-cart as main catalog.

Only sales that are **active** and within their date range appear. Featured sales can be highlighted in the theme (e.g. on home or in a sales section).

---

### Cart & Checkout

- **Cart (`/cart`):** List of items, quantities, prices; update quantity or remove; proceed to checkout.
- **Checkout:** Customer details, shipping address, delivery method (if delivery zones are set), payment (e.g. M-Pesa, card). Order is created after successful payment.

Cart and checkout use your products, prices, and delivery/payment configuration from the dashboard.

---

### Customer Account

- **Registration:** `/customer-register`.
- **Login:** `/customer-login` (and 2FA if enabled for customers).
- **Account (`/account`):** Profile, addresses, order history, settings. Customers see only their own data.

---

### Contact & Other Pages

- **Contact:** Form you configured in Content → Forms; submissions appear in Dashboard → Forms → Submissions.
- **Custom pages:** Any published page (e.g. About Us, FAQ) is available at `/[slug]`. Add links in your theme’s menu or in page builder CTAs.

---

### Policies & Legal

- **Privacy policy, Terms of service, Cookie policy:** If you create pages with those slugs or content, they can be linked from footer or checkout. Configure in Content → Pages and link from theme/settings where applicable.

---

## Getting Started Checklist

Use this to open your store and keep it running:

1. **Log in to the dashboard** and complete store settings (name, contact email, currency).
2. **Upload branding:** Logo and favicon in Settings.
3. **Create categories** (e.g. by product type).
4. **Add products:** Name, description, price, images, category, stock; use variants if needed.
5. **Set up the home page:** Edit the “home” page and add sections (hero, featured products, etc.).
6. **Add key pages:** e.g. About Us, Contact (with contact form), and link them in the menu if your theme supports it.
7. **Choose and customize a theme** (Themes → install → activate → customize).
8. **Optional:** Create a **sale** and assign products for testing.
9. **Test:** Place a test order (cart → checkout) and process it in Orders.
10. **Optional:** Add staff (Users), set delivery zones (Settings), and configure support (Support) as needed.

---

## Best Practices

- **Products:** Clear names, good descriptions, high-quality images, correct prices and stock.
- **Orders:** Process and ship on time; update status and tracking so customers stay informed.
- **Content:** Keep homepage and key pages up to date; use the page builder for clear layout and CTAs.
- **Themes:** Pick a theme that fits your brand; use customization for colors and fonts.
- **Analytics:** Review sales and orders regularly; use exports for your own reporting.
- **Support:** Use the Support section for platform or billing issues so they’re tracked and resolved.

---

## Support & Resources

- **Dashboard support:** Use **Support → Tickets** in the dashboard for platform or account issues.
- **Storefront link:** Share your store URL (e.g. `https://yoursubdomain.dukanest.com`) with customers.
- **Documentation:** Other docs (e.g. API, deployment, troubleshooting) are for developers or platform admins; this guide is the one to share with **tenants** and store staff.

---

**Document version:** 1.0  
**Last updated:** January 2026  
**Audience:** Tenants (store owners and staff)
