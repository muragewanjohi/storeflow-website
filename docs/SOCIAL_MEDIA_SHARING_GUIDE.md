# Social Media Product Sharing Guide

## Overview

This guide explains how StoreFlow enables tenants to share their products on social media platforms (Facebook, Twitter/X, LinkedIn, WhatsApp, Pinterest, etc.) with rich previews that drive traffic back to their store.

## How It Works

### 1. **Open Graph Meta Tags** (Already Implemented ✅)

StoreFlow automatically generates Open Graph meta tags for all product pages. These tags tell social media platforms how to display your product when shared:

- **og:title** - Product name
- **og:description** - Product description with price
- **og:image** - Product image (1200x630px recommended)
- **og:url** - Direct link to product page
- **og:type** - Set to "product"
- **og:site_name** - Store name

### 2. **Twitter Cards** (Already Implemented ✅)

Twitter/X uses its own card format, which StoreFlow also generates:

- **twitter:card** - "summary_large_image" for rich previews
- **twitter:title** - Product name
- **twitter:description** - Product description
- **twitter:image** - Product image

### 3. **Structured Data (Schema.org)** (Already Implemented ✅)

Google and other search engines use structured data to understand products:

- Product name, description, price
- Availability status
- SKU
- Image

## Analytics Tracking for Social Media Shares

### How It Works

When tenants share products using the share buttons, StoreFlow automatically adds UTM parameters to the shared URLs:

- **`utm_source`**: The social platform (facebook, twitter, linkedin, whatsapp, pinterest, instagram)
- **`utm_medium`**: Always set to "social"
- **`utm_campaign`**: Always set to "product_share"

### Example Shared URL

When a product is shared on Facebook, the URL becomes:
```
https://store.dukanest.com/products/product-slug?utm_source=facebook&utm_medium=social&utm_campaign=product_share
```

### Viewing Social Media Traffic

1. Go to **Dashboard** → **Analytics** → **Advanced** tab
2. Scroll to **Traffic Sources** section
3. You'll see:
   - **By Source**: Shows "facebook", "twitter", "linkedin", etc. as separate sources
   - **By Medium**: Shows "social" as a medium
   - **By Campaign**: Shows "product_share" campaign
   - **Revenue by Source**: Revenue generated from each social platform

### What Gets Tracked

✅ **Tracked Automatically:**
- Visits from shared product links (via UTM parameters)
- Referrer information (when available)
- Social platform identification
- Conversion tracking (orders from social traffic)
- Revenue attribution by social platform

⚠️ **Limitations:**
- Some mobile apps (WhatsApp, Instagram app) may not pass referrer headers
- Private browsing modes may limit referrer tracking
- UTM parameters are the most reliable method (now included automatically)

### Best Practices

1. **Use Share Buttons**: Always use the built-in share buttons to ensure UTM tracking
2. **Monitor Analytics**: Regularly check Traffic Sources to see which platforms drive most traffic
3. **Test Links**: Share a test link and verify it appears in analytics within a few minutes
4. **Campaign Tracking**: For specific campaigns, you can manually add additional UTM parameters

## How Other E-Commerce Platforms Do It

### Shopify
- Automatic Open Graph tags for all products
- Social sharing buttons on product pages
- Customizable share message templates
- Facebook Pixel integration for tracking

### WooCommerce
- Plugins like "Woo Open Graph" add social sharing
- Share buttons with customizable text
- Support for multiple platforms

### Amazon
- Rich product previews when shared
- Price and availability shown in preview
- Direct "Buy Now" buttons in some platforms

## Current Implementation Status

✅ **Already Working:**
- Open Graph meta tags are automatically generated
- Twitter Cards are configured
- Product pages have proper metadata
- Structured data (JSON-LD) for SEO

✅ **Recently Added:**
- Social sharing buttons on product pages
- WhatsApp sharing support
- Copy link functionality
- Instagram sharing (with helpful tips)

⚠️ **Future Enhancements:**
- Share message customization
- Share tracking analytics
- Instagram Shopping integration (requires Facebook Catalog)

## How Tenants Can Share Products

### Method 1: Direct Link Sharing (Works Now)

1. Copy the product URL from the browser
2. Paste it into any social media platform
3. The platform will automatically fetch Open Graph tags and show a rich preview

**Example:**
```
https://yourstore.dukanest.com/products/amazing-product
```

When shared on Facebook/Twitter, it will show:
- Product image
- Product name
- Description with price
- Store name

### Method 2: Social Sharing Buttons (Implemented ✅)

Tenants now see share buttons on product pages:
- Facebook
- Twitter/X
- LinkedIn
- WhatsApp
- Instagram
- Pinterest
- Copy Link

## Instagram Sharing - Special Considerations

Instagram works differently from other platforms:

### How Instagram Sharing Works

1. **Instagram Button** - Clicking the Instagram button will:
   - Copy the product link to your clipboard
   - Show a helpful tip about using the link
   - Open Instagram (if app installed) or Instagram.com

2. **Ways to Share Products on Instagram:**

   **Option A: Link in Bio (Easiest)**
   - Copy the product link
   - Add it to your Instagram bio
   - In your post caption, write: "Link in bio 👆"
   - Users click your bio link to view the product

   **Option B: Instagram Stories**
   - Create a story with product image
   - Add product link sticker (if you have Instagram Shopping)
   - Or mention "Link in bio" in the story

   **Option C: Instagram Shopping (Advanced)**
   - Requires Instagram Business account
   - Requires Facebook Catalog integration
   - Products appear with shopping tags
   - Users can tap to buy directly from Instagram
   - See "Instagram Shopping Setup" section below

### Instagram Shopping Setup (Advanced)

For full Instagram Shopping integration:

1. **Requirements:**
   - Instagram Business account
   - Facebook Business account
   - Facebook Catalog with products
   - Business must comply with Instagram's merchant agreement

2. **Setup Steps:**
   - Connect Instagram account to Facebook Business Manager
   - Create Facebook Catalog (can sync from StoreFlow via API)
   - Enable Instagram Shopping in Instagram settings
   - Products will appear with shopping tags

3. **Benefits:**
   - Product tags in posts and stories
   - Direct checkout from Instagram
   - Shopping tab on Instagram profile
   - Better product discovery

**Note:** Full Instagram Shopping integration requires Facebook Catalog API integration. This feature has been added to the StoreFlow development roadmap (`docs/ROADMAP.md`) and is planned for Phase 2: Marketing & Growth.

**Roadmap Reference:** See `docs/ROADMAP.md` for detailed implementation plan and timeline.

## Best Practices for Tenants

### 1. **Product Images**
- Use high-quality images (at least 1200x630px)
- Ensure images are optimized for web
- Use square or landscape orientation (not portrait)
- Include product in center of image

### 2. **Product Descriptions**
- Write compelling descriptions (150-200 characters ideal)
- Include key features/benefits
- Mention price if competitive
- Use clear, action-oriented language

### 3. **Sharing Strategy**
- Share new products immediately
- Share products on sale/discount
- Share customer favorites
- Use relevant hashtags on Twitter/Instagram
- Tag products in stories/posts

### 4. **Timing**
- Share during peak engagement hours
- Post consistently (daily/weekly)
- Share seasonal products ahead of time
- Promote flash sales immediately

## Technical Details

### Open Graph Tags Generated

For each product page, StoreFlow generates:

```html
<meta property="og:title" content="Product Name" />
<meta property="og:description" content="Buy Product Name at Store Name. Price: $XX.XX" />
<meta property="og:image" content="https://store.com/product-image.jpg" />
<meta property="og:url" content="https://store.com/products/product-slug" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Store Name" />
```

### Twitter Cards Generated

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Product Name" />
<meta name="twitter:description" content="Product description" />
<meta name="twitter:image" content="https://store.com/product-image.jpg" />
```

## Analytics Tracking for Social Media Shares

### How It Works

When tenants share products using the share buttons, StoreFlow automatically adds UTM parameters to the shared URLs:

- **`utm_source`**: The social platform (facebook, twitter, linkedin, whatsapp, pinterest, instagram)
- **`utm_medium`**: Always set to "social"
- **`utm_campaign`**: Always set to "product_share"

### Example Shared URL

When a product is shared on Facebook, the URL becomes:
```
https://store.dukanest.com/products/product-slug?utm_source=facebook&utm_medium=social&utm_campaign=product_share
```

### Viewing Social Media Traffic

1. Go to **Dashboard** → **Analytics** → **Advanced** tab
2. Scroll to **Traffic Sources** section
3. You'll see:
   - **By Source**: Shows "facebook", "twitter", "linkedin", etc. as separate sources
   - **By Medium**: Shows "social" as a medium
   - **By Campaign**: Shows "product_share" campaign
   - **Revenue by Source**: Revenue generated from each social platform

### What Gets Tracked

✅ **Tracked Automatically:**
- Visits from shared product links (via UTM parameters)
- Referrer information (when available)
- Social platform identification
- Conversion tracking (orders from social traffic)
- Revenue attribution by social platform

⚠️ **Limitations:**
- Some mobile apps (WhatsApp, Instagram app) may not pass referrer headers
- Private browsing modes may limit referrer tracking
- UTM parameters are the most reliable method (now included automatically)

### Best Practices

1. **Use Share Buttons**: Always use the built-in share buttons to ensure UTM tracking
2. **Monitor Analytics**: Regularly check Traffic Sources to see which platforms drive most traffic
3. **Test Links**: Share a test link and verify it appears in analytics within a few minutes
4. **Campaign Tracking**: For specific campaigns, you can manually add additional UTM parameters

## Testing Your Social Sharing

### Facebook Sharing Debugger
1. Go to: https://developers.facebook.com/tools/debug/
2. Enter your product URL
3. Click "Debug" to see how it will appear
4. Click "Scrape Again" to refresh cache

### Twitter Card Validator
1. Go to: https://cards-dev.twitter.com/validator
2. Enter your product URL
3. See preview of how it will appear

### LinkedIn Post Inspector
1. Go to: https://www.linkedin.com/post-inspector/
2. Enter your product URL
3. See preview

## Instagram Shopping Integration (Planned - See Roadmap)

**Status:** Added to development roadmap for Phase 2 implementation

For full Instagram Shopping support, StoreFlow would need:

1. **Facebook Catalog API Integration**
   - Sync products to Facebook Catalog
   - Real-time inventory updates
   - Price synchronization

2. **Instagram Shopping API**
   - Product tagging in posts
   - Shopping tab on profile
   - Direct checkout integration

3. **Benefits:**
   - Tap-to-shop in Instagram Stories
   - Product tags in Instagram posts
   - Shopping tab on Instagram profile
   - Better conversion from Instagram traffic

**Status:** This is a more advanced feature that requires Facebook/Instagram API integration. Currently, tenants can use the "Link in bio" strategy which works well for most stores.

## Future Enhancements (Recommended)

1. **Share Analytics**
   - Track which products are shared most
   - Track which platforms drive most traffic
   - Conversion tracking from shares

4. **Custom Share Images**
   - Allow tenants to upload custom OG images per product
   - Auto-generate share images with product + price overlay

5. **Share Message Templates**
   - Customizable share messages
   - Product-specific templates
   - A/B testing for share copy

## Implementation Recommendations

### Phase 1: Add Share Buttons (Quick Win)
- Create reusable `ProductShareButtons` component
- Add to product detail pages
- Support Facebook, Twitter, LinkedIn, WhatsApp, Copy Link

### Phase 2: Enhanced Open Graph
- Add product price to Open Graph tags
- Add availability status
- Add product category/brand
- Support multiple product images

### Phase 3: Analytics & Optimization
- Track share events in analytics
- Show share count (if available from APIs)
- A/B test share button placement
- Optimize share message templates

## Support & Resources

- **Open Graph Protocol**: https://ogp.me/
- **Twitter Cards**: https://developer.twitter.com/en/docs/twitter-for-websites/cards
- **Facebook Sharing Best Practices**: https://developers.facebook.com/docs/sharing/best-practices
- **Schema.org Product**: https://schema.org/Product
