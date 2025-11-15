# StoreFlow Branding & Customization Guide

This guide will help you customize the logo and theme colors for **StoreFlow.com** in Nazmart.

## 🎨 Part 1: Changing the Logo

### Step 1: Prepare Your Logo Files

Before uploading, prepare these logo files:

1. **Main Logo** (`site_logo`)
   - Format: PNG, JPG, or SVG
   - Recommended size: 160x50 pixels (or proportional)
   - Background: Transparent or white
   - Use: Primary logo for light backgrounds

2. **White Logo** (`site_white_logo`)
   - Format: PNG, JPG, or SVG
   - Recommended size: 160x50 pixels (or proportional)
   - Background: Transparent
   - Color: White/light version for dark backgrounds
   - Use: For dark header backgrounds

3. **Favicon** (`site_favicon`)
   - Format: ICO, PNG, or SVG
   - Recommended size: 32x32 or 64x64 pixels
   - Use: Browser tab icon

### Step 2: Upload Your Logos

1. **Log in to Landlord Admin Panel:**
   - URL: `http://localhost/nazmart/landlord/admin/login`
   - Use your admin credentials

2. **Navigate to Site Identity:**
   - Go to: **General Settings** → **Site Identity**
   - Or direct URL: `http://localhost/nazmart/landlord/admin/general/site-identity`

3. **Upload Your Logos:**
   - **Site Logo:** Click "Upload Image" and select your main StoreFlow logo
   - **Site White Logo:** Click "Upload Image" and select your white/light StoreFlow logo
   - **Site Favicon:** Click "Upload Image" and select your StoreFlow favicon

4. **Save Changes:**
   - Click **"Save Changes"** button
   - Your logos will be updated immediately

### Step 3: Verify Logo Display

1. Visit your frontend: `http://localhost/nazmart`
2. Check the header to see your StoreFlow logo
3. If needed, adjust logo size or re-upload

---

## 🎨 Part 2: Changing Theme Colors

### Step 1: Access Color Settings

1. **Log in to Landlord Admin Panel:**
   - URL: `http://localhost/nazmart/landlord/admin/login`

2. **Navigate to Color Settings:**
   - Go to: **General Settings** → **Color Settings**
   - Or direct URL: `http://localhost/nazmart/landlord/admin/general/color-settings`

### Step 2: Understanding Color Options

Nazmart uses multiple color settings for different parts of the site:

#### **Main Colors** (Primary Brand Colors)
- **Site Main Color One** (`main_color_one`): Default `#F04751` (Red)
  - Used for: Primary buttons, links, highlights
- **Site Main Color Two** (`main_color_two`): Default `#FF805D` (Orange)
  - Used for: Secondary buttons, accents
- **Site Main Color Three** (`main_color_three`): Default `#599A8D` (Teal)
  - Used for: Additional accents
- **Site Main Color Four** (`main_color_four`): Default `#1E88E5` (Blue)
  - Used for: Links, info elements

#### **Secondary Colors** (Supporting Colors)
- **Site Secondary Color One** (`secondary_color`): Default `#F7A3A8` (Light Pink)
  - Used for: Backgrounds, subtle highlights
- **Site Secondary Color Two** (`secondary_color_two`): Default `#ffdcd2` (Peach)
  - Used for: Light backgrounds

#### **Section Background Colors**
- **Section Background Color One** (`section_bg_1`): Default `#FFFBFB` (Very Light Pink)
- **Section Background Color Two** (`section_bg_2`): Default `#FFF6EE` (Very Light Peach)
- **Section Background Color Three** (`section_bg_3`): Default `#F4F8FB` (Very Light Blue)
- **Section Background Color Four** (`section_bg_4`): Default `#F2F3FB` (Very Light Purple)
- **Section Background Color Five** (`section_bg_5`): Default `#F9F5F2` (Very Light Beige)
- **Section Background Color Six** (`section_bg_6`): Default `#E5EFF8` (Light Blue)

#### **Text Colors**
- **Site Heading Color** (`heading_color`): Default `#333333` (Dark Gray)
  - Used for: Headings, titles
- **Site Body Color** (`body_color`): Default `#666666` (Medium Gray)
  - Used for: Body text, paragraphs
- **Site Light Color** (`light_color`): Default `#666666` (Medium Gray)
  - Used for: Secondary text
- **Site Extra Light Color** (`extra_light_color`): Default `#888888` (Light Gray)
  - Used for: Muted text

#### **Special Colors**
- **Site Review Color** (`review_color`): Default `#FABE50` (Gold/Yellow)
  - Used for: Star ratings, reviews
- **Site New Color** (`new_color`): Default `#5AB27E` (Green)
  - Used for: "New" badges, success indicators

### Step 3: Choose Your StoreFlow Color Palette

**Recommended StoreFlow Color Scheme:**

Based on a professional eCommerce platform, here are suggested colors:

#### Option 1: Modern Blue & Teal (Recommended)
```
Main Color One: #0066CC (StoreFlow Blue)
Main Color Two: #00A8E8 (Bright Blue)
Main Color Three: #00C9A7 (Teal)
Main Color Four: #4A90E2 (Light Blue)
Secondary Color: #E6F3FF (Light Blue Background)
Secondary Color Two: #F0F9FF (Very Light Blue)
```

#### Option 2: Professional Purple & Blue
```
Main Color One: #6366F1 (Indigo)
Main Color Two: #8B5CF6 (Purple)
Main Color Three: #3B82F6 (Blue)
Main Color Four: #06B6D4 (Cyan)
Secondary Color: #EEF2FF (Light Indigo Background)
Secondary Color Two: #F5F3FF (Light Purple Background)
```

#### Option 3: Energetic Orange & Blue
```
Main Color One: #FF6B35 (Vibrant Orange)
Main Color Two: #F7931E (Orange)
Main Color Three: #004E89 (Deep Blue)
Main Color Four: #1A659E (Blue)
Secondary Color: #FFF4F0 (Light Orange Background)
Secondary Color Two: #F0F7FF (Light Blue Background)
```

**You can use any color scheme that matches your StoreFlow brand!**

### Step 4: Update Colors in Admin Panel

1. **In Color Settings page**, you'll see color pickers for each option
2. **Click on each color picker** to open the color selector
3. **Enter your hex color code** (e.g., `#0066CC`) or use the color picker
4. **Update all colors** according to your StoreFlow brand
5. **Click "Save Changes"** at the bottom

### Step 5: Preview Your Changes

1. **Visit your frontend:** `http://localhost/nazmart`
2. **Check different pages** to see how colors are applied
3. **Adjust colors** if needed and save again

---

## 🎨 Part 3: Changing Site Title & Tagline

### Step 1: Access Basic Settings

1. **Navigate to Basic Settings:**
   - Go to: **General Settings** → **Basic Settings**
   - Or direct URL: `http://localhost/nazmart/landlord/admin/general/basic-settings`

### Step 2: Update Site Information

1. **Site Title:** Change from "NazMart" to "StoreFlow"
2. **Site Tagline:** Add your StoreFlow tagline (e.g., "Your Multi-Tenant eCommerce Platform")
3. **Save Changes**

---

## 📋 Quick Reference: Admin Panel Paths

### Logo Settings
- **Path:** General Settings → Site Identity
- **URL:** `/landlord/admin/general/site-identity`

### Color Settings
- **Path:** General Settings → Color Settings
- **URL:** `/landlord/admin/general/color-settings`

### Basic Settings (Title, Tagline)
- **Path:** General Settings → Basic Settings
- **URL:** `/landlord/admin/general/basic-settings`

---

## 🎨 Recommended StoreFlow Brand Colors

Here's a complete color palette suggestion for StoreFlow:

```css
/* Primary Brand Colors */
Main Color One: #0066CC        /* Primary StoreFlow Blue */
Main Color Two: #00A8E8        /* Bright Accent Blue */
Main Color Three: #00C9A7     /* Teal Accent */
Main Color Four: #4A90E2      /* Light Blue */

/* Secondary Colors */
Secondary Color: #E6F3FF      /* Light Blue Background */
Secondary Color Two: #F0F9FF   /* Very Light Blue Background */

/* Section Backgrounds */
Section BG 1: #FFFFFF          /* White */
Section BG 2: #F8FAFC         /* Very Light Gray */
Section BG 3: #F1F5F9          /* Light Gray */
Section BG 4: #E2E8F0          /* Medium Light Gray */
Section BG 5: #F9FAFB          /* Off White */
Section BG 6: #F0F4F8          /* Light Blue Gray */

/* Text Colors */
Heading Color: #1E293B        /* Dark Slate */
Body Color: #475569            /* Medium Slate */
Light Color: #64748B           /* Light Slate */
Extra Light Color: #94A3B8     /* Very Light Slate */

/* Special Colors */
Review Color: #F59E0B         /* Amber (for ratings) */
New Color: #10B981            /* Green (for badges) */
```

---

## 💡 Tips for Branding

1. **Consistency is Key:**
   - Use the same color palette across all pages
   - Ensure logo appears correctly on both light and dark backgrounds

2. **Test on Different Pages:**
   - Homepage
   - Product pages
   - Checkout pages
   - Admin panel

3. **Logo Best Practices:**
   - Keep logo file size small for fast loading
   - Use SVG format if possible for scalability
   - Ensure logo is readable at different sizes

4. **Color Accessibility:**
   - Ensure sufficient contrast between text and backgrounds
   - Test colors with color contrast checkers
   - Consider users with color blindness

5. **Save Your Color Codes:**
   - Keep a record of all your StoreFlow brand colors
   - This helps maintain consistency across updates

---

## 🔄 After Making Changes

1. **Clear Cache:**
   ```bash
   cd core
   php artisan cache:clear
   php artisan config:clear
   php artisan view:clear
   ```

2. **Hard Refresh Browser:**
   - Press `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
   - This ensures you see the latest changes

3. **Check All Pages:**
   - Homepage
   - Product listings
   - Product detail pages
   - Cart/Checkout
   - User dashboard

---

## 📸 Preview Your Branding

After updating:
- ✅ Logo appears in header
- ✅ Colors match your StoreFlow brand
- ✅ Site title shows "StoreFlow"
- ✅ Favicon appears in browser tab
- ✅ Consistent branding across all pages

---

**Your StoreFlow branding is now customized!** 🎉

For production deployment, these settings will be preserved when you migrate to `storeflow.com`.

