-- ============================================================================
-- SEED: Page Builder User Guide
-- 
-- Creates a "Page Builder" category with comprehensive articles covering:
--   1. Page Builder Overview
--   2. Basic Information (Page Settings)
--   3. SEO Settings & SEO Preview
--   4-18. Each of the 15 page builder section types
--
-- Run this SQL directly against your database to insert the content.
-- ============================================================================

-- First, insert the Page Builder category
INSERT INTO user_guide_categories (id, name, slug, icon, color, bg_color, sort_order, is_active)
VALUES (
  gen_random_uuid(),
  'Page Builder',
  'page-builder',
  'Squares2X2Icon',
  'text-pink-600',
  'bg-pink-50',
  13,
  true
);

-- Now insert all articles referencing the category
-- We use a subquery to get the category_id

-- ============================================================================
-- ARTICLE 1: Page Builder Overview
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Page Builder Overview',
  'page-builder-overview',
  '<h2>What is the Page Builder?</h2>
<p>The Page Builder is a powerful visual tool that lets you create beautiful, custom pages for your storefront without writing any code. Instead of working with a plain text editor, you build pages by adding, arranging, and configuring <strong>sections</strong> — pre-designed content blocks that handle layout and styling automatically.</p>

<h3>Why Use the Page Builder?</h3>
<p>The Page Builder is ideal when you want to create visually rich pages that go beyond simple text content. Use it for:</p>
<ul>
<li><strong>Homepage design</strong> — Create an engaging landing page with hero banners, featured products, testimonials, and more</li>
<li><strong>Landing pages</strong> — Build promotional or marketing pages with call-to-action buttons and product showcases</li>
<li><strong>About pages</strong> — Combine text, images, and feature highlights to tell your brand story</li>
<li><strong>Custom pages</strong> — Any page that benefits from structured, visual layouts</li>
</ul>

<h3>How It Works</h3>
<p>The Page Builder uses a section-based approach:</p>
<ol>
<li><strong>Create or edit a page</strong> — Navigate to <strong>Content → Pages</strong> and create a new page or edit an existing one</li>
<li><strong>Switch to Page Builder mode</strong> — In the content editing area, select "Page Builder" as your content mode</li>
<li><strong>Add sections</strong> — Click the <strong>"+ Add Section"</strong> button to choose from 15 different section types</li>
<li><strong>Configure each section</strong> — Each section has its own settings panel where you customize content, colors, layout, and behavior</li>
<li><strong>Reorder sections</strong> — Drag and drop sections to rearrange the page layout</li>
<li><strong>Preview &amp; publish</strong> — Use the Preview button to see how your page looks on the storefront, then publish when ready</li>
</ol>

<h3>Available Section Types</h3>
<p>The Page Builder offers <strong>15 section types</strong>, each designed for a specific purpose:</p>
<table>
<thead><tr><th>Section</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><strong>Hero</strong></td><td>Large banner with title, subtitle, image, and call-to-action button</td></tr>
<tr><td><strong>Features</strong></td><td>Highlight key features or benefits with icons and descriptions</td></tr>
<tr><td><strong>Products</strong></td><td>Display a grid of products from your catalog</td></tr>
<tr><td><strong>Testimonials</strong></td><td>Showcase customer reviews and testimonials</td></tr>
<tr><td><strong>Text</strong></td><td>Rich text content block with full formatting support</td></tr>
<tr><td><strong>Image</strong></td><td>Display a single image with optional caption</td></tr>
<tr><td><strong>Categories</strong></td><td>Browse product categories with circular image thumbnails</td></tr>
<tr><td><strong>Banners</strong></td><td>One or more promotional banners with images and CTAs</td></tr>
<tr><td><strong>Sales Tab</strong></td><td>Showcase active sales and promotions with countdown timers</td></tr>
<tr><td><strong>Split Layout</strong></td><td>Two-column layout combining different content types side by side</td></tr>
<tr><td><strong>CTA (Call to Action)</strong></td><td>Attention-grabbing section with a message and action button</td></tr>
<tr><td><strong>Product Tabs</strong></td><td>Tabbed product display with filters like Popular, New, or by category</td></tr>
<tr><td><strong>Form</strong></td><td>Embed a form (e.g., contact, newsletter signup) into the page</td></tr>
<tr><td><strong>Blogs</strong></td><td>Display recent blog posts in grid, list, or carousel layout</td></tr>
<tr><td><strong>Location</strong></td><td>Show your store location on an interactive Google Map</td></tr>
</tbody>
</table>

<h3>Section Editing</h3>
<p>Each section has a consistent editing experience:</p>
<ul>
<li><strong>Section header</strong> — Shows the section type icon and name, with expand/collapse, reorder, and delete controls</li>
<li><strong>Settings panel</strong> — Expand a section to see its specific settings, organized into logical groups</li>
<li><strong>Color customization</strong> — Most sections support custom title color, subtitle color, and background color</li>
<li><strong>Live preview</strong> — Use the Preview button to see your changes on the storefront in real time</li>
</ul>

<h3>Tips for Great Pages</h3>
<ul>
<li><strong>Start with a Hero</strong> — A hero section makes a strong first impression and sets the tone for the page</li>
<li><strong>Mix section types</strong> — Combine different sections to create visual variety and keep visitors engaged</li>
<li><strong>Use consistent colors</strong> — Stick to your theme colors for a cohesive look, or use section-level color overrides for emphasis</li>
<li><strong>Keep it focused</strong> — Each page should have a clear purpose. Don''t overload with too many sections</li>
<li><strong>Preview often</strong> — Check how your page looks on the storefront as you build it</li>
</ul>',
  '/images/user-guide/page-builder-overview.png',
  'Page Builder Overview',
  0,
  true,
  true
);

-- ============================================================================
-- ARTICLE 2: Basic Information (Page Settings)
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Basic Information & Page Settings',
  'page-basic-information',
  '<h2>Basic Information</h2>
<p>Before building your page content, you need to configure its basic settings. The <strong>Basic Information</strong> card at the top of the page editor contains the essential fields that define your page.</p>

<h3>Page Title</h3>
<p>The <strong>Title</strong> field is the name of your page. It serves multiple purposes:</p>
<ul>
<li>Displayed as the page heading on your storefront</li>
<li>Used in the browser tab title</li>
<li>Shown in search engine results (unless overridden by the Meta Title)</li>
<li>Appears in the pages list in your dashboard</li>
</ul>
<p>Choose a clear, descriptive title that tells visitors what the page is about.</p>

<h3>Page Slug</h3>
<p>The <strong>Slug</strong> is the URL-friendly version of your page title. It determines the page''s web address.</p>
<ul>
<li>Auto-generated from the title when you create a new page (e.g., "Shipping Policy" becomes <code>/shipping-policy</code>)</li>
<li>You can customize it manually if you prefer a different URL</li>
<li>Use lowercase letters, numbers, and hyphens only</li>
<li>Keep slugs short, descriptive, and keyword-rich for better SEO</li>
</ul>
<p><strong>Example:</strong> If your store is at <code>yourstore.com</code> and the slug is <code>about-us</code>, the full URL will be <code>yourstore.com/about-us</code>.</p>

<h3>Header Image Type</h3>
<p>You have two options for adding a visual header to your page:</p>

<h4>Option 1: Use a Banner Image</h4>
<ul>
<li>Upload a single banner image that appears at the top of the page</li>
<li>Recommended dimensions: <strong>1920×1080 pixels</strong> (16:9 aspect ratio)</li>
<li>Best for simple pages, rich text content pages, or when you want quick setup</li>
<li>The banner displays as a full-width image header above your page content</li>
</ul>

<h4>Option 2: Use a Hero Section (Page Builder)</h4>
<ul>
<li>Add a <strong>Hero Section</strong> as the first section in your Page Builder layout</li>
<li>Offers much more customization: title text, subtitle, description, CTA button, background image, colors, and text alignment</li>
<li>Best for pages where you want an interactive, styled header with overlaid text</li>
<li>See the <strong>Hero Section</strong> article for detailed configuration options</li>
</ul>

<h3>Content Mode</h3>
<p>Choose how you want to create your page content:</p>

<h4>Rich Text Editor</h4>
<ul>
<li>A familiar WYSIWYG (What You See Is What You Get) editor</li>
<li>Format text with bold, italic, headings, lists, links, images, code blocks, and quotes</li>
<li>Best for text-heavy pages like policies, FAQs, or simple informational pages</li>
<li>Content is stored as HTML</li>
</ul>

<h4>Page Builder</h4>
<ul>
<li>A visual, section-based builder for creating structured layouts</li>
<li>Add and arrange 15 different section types</li>
<li>Best for visually rich pages like homepages, landing pages, and promotional pages</li>
<li>Content is stored as JSON</li>
</ul>
<p><strong>Note:</strong> You can switch between content modes, but be aware that switching may not preserve formatting perfectly between the two modes.</p>

<h3>Page Status</h3>
<p>Every page has a status that controls its visibility:</p>
<ul>
<li><strong>Draft</strong> — The page is saved but <strong>not visible</strong> on your storefront. Use this while you''re still working on the content.</li>
<li><strong>Published</strong> — The page is <strong>live and visible</strong> to all visitors on your storefront.</li>
<li><strong>Archived</strong> — The page is <strong>hidden</strong> from the storefront. Use this for pages you no longer need but don''t want to delete.</li>
</ul>

<h3>Save Options</h3>
<p>The page editor provides several save options:</p>
<ul>
<li><strong>Save as Draft</strong> — Saves your work without publishing. The page won''t be visible on the storefront.</li>
<li><strong>Publish</strong> — Saves and immediately publishes the page to your storefront.</li>
<li><strong>Preview</strong> — Opens a preview of the page in a new tab so you can see how it looks before publishing.</li>
</ul>
<p><strong>Tip:</strong> When using the Page Builder, the save button defaults to "Save as Draft" to prevent accidental publishing of unfinished pages. Use the explicit "Publish" button when your page is ready to go live.</p>',
  '/images/user-guide/page-basic-info.png',
  'Page Basic Information Settings',
  1,
  true,
  true
);

-- ============================================================================
-- ARTICLE 3: SEO Settings & SEO Preview
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'SEO Settings & SEO Preview',
  'seo-settings-preview',
  '<h2>SEO Settings</h2>
<p>Search Engine Optimization (SEO) settings help your pages rank higher in search engine results like Google. Every page you create has an <strong>SEO Settings</strong> section (collapsible) where you can customize how the page appears in search results.</p>

<h3>Why SEO Matters</h3>
<p>When someone searches for products or topics related to your store on Google, your page''s SEO settings determine:</p>
<ul>
<li><strong>Whether your page appears</strong> in search results</li>
<li><strong>How your page looks</strong> in the search results list</li>
<li><strong>How likely people are to click</strong> on your result</li>
</ul>
<p>Well-optimized SEO settings can significantly increase traffic to your store.</p>

<h3>Meta Title</h3>
<p>The <strong>Meta Title</strong> is the clickable headline that appears in search engine results. It''s also shown in the browser tab.</p>
<ul>
<li><strong>Maximum length:</strong> 60 characters (titles longer than this get truncated in search results)</li>
<li><strong>Best practices:</strong>
<ul>
<li>Include your primary keyword near the beginning</li>
<li>Make it compelling and descriptive</li>
<li>Include your brand name if space allows</li>
<li>Each page should have a unique meta title</li>
</ul>
</li>
<li><strong>If left empty:</strong> The page title is used as the meta title</li>
</ul>
<p><strong>Example:</strong> Instead of "About", use "About Our Store — Handcrafted Jewelry in Nairobi | YourStore"</p>

<h3>Meta Description</h3>
<p>The <strong>Meta Description</strong> is the short paragraph displayed below the title in search results. It gives searchers a summary of what the page is about.</p>
<ul>
<li><strong>Maximum length:</strong> 160 characters (descriptions longer than this get truncated)</li>
<li><strong>Best practices:</strong>
<ul>
<li>Write a clear, compelling summary of the page content</li>
<li>Include relevant keywords naturally</li>
<li>Include a call to action where appropriate (e.g., "Shop now", "Learn more")</li>
<li>Make each page''s description unique</li>
</ul>
</li>
<li><strong>If left empty:</strong> Search engines will auto-generate a description from your page content (which may not be ideal)</li>
</ul>
<p><strong>Example:</strong> "Discover our handcrafted jewelry collection made by local artisans in Nairobi. Free shipping on orders over KSh 5,000. Shop our latest designs."</p>

<h3>Meta Tags</h3>
<p><strong>Meta Tags</strong> (also called meta keywords) are comma-separated keywords that describe the page content. While modern search engines give less weight to meta keywords than they used to, they can still be helpful for:</p>
<ul>
<li>Internal site search functionality</li>
<li>Content categorization</li>
<li>Some smaller search engines</li>
</ul>
<p><strong>Example:</strong> <code>jewelry, handcrafted, Nairobi, necklaces, earrings, bracelets</code></p>

<h2>SEO Preview</h2>
<p>The <strong>SEO Preview</strong> section (collapsible, below SEO Settings) shows you exactly how your page will appear in Google search results — before you even publish it.</p>

<h3>What the Preview Shows</h3>
<p>The SEO Preview displays a realistic Google search result card containing:</p>
<ul>
<li><strong>URL</strong> — Shown in green text, displaying your full page URL based on your store domain and page slug</li>
<li><strong>Title</strong> — Shown in blue as a clickable link. Displays your Meta Title (or page title if Meta Title is empty). Truncated at 60 characters.</li>
<li><strong>Description</strong> — Shown in gray below the title. Displays your Meta Description. Truncated at 160 characters.</li>
</ul>

<h3>SEO Metrics</h3>
<p>Below the preview card, you''ll see real-time <strong>SEO Metrics</strong> that help you optimize:</p>

<h4>Title Length</h4>
<ul>
<li>Shows <strong>current characters / 60 maximum</strong></li>
<li>A progress indicator shows how much of the limit you''ve used</li>
<li>If your title exceeds 60 characters, a <strong>warning</strong> is displayed indicating it may be truncated in search results</li>
<li><strong>Aim for 50-60 characters</strong> for optimal display</li>
</ul>

<h4>Description Length</h4>
<ul>
<li>Shows <strong>current characters / 160 maximum</strong></li>
<li>A progress indicator shows how much of the limit you''ve used</li>
<li>If your description exceeds 160 characters, a <strong>warning</strong> is displayed</li>
<li><strong>Aim for 120-160 characters</strong> for optimal display</li>
</ul>

<h3>Tips for Effective SEO</h3>
<ol>
<li><strong>Fill in all SEO fields</strong> — Don''t leave Meta Title and Meta Description empty. Taking control of how your page appears in search results is important.</li>
<li><strong>Use the SEO Preview</strong> — Check the preview to make sure your page looks good in search results before publishing.</li>
<li><strong>Stay within character limits</strong> — Keep titles under 60 characters and descriptions under 160 characters to avoid truncation.</li>
<li><strong>Use unique content</strong> — Every page should have a unique meta title and description. Duplicate content can hurt your search ranking.</li>
<li><strong>Include keywords</strong> — Use relevant keywords that your customers would search for, but write naturally — don''t stuff keywords.</li>
<li><strong>Update regularly</strong> — Review and update your SEO settings periodically, especially for important pages like your homepage and product pages.</li>
</ol>',
  '/images/user-guide/seo-settings.png',
  'SEO Settings and Preview',
  2,
  true,
  true
);

-- ============================================================================
-- ARTICLE 4: Hero Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Hero Section',
  'page-builder-hero-section',
  '<h2>Hero Section</h2>
<p>The <strong>Hero Section</strong> is the most impactful section type in the Page Builder. It creates a large, attention-grabbing banner at the top of your page — perfect for making a strong first impression.</p>

<h3>When to Use</h3>
<ul>
<li>As the first section on your homepage</li>
<li>For landing pages with a strong headline and call-to-action</li>
<li>To showcase seasonal promotions or announcements</li>
<li>As an alternative to a static banner image for your page header</li>
</ul>

<h3>Configuration Options</h3>

<h4>Text Content</h4>
<ul>
<li><strong>Title</strong> (required) — The main headline text. Make it bold and attention-grabbing.</li>
<li><strong>Subtitle</strong> — A secondary line of text above or below the title for additional context.</li>
<li><strong>Description</strong> — A longer paragraph of supporting text.</li>
</ul>

<h4>Typography</h4>
<ul>
<li><strong>Title Font Size</strong> — Choose from Small, Medium, Large, or Extra Large</li>
<li><strong>Subtitle Font Size</strong> — Choose from Small, Medium, Large, or Extra Large</li>
</ul>

<h4>Colors</h4>
<ul>
<li><strong>Title Color</strong> — Custom color for the main headline</li>
<li><strong>Subtitle Color</strong> — Custom color for the subtitle text</li>
<li><strong>Description Color</strong> — Custom color for the description paragraph</li>
</ul>

<h4>Background</h4>
<p>Choose one of three background styles:</p>
<ul>
<li><strong>None</strong> — No background (uses the page default)</li>
<li><strong>Background Image</strong> — Upload a banner image that fills the entire hero area. Text is overlaid on top of the image.</li>
<li><strong>Background Color</strong> — Set a solid background color using the color picker.</li>
</ul>

<h4>Image (Separate from Background)</h4>
<p>You can also add a normal image alongside the text content:</p>
<ul>
<li><strong>Image</strong> — Upload an image to display alongside the hero text</li>
<li><strong>Image Crop</strong> — Choose how the image is cropped to fit its container</li>
<li><strong>Image Position</strong> — Place the image on the Left, Center, or Right side</li>
</ul>

<h4>Text Alignment</h4>
<ul>
<li><strong>Left</strong> — Text is left-aligned (default)</li>
<li><strong>Center</strong> — Text is centered horizontally</li>
<li><strong>Right</strong> — Text is right-aligned</li>
</ul>

<h4>Call-to-Action (CTA) Button</h4>
<ul>
<li><strong>CTA Text</strong> — Button label (e.g., "Shop Now", "Learn More", "Get Started")</li>
<li><strong>CTA Link</strong> — Where the button takes visitors when clicked. You can select from your published pages or enter a custom URL.</li>
<li><strong>CTA Text Color</strong> — The color of the button text</li>
<li><strong>CTA Button Color</strong> — The background color of the button</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Keep the title short and impactful — 5-8 words is ideal</li>
<li>Use a high-quality background image (at least 1920×1080 pixels)</li>
<li>Ensure text is readable against the background — use contrasting colors</li>
<li>Always include a CTA button to guide visitors to take action</li>
<li>Test on mobile devices — the hero should look great on all screen sizes</li>
</ul>',
  '/images/user-guide/pb-hero.png',
  'Hero Section',
  3,
  true,
  true
);

-- ============================================================================
-- ARTICLE 5: Features Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Features Section',
  'page-builder-features-section',
  '<h2>Features Section</h2>
<p>The <strong>Features Section</strong> lets you highlight key selling points, benefits, or services offered by your store. It displays a grid of feature cards, each with an icon or image, title, and description.</p>

<h3>When to Use</h3>
<ul>
<li>To showcase your store''s unique selling points (e.g., "Free Delivery", "24/7 Support", "Quality Guaranteed")</li>
<li>To highlight services or benefits</li>
<li>To display a set of features for a product or service</li>
<li>Below a Hero section to reinforce your value proposition</li>
</ul>

<h3>Configuration Options</h3>

<h4>Section Header</h4>
<ul>
<li><strong>Title</strong> — Section heading (e.g., "Why Choose Us", "Our Services")</li>
<li><strong>Subtitle</strong> — Supporting text below the title</li>
</ul>

<h4>Colors</h4>
<ul>
<li><strong>Title Color</strong> — Custom color for the section heading</li>
<li><strong>Subtitle Color</strong> — Custom color for the subtitle</li>
<li><strong>Background Color</strong> — Background color for the entire section</li>
</ul>

<h4>Layout</h4>
<ul>
<li><strong>Columns</strong> — Choose 2, 3, or 4 columns for the feature grid</li>
</ul>

<h4>Features List</h4>
<p>Add one or more features, each with:</p>
<ul>
<li><strong>Title</strong> (required) — The feature name or benefit</li>
<li><strong>Description</strong> — A brief explanation of the feature</li>
<li><strong>Icon</strong> — An emoji icon to visually represent the feature (e.g., 🚚 for delivery, ⭐ for quality)</li>
<li><strong>Image</strong> — Alternatively, upload a custom image instead of using an emoji</li>
</ul>

<h3>Managing Features</h3>
<ul>
<li>Click <strong>"Add Feature"</strong> to add a new feature card</li>
<li>Each feature can be expanded to edit its details</li>
<li>Use the <strong>delete</strong> button to remove a feature</li>
<li>Features are displayed in the order they appear in the list</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Use 3-4 features for the best visual balance</li>
<li>Keep titles concise — 2-4 words each</li>
<li>Keep descriptions brief — 1-2 sentences</li>
<li>Use consistent icons (all emojis or all images, not mixed)</li>
<li>Make sure features are genuinely meaningful to your customers</li>
</ul>',
  '/images/user-guide/pb-features.png',
  'Features Section',
  4,
  true,
  false
);

-- ============================================================================
-- ARTICLE 6: Products Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Products Section',
  'page-builder-products-section',
  '<h2>Products Section</h2>
<p>The <strong>Products Section</strong> displays a grid of products from your store catalog directly on the page. It automatically pulls product data including images, names, and prices.</p>

<h3>When to Use</h3>
<ul>
<li>On your homepage to showcase featured products</li>
<li>On landing pages to highlight specific product collections</li>
<li>On category pages to display products from a specific category</li>
</ul>

<h3>Configuration Options</h3>

<h4>Section Header</h4>
<ul>
<li><strong>Title</strong> — Section heading (e.g., "Our Products", "Featured Items", "New Arrivals")</li>
<li><strong>Subtitle</strong> — Supporting text below the heading</li>
</ul>

<h4>Colors</h4>
<ul>
<li><strong>Title Color</strong> — Custom heading color</li>
<li><strong>Subtitle Color</strong> — Custom subtitle color</li>
<li><strong>Background Color</strong> — Section background color</li>
</ul>

<h4>Product Display</h4>
<ul>
<li><strong>Columns</strong> — Display products in 2, 3, or 4 columns</li>
<li><strong>Limit</strong> — Maximum number of products to display (default: 8)</li>
<li><strong>Category Filter</strong> — Optionally filter to show products from a specific category only. Leave empty to show products from all categories.</li>
</ul>

<h3>How It Works</h3>
<p>The Products Section automatically fetches active products from your store. Each product card displays:</p>
<ul>
<li>Product image</li>
<li>Product name</li>
<li>Price (including sale price if applicable)</li>
<li>Sale badge if the product is on sale</li>
<li>Link to the product detail page</li>
</ul>
<p>Products are pulled in real time, so any changes to your product catalog (new products, price updates, etc.) are reflected automatically.</p>

<h3>Best Practices</h3>
<ul>
<li>Use 4 columns for a clean look on desktop, which automatically adapts for mobile</li>
<li>Set a reasonable limit (8-12 products) to avoid overwhelming visitors</li>
<li>Use the category filter to create focused product showcases</li>
<li>Ensure your products have good images — they''re the star of this section</li>
</ul>',
  '/images/user-guide/pb-products.png',
  'Products Section',
  5,
  true,
  false
);

-- ============================================================================
-- ARTICLE 7: Testimonials Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Testimonials Section',
  'page-builder-testimonials-section',
  '<h2>Testimonials Section</h2>
<p>The <strong>Testimonials Section</strong> showcases customer reviews and feedback to build trust with potential buyers. Social proof is one of the most effective ways to increase conversions.</p>

<h3>When to Use</h3>
<ul>
<li>On your homepage to build credibility</li>
<li>On product or service pages to reinforce quality</li>
<li>On "About Us" pages to demonstrate customer satisfaction</li>
</ul>

<h3>Configuration Options</h3>

<h4>Section Header</h4>
<ul>
<li><strong>Title</strong> — Section heading (e.g., "What Our Customers Say", "Testimonials")</li>
<li><strong>Subtitle</strong> — Supporting text</li>
</ul>

<h4>Colors</h4>
<ul>
<li><strong>Title Color</strong>, <strong>Subtitle Color</strong>, <strong>Background Color</strong></li>
</ul>

<h4>Layout</h4>
<ul>
<li><strong>Columns</strong> — Display testimonials in 1, 2, or 3 columns</li>
</ul>

<h4>Testimonials List</h4>
<p>Add one or more testimonials, each with:</p>
<ul>
<li><strong>Name</strong> (required) — The customer''s name</li>
<li><strong>Content</strong> (required) — The testimonial text / review</li>
<li><strong>Role</strong> — Customer''s role or title (e.g., "Loyal Customer", "Business Owner")</li>
<li><strong>Company</strong> — Customer''s company name (if applicable)</li>
<li><strong>Rating</strong> — Star rating from 1 to 5 (displayed as stars)</li>
<li><strong>Image</strong> — Customer''s photo or avatar</li>
</ul>

<h3>Managing Testimonials</h3>
<ul>
<li>Click <strong>"Add Testimonial"</strong> to add a new customer review</li>
<li>Each testimonial card can be expanded to edit its details</li>
<li>Use the <strong>delete</strong> button to remove a testimonial</li>
<li>Reorder testimonials by rearranging them in the list</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Use real customer feedback — authenticity matters</li>
<li>Include customer photos when possible for added credibility</li>
<li>Use 3 testimonials for visual balance on desktop</li>
<li>Include the customer''s role or company for added authority</li>
<li>Highlight different aspects of your business (quality, service, delivery, etc.)</li>
</ul>',
  '/images/user-guide/pb-testimonials.png',
  'Testimonials Section',
  6,
  true,
  false
);

-- ============================================================================
-- ARTICLE 8: Text Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Text Section',
  'page-builder-text-section',
  '<h2>Text Section</h2>
<p>The <strong>Text Section</strong> provides a rich text content block within the Page Builder. It uses the same WYSIWYG editor available in the Rich Text content mode, giving you full formatting capabilities within a structured page layout.</p>

<h3>When to Use</h3>
<ul>
<li>To add paragraphs of text between visual sections</li>
<li>For policy content, terms, or detailed descriptions within a page builder page</li>
<li>When you need formatted text with headings, lists, links, and images</li>
</ul>

<h3>Configuration Options</h3>

<h4>Content</h4>
<ul>
<li><strong>Rich Text Editor</strong> — A full WYSIWYG editor with formatting toolbar supporting:
<ul>
<li>Bold, Italic text</li>
<li>Headings (H1, H2, H3)</li>
<li>Bulleted and numbered lists</li>
<li>Block quotes</li>
<li>Code blocks</li>
<li>Hyperlinks</li>
<li>Inline images</li>
</ul>
</li>
</ul>

<h4>Colors</h4>
<ul>
<li><strong>Text Color</strong> — Override the default text color for this section</li>
<li><strong>Background Color</strong> — Set a background color for the text block</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Use headings to structure long text content</li>
<li>Keep paragraphs short and scannable</li>
<li>Use the background color to create visual separation from adjacent sections</li>
<li>Break up long text with lists, bold text, and sub-headings</li>
</ul>',
  '/images/user-guide/pb-text.png',
  'Text Section',
  7,
  true,
  false
);

-- ============================================================================
-- ARTICLE 9: Image Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Image Section',
  'page-builder-image-section',
  '<h2>Image Section</h2>
<p>The <strong>Image Section</strong> displays a single, prominent image on the page. It''s the simplest visual section — ideal for showcasing a key photo, infographic, or visual content.</p>

<h3>When to Use</h3>
<ul>
<li>To display a standalone image such as a promotional banner or infographic</li>
<li>To break up text-heavy content with a visual element</li>
<li>For showcasing photos of your store, team, or products</li>
</ul>

<h3>Configuration Options</h3>
<ul>
<li><strong>Image</strong> (required) — Upload or select the image to display</li>
<li><strong>Alt Text</strong> — Alternative text for accessibility and SEO. Describe what the image shows.</li>
<li><strong>Caption</strong> — Optional text displayed below the image</li>
<li><strong>Full Width</strong> — Toggle to make the image stretch to the full width of the page (edge to edge)</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Always add descriptive alt text for accessibility and SEO</li>
<li>Use high-quality images that are optimized for web (compress to reduce file size without losing quality)</li>
<li>Use the caption to provide context or credits</li>
<li>Choose full width for impactful banner-style images, or leave it off for content-width display</li>
</ul>',
  '/images/user-guide/pb-image.png',
  'Image Section',
  8,
  true,
  false
);

-- ============================================================================
-- ARTICLE 10: Categories Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Categories Section',
  'page-builder-categories-section',
  '<h2>Categories Section</h2>
<p>The <strong>Categories Section</strong> displays your product categories as a grid of circular image thumbnails. It helps visitors quickly browse and navigate to specific product categories.</p>

<h3>When to Use</h3>
<ul>
<li>On your homepage to help visitors find products by category</li>
<li>On landing pages to guide customers to specific product groups</li>
<li>Anywhere you want to provide easy category navigation</li>
</ul>

<h3>Configuration Options</h3>

<h4>Section Header</h4>
<ul>
<li><strong>Title</strong> — Section heading (e.g., "Browse By Categories", "Shop By Category")</li>
<li><strong>Subtitle</strong> — Supporting text</li>
</ul>

<h4>Colors</h4>
<ul>
<li><strong>Title Color</strong>, <strong>Subtitle Color</strong>, <strong>Background Color</strong></li>
</ul>

<h4>Category Selection</h4>
<ul>
<li><strong>Categories</strong> — Select specific categories to display. Leave empty to automatically show all categories (up to the limit).</li>
<li><strong>Limit</strong> — Maximum number of categories to display (default: 8)</li>
</ul>

<h4>Layout</h4>
<ul>
<li><strong>Columns</strong> — Display categories in 2, 4, 6, or 8 columns</li>
<li><strong>Show Item Count</strong> — Toggle to show a "View Items" label beneath each category name</li>
</ul>

<h3>How It Looks</h3>
<p>Each category is displayed as:</p>
<ul>
<li>A circular image thumbnail with a themed border that highlights on hover</li>
<li>The category name in bold text below</li>
<li>Optionally, a "View Items" label</li>
<li>Clicking a category takes visitors to the filtered product listing for that category</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Make sure all your categories have images uploaded — the section looks best when every category has a visual</li>
<li>Use consistent image styles across categories (same lighting, background, composition)</li>
<li>Select the most popular or important categories if you have many</li>
<li>Use 6 or 8 columns for a compact, visual display</li>
</ul>',
  '/images/user-guide/pb-categories.png',
  'Categories Section',
  9,
  true,
  false
);

-- ============================================================================
-- ARTICLE 11: Banners Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Banners Section',
  'page-builder-banners-section',
  '<h2>Banners Section</h2>
<p>The <strong>Banners Section</strong> lets you create one or more promotional banners with images, text, and call-to-action buttons. It''s perfect for highlighting promotions, announcements, or featured content.</p>

<h3>When to Use</h3>
<ul>
<li>For promotional advertisements on your homepage</li>
<li>To highlight multiple offers or announcements side by side</li>
<li>For visual CTAs that link to specific pages, sales, or products</li>
</ul>

<h3>Configuration Options</h3>

<h4>Section Header</h4>
<ul>
<li><strong>Section Title</strong> — Optional heading for the banner group</li>
<li><strong>Section Subtitle</strong> — Optional supporting text</li>
</ul>

<h4>Colors</h4>
<ul>
<li><strong>Title Color</strong>, <strong>Subtitle Color</strong>, <strong>Background Color</strong></li>
</ul>

<h4>Layout</h4>
<ul>
<li><strong>Columns</strong> — Display banners in 1, 2, or 3 columns</li>
</ul>

<h4>Individual Banners</h4>
<p>Add one or more banners, each with:</p>
<ul>
<li><strong>Title</strong> (required) — The banner headline</li>
<li><strong>Subtitle</strong> — Supporting text</li>
<li><strong>Image</strong> (required) — The banner background image</li>
<li><strong>CTA Text</strong> — Button label (e.g., "Shop Now")</li>
<li><strong>CTA Link</strong> — Button destination. You can select from published pages or enter a custom URL.</li>
<li><strong>Background Color</strong> — Fallback color if no image is provided</li>
<li><strong>Title Color</strong>, <strong>Subtitle Color</strong> — Text colors for this specific banner</li>
<li><strong>CTA Text Color</strong>, <strong>CTA Button Color</strong> — Button styling for this banner</li>
</ul>

<h3>Managing Banners</h3>
<ul>
<li>Click <strong>"Add Banner"</strong> to add a new promotional banner</li>
<li>Expand each banner to configure its individual settings</li>
<li>Delete banners you no longer need</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Use 2-3 banners side by side for visual impact</li>
<li>Keep banner text minimal — let the image do the talking</li>
<li>Use high-quality, eye-catching images</li>
<li>Always include a CTA button with a clear action</li>
<li>Customize each banner''s colors to match its image</li>
</ul>',
  '/images/user-guide/pb-banners.png',
  'Banners Section',
  10,
  true,
  false
);

-- ============================================================================
-- ARTICLE 12: Sales Tab Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Sales Tab Section',
  'page-builder-sales-tab-section',
  '<h2>Sales Tab Section</h2>
<p>The <strong>Sales Tab Section</strong> is a powerful section for showcasing your active sales and promotions. It can display countdown timers, sale badges, and products on sale — making it ideal for driving urgency and conversions.</p>

<h3>When to Use</h3>
<ul>
<li>On your homepage to highlight current promotions</li>
<li>On dedicated sales landing pages</li>
<li>Anywhere you want to showcase discounted products with urgency</li>
</ul>

<h3>Configuration Options</h3>

<h4>Display Mode</h4>
<p>Choose how sales are displayed:</p>
<ul>
<li><strong>Single Sale</strong> — Show products from one specific sale. Select the sale by ID or slug.</li>
<li><strong>Featured Sales</strong> — Show multiple featured sales. Select which sales to feature and set a maximum count (default: 5).</li>
<li><strong>All Active</strong> — Automatically display all currently active sales.</li>
</ul>

<h4>Layout</h4>
<ul>
<li><strong>Layout Style</strong> — Choose Grid, Carousel, or Tabs (tabs mode only available for Featured Sales)</li>
<li><strong>Columns</strong> — For grid layout: 2, 3, or 4 columns</li>
</ul>

<h4>Section Header</h4>
<ul>
<li><strong>Title</strong>, <strong>Subtitle</strong></li>
<li><strong>Title Color</strong>, <strong>Subtitle Color</strong>, <strong>Background Color</strong></li>
</ul>

<h4>Product Display</h4>
<ul>
<li><strong>Product Limit</strong> — Maximum products shown per sale (default: 8)</li>
<li><strong>Product Card Style</strong> — Default, Compact, or Detailed</li>
</ul>

<h4>Sale Features</h4>
<ul>
<li><strong>Show Countdown</strong> — Display a countdown timer showing when the sale ends</li>
<li><strong>Show Badge</strong> — Show a sale badge on product cards</li>
<li><strong>Show Sale Name</strong> — Display the name of the sale</li>
<li><strong>Badge Text Override</strong> — Custom badge text (e.g., "50% OFF" instead of the default)</li>
<li><strong>Badge Color</strong> — Custom color for the sale badge</li>
</ul>

<h4>Banner Style</h4>
<ul>
<li><strong>Full Width</strong> — Sale banner stretches edge to edge</li>
<li><strong>Contained</strong> — Sale banner stays within the content width</li>
<li><strong>None</strong> — No sale banner displayed</li>
</ul>

<h4>CTA Button</h4>
<ul>
<li><strong>CTA Text</strong> — Button label (e.g., "View All Deals")</li>
<li><strong>CTA Link</strong> — Button destination URL</li>
<li><strong>CTA Position</strong> — Top Right, Bottom Center, or None</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Enable countdown timers to create urgency</li>
<li>Use the Featured Sales mode to showcase your best promotions</li>
<li>Keep product limits reasonable (8-12) for clean display</li>
<li>Use Tabs layout for featured sales to let visitors switch between different promotions</li>
<li>Make sure the sales referenced are actually active — expired sales won''t display products</li>
</ul>',
  '/images/user-guide/pb-sales-tab.png',
  'Sales Tab Section',
  11,
  true,
  false
);

-- ============================================================================
-- ARTICLE 13: Split Layout Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Split Layout Section',
  'page-builder-split-layout-section',
  '<h2>Split Layout Section</h2>
<p>The <strong>Split Layout Section</strong> creates a two-column layout where each side can contain a different type of content. It''s one of the most versatile sections in the Page Builder, allowing you to combine text, images, products, features, and forms side by side.</p>

<h3>When to Use</h3>
<ul>
<li>To combine a promotional banner with a product grid</li>
<li>For "About" sections with text on one side and an image on the other</li>
<li>To pair a contact form with store information</li>
<li>For any layout that needs two different content types side by side</li>
</ul>

<h3>Configuration Options</h3>

<h4>Layout Ratio</h4>
<p>Choose how the two columns divide the available space:</p>
<ul>
<li><strong>50/50</strong> — Equal width columns</li>
<li><strong>60/40</strong> — Left column is wider</li>
<li><strong>40/60</strong> — Right column is wider</li>
<li><strong>70/30</strong> — Left column is much wider</li>
<li><strong>30/70</strong> — Right column is much wider</li>
</ul>

<h4>Mobile Behavior</h4>
<p>On mobile screens, two columns won''t fit. Choose how the layout adapts:</p>
<ul>
<li><strong>Stack</strong> — Left on top, right below</li>
<li><strong>Reverse Stack</strong> — Right on top, left below</li>
<li><strong>Scroll</strong> — Horizontal scroll between columns</li>
<li><strong>Hide Left</strong> — Only show the right column on mobile</li>
<li><strong>Hide Right</strong> — Only show the left column on mobile</li>
</ul>

<h4>Additional Layout Options</h4>
<ul>
<li><strong>Reverse Desktop Order</strong> — Swap the positions of left and right columns</li>
<li><strong>Full Width</strong> — Stretch the section edge to edge</li>
<li><strong>Section Padding</strong> — Control top, bottom, left, and right padding</li>
<li><strong>Column Gap</strong> — Space between the two columns</li>
<li><strong>Content Padding</strong> — Internal padding within each column</li>
<li><strong>Background Color/Gradient</strong> — Section-level background styling</li>
<li><strong>Minimum Height</strong> — Set a minimum height for the section</li>
</ul>

<h4>Left Side Content Types</h4>
<ul>
<li><strong>Banner</strong> — Display an image with optional CTA link, overlay, and border radius</li>
<li><strong>Text</strong> — Rich text with title, subtitle, description, CTA button, and color controls</li>
<li><strong>Form</strong> — Embed a form from your forms library</li>
<li><strong>Products</strong> — Display a product grid with limit, columns, and category filter</li>
</ul>

<h4>Right Side Content Types</h4>
<ul>
<li><strong>Products</strong> — Product grid display</li>
<li><strong>Features</strong> — Feature cards with icons/images, titles, and descriptions</li>
<li><strong>Text</strong> — Rich text content block</li>
<li><strong>Banner</strong> — Image banner display</li>
<li><strong>Form</strong> — Embedded form</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Pair visual content (banners/images) with text or products for variety</li>
<li>Use 60/40 or 40/60 ratios to create visual hierarchy</li>
<li>Choose appropriate mobile behavior — "Stack" works well in most cases</li>
<li>Test the layout on different screen sizes using the preview feature</li>
</ul>',
  '/images/user-guide/pb-split-layout.png',
  'Split Layout Section',
  12,
  true,
  false
);

-- ============================================================================
-- ARTICLE 14: CTA Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'CTA (Call to Action) Section',
  'page-builder-cta-section',
  '<h2>CTA (Call to Action) Section</h2>
<p>The <strong>CTA Section</strong> is an attention-grabbing block designed to encourage visitors to take a specific action. It features a prominent message and a single action button — clean, focused, and effective.</p>

<h3>When to Use</h3>
<ul>
<li>To encourage visitors to sign up, shop, or contact you</li>
<li>Between other sections to break up content with a clear call to action</li>
<li>At the bottom of a page as a final prompt</li>
<li>For promotional announcements with a direct link</li>
</ul>

<h3>Configuration Options</h3>

<h4>Content</h4>
<ul>
<li><strong>Title</strong> (required) — The main call-to-action message (e.g., "Ready to Get Started?", "Don''t Miss Out!")</li>
<li><strong>Subtitle</strong> — Supporting text to reinforce the message</li>
<li><strong>CTA Text</strong> (required) — Button label (e.g., "Shop Now", "Sign Up", "Contact Us")</li>
<li><strong>CTA Link</strong> (required) — Button destination. Select from published pages or enter a custom URL.</li>
</ul>

<h4>Colors</h4>
<ul>
<li><strong>Title Color</strong> — Headline text color</li>
<li><strong>Subtitle Color</strong> — Supporting text color</li>
<li><strong>Text Color</strong> — General text color</li>
<li><strong>CTA Text Color</strong> — Button text color</li>
<li><strong>CTA Button Color</strong> — Button background color</li>
</ul>

<h4>Background</h4>
<ul>
<li><strong>Solid Color</strong> — Set a single background color</li>
<li><strong>Gradient</strong> — Create a gradient background for a more dynamic look</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Keep the title short and action-oriented</li>
<li>Use contrasting colors to make the button stand out</li>
<li>Place CTAs strategically — after showcasing products or features</li>
<li>Use a gradient background to make the section visually distinct</li>
<li>Have one clear action per CTA section — don''t confuse visitors with multiple options</li>
</ul>',
  '/images/user-guide/pb-cta.png',
  'CTA Section',
  13,
  true,
  false
);

-- ============================================================================
-- ARTICLE 15: Product Tabs Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Product Tabs Section',
  'page-builder-product-tabs-section',
  '<h2>Product Tabs Section</h2>
<p>The <strong>Product Tabs Section</strong> displays products organized into clickable tabs. Each tab can filter products by different criteria, allowing visitors to switch between collections without leaving the page.</p>

<h3>When to Use</h3>
<ul>
<li>On your homepage to show Popular, New, and Budget-friendly products in one section</li>
<li>When you want to showcase multiple product collections compactly</li>
<li>To let visitors discover different product groups interactively</li>
</ul>

<h3>Configuration Options</h3>

<h4>Section Header</h4>
<ul>
<li><strong>Title</strong> — Section heading (e.g., "Our Collections", "Explore Products")</li>
<li><strong>Title Color</strong>, <strong>Background Color</strong></li>
</ul>

<h4>Product Display</h4>
<ul>
<li><strong>Columns</strong> — Display products in 2, 3, or 4 columns</li>
<li><strong>Limit</strong> — Maximum products shown per tab (default: 8)</li>
</ul>

<h4>Tabs Configuration</h4>
<p>Add one or more tabs, each with:</p>
<ul>
<li><strong>Label</strong> (required) — The tab name shown to visitors (e.g., "Popular", "New Arrivals", "Under KSh 1000")</li>
<li><strong>Filter</strong> — How products are selected for this tab:
<ul>
<li><strong>Popular</strong> — Shows your best-selling or most-viewed products</li>
<li><strong>New</strong> — Shows your most recently added products</li>
<li><strong>Low Price</strong> — Shows products sorted by price (lowest first)</li>
<li><strong>Category</strong> — Shows products from a specific category (select the category)</li>
</ul>
</li>
<li><strong>Category</strong> — If filter is "Category", select which category to display</li>
</ul>

<h4>Default Tab</h4>
<ul>
<li><strong>Default Tab</strong> — Choose which tab is active when the page first loads</li>
</ul>

<h3>Managing Tabs</h3>
<ul>
<li>Click <strong>"Add Tab"</strong> to create a new product tab</li>
<li>Expand each tab to configure its label and filter</li>
<li>Delete tabs you don''t need</li>
<li>Set the default active tab</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Use 3-4 tabs for the best user experience</li>
<li>Give tabs clear, descriptive labels</li>
<li>Include a mix of filter types (Popular + New + Category) for variety</li>
<li>Set the default tab to your most compelling collection</li>
</ul>',
  '/images/user-guide/pb-product-tabs.png',
  'Product Tabs Section',
  14,
  true,
  false
);

-- ============================================================================
-- ARTICLE 16: Form Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Form Section',
  'page-builder-form-section',
  '<h2>Form Section</h2>
<p>The <strong>Form Section</strong> lets you embed any of your store''s forms directly into a page built with the Page Builder. This makes it easy to add contact forms, feedback forms, newsletter signups, or any custom form to any page.</p>

<h3>When to Use</h3>
<ul>
<li>To add a contact form to your "Contact Us" page</li>
<li>To embed a newsletter signup on your homepage</li>
<li>To add a feedback or inquiry form to a landing page</li>
<li>Within a Split Layout section alongside store information</li>
</ul>

<h3>Configuration Options</h3>

<h4>Form Selection</h4>
<ul>
<li><strong>Form</strong> (required) — Select from your available forms. Forms are created and managed in <strong>Content → Forms</strong>.</li>
</ul>

<h4>Section Header</h4>
<ul>
<li><strong>Section Title</strong> — Optional heading above the form (e.g., "Get in Touch", "Send Us a Message")</li>
<li><strong>Section Subtitle</strong> — Optional supporting text</li>
</ul>

<h4>Colors</h4>
<ul>
<li><strong>Title Color</strong>, <strong>Subtitle Color</strong>, <strong>Background Color</strong></li>
</ul>

<h4>Display Options</h4>
<ul>
<li><strong>Show Form Title</strong> — Toggle whether to show the form''s own built-in title (in addition to the section title)</li>
<li><strong>Container Width</strong> — Control the form''s width: Small (sm), Medium (md), Large (lg), Extra Large (xl), or Full Width (full)</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Create your forms in <strong>Content → Forms</strong> first, then embed them in the Page Builder</li>
<li>Use a smaller container width (sm or md) for simple forms to keep them focused</li>
<li>Use the Section Title to provide context, and hide the form''s own title if it would be redundant</li>
<li>Consider placing the form in a Split Layout section with text or a banner on the other side</li>
</ul>',
  '/images/user-guide/pb-form.png',
  'Form Section',
  15,
  true,
  false
);

-- ============================================================================
-- ARTICLE 17: Blogs Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Blogs Section',
  'page-builder-blogs-section',
  '<h2>Blogs Section</h2>
<p>The <strong>Blogs Section</strong> displays your latest blog posts directly on a page. It pulls posts from your blog and presents them in a visually appealing layout, encouraging visitors to explore your content.</p>

<h3>When to Use</h3>
<ul>
<li>On your homepage to showcase recent blog posts</li>
<li>On landing pages to demonstrate thought leadership or provide helpful content</li>
<li>To cross-promote blog content on product or category pages</li>
</ul>

<h3>Configuration Options</h3>

<h4>Section Header</h4>
<ul>
<li><strong>Title</strong> — Section heading (e.g., "Latest from Our Blog", "News & Updates")</li>
<li><strong>Subtitle</strong> — Supporting text</li>
</ul>

<h4>Colors</h4>
<ul>
<li><strong>Title Color</strong>, <strong>Subtitle Color</strong>, <strong>Background Color</strong></li>
</ul>

<h4>Layout</h4>
<ul>
<li><strong>Layout Style</strong> — Choose how posts are displayed:
<ul>
<li><strong>Grid</strong> — Posts in a responsive grid (most common)</li>
<li><strong>List</strong> — Posts in a vertical list layout</li>
<li><strong>Carousel</strong> — Posts in a scrollable carousel</li>
</ul>
</li>
<li><strong>Columns</strong> — For grid layout: 2, 3, or 4 columns</li>
<li><strong>Limit</strong> — Maximum number of posts to display (default: 6)</li>
</ul>

<h4>Filtering & Sorting</h4>
<ul>
<li><strong>Category Filter</strong> — Show posts from a specific blog category only (optional)</li>
<li><strong>Sort By</strong> — Order posts by Created Date, Updated Date, or Title</li>
<li><strong>Sort Direction</strong> — Ascending or Descending</li>
</ul>

<h4>Display Options</h4>
<ul>
<li><strong>Show Excerpt</strong> — Display a brief summary of each post</li>
<li><strong>Show Date</strong> — Show the publication date</li>
<li><strong>Show Author</strong> — Display the author name</li>
<li><strong>Show Category</strong> — Show the blog category label</li>
<li><strong>Show Read More</strong> — Display a "Read More" link on each post card</li>
</ul>

<h4>CTA Button</h4>
<ul>
<li><strong>CTA Text</strong> — Button label (e.g., "View All Posts")</li>
<li><strong>CTA Link</strong> — Link to your full blog page</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Show 3-6 posts for a clean display</li>
<li>Use the grid layout with 3 columns for a balanced look</li>
<li>Enable excerpts and dates for informative post cards</li>
<li>Add a "View All Posts" CTA to link to your full blog page</li>
<li>Use the category filter to show relevant content on specific pages</li>
</ul>',
  '/images/user-guide/pb-blogs.png',
  'Blogs Section',
  16,
  true,
  false
);

-- ============================================================================
-- ARTICLE 18: Location Section
-- ============================================================================
INSERT INTO user_guide_articles (id, category_id, title, slug, content, image, image_alt, sort_order, is_active, is_popular)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_guide_categories WHERE slug = 'page-builder'),
  'Location Section',
  'page-builder-location-section',
  '<h2>Location Section</h2>
<p>The <strong>Location Section</strong> displays your store''s physical location on an interactive Google Map. This is perfect for stores with a physical presence that want to help customers find them.</p>

<h3>When to Use</h3>
<ul>
<li>On your "Contact Us" or "Find Us" page</li>
<li>On your "About" page to show your store location</li>
<li>On any page where customers might want directions to your store</li>
</ul>

<h3>Configuration Options</h3>

<h4>Section Header</h4>
<ul>
<li><strong>Title</strong> — Section heading (e.g., "Visit Our Store", "Find Us")</li>
<li><strong>Subtitle</strong> — Supporting text (e.g., your full address)</li>
</ul>

<h4>Colors</h4>
<ul>
<li><strong>Title Color</strong>, <strong>Subtitle Color</strong>, <strong>Background Color</strong></li>
</ul>

<h4>Location Details</h4>
<ul>
<li><strong>Address</strong> (required) — Your full store address. This is used to place the marker on the map.</li>
<li><strong>Latitude</strong> — Optional: Enter precise latitude coordinates for exact pin placement</li>
<li><strong>Longitude</strong> — Optional: Enter precise longitude coordinates for exact pin placement</li>
</ul>
<p><strong>Tip:</strong> If the map isn''t showing your exact location correctly using the address alone, provide latitude and longitude coordinates for precise placement. You can find these from Google Maps by right-clicking on your location.</p>

<h4>Map Settings</h4>
<ul>
<li><strong>Map Type</strong> — Choose the visual style of the map:
<ul>
<li><strong>Roadmap</strong> — Standard street map (default)</li>
<li><strong>Satellite</strong> — Aerial satellite imagery</li>
<li><strong>Hybrid</strong> — Satellite imagery with street labels overlaid</li>
<li><strong>Terrain</strong> — Physical terrain with elevation shading</li>
</ul>
</li>
<li><strong>Zoom Level</strong> — Set the map zoom from 1 (world view) to 20 (building level). Default: 15 (neighborhood level).</li>
<li><strong>Map Height</strong> — Height of the map in pixels (default: 400px)</li>
<li><strong>Full Width</strong> — Toggle to make the map stretch edge to edge</li>
<li><strong>Show Info Window</strong> — Toggle to display an info popup on the map marker with your store details</li>
</ul>

<h3>Best Practices</h3>
<ul>
<li>Use the Roadmap type for most stores — it''s the most familiar and readable</li>
<li>Set zoom level to 14-16 for neighborhood context while still showing your exact location</li>
<li>Provide latitude and longitude for precise pin placement</li>
<li>Enable the info window to show your address and store name on the map</li>
<li>Pair the location section with a Text section containing your store hours and contact details</li>
</ul>',
  '/images/user-guide/pb-location.png',
  'Location Section',
  17,
  true,
  false
);

-- ============================================================================
-- Verify the insert
-- ============================================================================
SELECT 
  c.name AS category,
  c.slug AS category_slug,
  COUNT(a.id) AS article_count
FROM user_guide_categories c
LEFT JOIN user_guide_articles a ON a.category_id = c.id
WHERE c.slug = 'page-builder'
GROUP BY c.name, c.slug;

SELECT title, slug, sort_order, is_popular
FROM user_guide_articles 
WHERE category_id = (SELECT id FROM user_guide_categories WHERE slug = 'page-builder')
ORDER BY sort_order;
