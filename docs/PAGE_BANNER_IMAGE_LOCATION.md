# Page Banner Image Location

## Where the Banner Image Appears

When you create a page with a **banner image** in the page editor, the banner will be displayed at the **top of the page** when visitors access it via its slug URL.

### Page URL Structure

Pages are accessible at: `https://yourstore.dukanest.com/[page-slug]`

**Examples:**
- `/about` - About Us page
- `/contact` - Contact page  
- `/shop` - Shop page
- `/home` - Homepage (if using page builder)

### Banner Image Display Location

```
┌─────────────────────────────────────────┐
│         Storefront Header               │
│  (Logo, Navigation, Cart, etc.)        │
├─────────────────────────────────────────┤
│                                         │
│      ╔═══════════════════════════╗      │
│      ║                           ║      │
│      ║    BANNER IMAGE           ║      │
│      ║    (Full Width)           ║      │
│      ║    Height: 300-500px       ║      │
│      ║                           ║      │
│      ║    [Optional Title Overlay] ║      │
│      ╚═══════════════════════════╝      │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│    Page Title (if no banner)           │
│                                         │
│    ┌─────────────────────────────┐     │
│    │                             │     │
│    │    Page Content             │     │
│    │    (Page Builder Sections   │     │
│    │     or Rich Text)           │     │
│    │                             │     │
│    └─────────────────────────────┘     │
│                                         │
├─────────────────────────────────────────┤
│         Storefront Footer               │
└─────────────────────────────────────────┘
```

## Visual Layout

### With Banner Image:
1. **Header** - Store navigation
2. **Banner Image** - Full-width image at the top (300-500px height)
   - Image covers the full width
   - Optional gradient overlay with page title at the bottom
   - Responsive: 300px (mobile), 400px (tablet), 500px (desktop)
3. **Page Content** - Below the banner
   - Page Builder sections (if using page builder)
   - Rich text content (if using rich text editor)
4. **Footer** - Store footer

### Without Banner Image:
1. **Header** - Store navigation
2. **Page Title** - Displayed as a heading at the top
3. **Page Content** - Below the title
4. **Footer** - Store footer

## Technical Details

### File Location
- **Route**: `storeflow/src/app/[slug]/page.tsx`
- **Component**: Dynamic page route that fetches pages by slug

### Banner Image Specifications
- **Aspect Ratio**: 16:9 (recommended)
- **Max Size**: 5MB
- **Storage**: Uploaded to Supabase Storage
- **Display**: Full-width responsive image
- **Height**: 
  - Mobile: 300px
  - Tablet: 400px
  - Desktop: 500px

### Banner Image Features
- ✅ **Full-width display** - Spans entire page width
- ✅ **Responsive** - Adapts to screen size
- ✅ **Title overlay** - Page title appears over banner (bottom-left)
- ✅ **Gradient overlay** - Subtle dark gradient for text readability
- ✅ **Error handling** - Gracefully hides if image fails to load

## Example Pages

### About Us Page (`/about`)
```
Header
┌─────────────────────────────┐
│   [Banner: Team Photo]      │
│   "About Us" (overlay)      │
└─────────────────────────────┘
Content: Mission, Values, etc.
Footer
```

### Contact Page (`/contact`)
```
Header
┌─────────────────────────────┐
│   [Banner: Office Image]    │
│   "Contact Us" (overlay)    │
└─────────────────────────────┘
Content: Contact form, address
Footer
```

### Shop Page (`/shop`)
```
Header
┌─────────────────────────────┐
│   [Banner: Product Display] │
│   "Shop" (overlay)          │
└─────────────────────────────┘
Content: Product grid, filters
Footer
```

## How to Use

1. **Create/Edit Page** in Dashboard → Pages
2. **Upload Banner Image** using the "Banner Image" field
3. **Set Page Status** to "Published"
4. **Save Page**
5. **Visit** `https://yourstore.dukanest.com/[page-slug]`
6. **Banner appears** at the top of the page

## Banner Image vs Hero Section

### When to Use Banner Image
- ✅ **Simple pages** (About, Contact, Terms) - Just need a header image
- ✅ **Rich Text pages** - When using the rich text editor (not page builder)
- ✅ **Quick setup** - Fast way to add a header image without building sections

### When to Use Hero Section (Page Builder)
- ✅ **Homepage** - Full-featured hero with title, subtitle, CTA buttons
- ✅ **Landing pages** - Need interactive elements (buttons, descriptions)
- ✅ **Complex layouts** - Want more control over design and content

### Smart Display Logic
The system automatically **hides the banner image** if:
- You're using the **Page Builder**
- The **first section** is a **Hero Section**

This prevents redundancy - you won't see both a banner image AND a hero section at the top.

**Example:**
- Page with Hero Section first → Banner hidden, Hero Section shown
- Page with Features Section first → Banner shown (if set)
- Rich Text page → Banner shown (if set)

## Notes

- Banner image is **optional** - Pages work fine without it
- Banner only appears on **published** pages
- Banner is displayed **above** all page content (unless hero section is first)
- If banner image fails to load, it's hidden gracefully
- Banner image is **automatically hidden** if first section is a hero section (to avoid redundancy)
- Banner image is stored correctly in the database (`banner_image` field)
