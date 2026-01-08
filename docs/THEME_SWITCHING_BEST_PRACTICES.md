# Theme Switching Best Practices

## Overview

This document outlines the best practices for theme switching/activation in StoreFlow, based on industry standards from platforms like Shopify, WooCommerce, and BigCommerce.

## Industry Standards

### **Shopify** 🏆
- **Button States**: 
  - "Active" (disabled) - when theme is currently active
  - "Publish" - when theme is installed but not active (switches immediately)
  - "Try theme" - preview mode
- **Behavior**: Installing a theme immediately activates it and deactivates the previous one
- **Preview**: Preview page has "Publish" button to activate the theme

### **WooCommerce**
- **Button States**:
  - "Active" (disabled) - when theme is currently active
  - "Activate" - when theme is installed but not active
  - "Install" - when theme is not installed
- **Behavior**: Installing a theme activates it immediately
- **Preview**: Preview page has "Activate" button

### **BigCommerce**
- **Button States**:
  - "Active" (disabled) - when theme is currently active
  - "Apply" - when theme is installed but not active
  - "Install" - when theme is not installed
- **Behavior**: Installing applies the theme immediately
- **Preview**: Preview page has "Apply Theme" button

## StoreFlow Implementation ✅

### Theme List Page (`/dashboard/themes`)

**Button States**:
1. **"Active"** (disabled) - Theme is currently active
   - Shows checkmark icon
   - Button is disabled
   - Visual indicator: Blue border and "Active" badge

2. **"Switch"** (enabled) - Theme is installed but not active
   - Shows download icon
   - Clicking switches to this theme immediately
   - No dialog (since it's already installed)
   - Success message: "Theme switched successfully!"

3. **"Install"** (enabled) - Theme is not installed
   - Shows download icon
   - Clicking opens dialog with demo content option
   - Success message: "Theme installed! Homepage created."

**User Experience**:
- Clear visual distinction between states
- One-click switching for installed themes
- Installation dialog only for new themes
- Immediate feedback with toast notifications

### Theme Preview Page (`/dashboard/themes/preview/[themeId]`)

**Button States**:
1. **"Active Theme"** (disabled) - Theme is currently active
   - Shows checkmark icon
   - Button is disabled
   - Informational only

2. **"Switch to This Theme"** (enabled) - Theme is installed but not active
   - Shows download icon
   - Clicking switches immediately (no dialog)
   - Success message and auto-navigation back to themes list

3. **"Install Theme"** (enabled) - Theme is not installed
   - Shows download icon
   - Clicking opens dialog with demo content option
   - Success message and auto-navigation back to themes list

**User Experience**:
- Prominent install/switch button at top of preview
- Clear indication of current state
- Seamless installation from preview
- Auto-navigation after installation for better UX

## Technical Implementation

### API Endpoint: `/api/themes/installed`
- Returns all themes installed for the tenant (both active and inactive)
- Format: `{ installedThemes: { [themeId]: isActive } }`
- Used to determine button states in UI

### Installation Flow

1. **New Installation**:
   - User clicks "Install" → Dialog appears
   - User selects demo content option
   - Theme installed with homepage, pages, and optional demo content
   - Theme becomes active

2. **Switching** (Theme Already Installed):
   - User clicks "Switch" → Immediate action
   - Previous theme deactivated
   - Selected theme activated
   - No homepage/pages recreated (preserves existing content)

3. **Re-activation** (Theme is Active):
   - Button shows "Active" and is disabled
   - No action possible (already active)

## Benefits

✅ **Clear User Intent**: Button text clearly indicates what will happen
✅ **Efficient Switching**: One-click for installed themes
✅ **Flexible Installation**: Demo content option for new installations
✅ **Consistent UX**: Matches industry standards (Shopify, WooCommerce)
✅ **Preview Integration**: Install/switch directly from preview page
✅ **Immediate Feedback**: Toast notifications for all actions

## User Flow Examples

### Example 1: Switching from Grocery to Default Theme

1. User has Grocery theme active
2. User sees Default theme with "Switch" button
3. User clicks "Switch"
4. Default theme activates, Grocery deactivates
5. Toast: "Theme switched successfully!"
6. Storefront immediately shows Default theme

### Example 2: Installing New Theme from Preview

1. User previews Minimal theme
2. User clicks "Install Theme" button at top
3. Dialog appears with demo content option
4. User selects options and confirms
5. Theme installs with homepage and pages
6. Auto-navigates back to themes list
7. Toast: "Theme installed! Homepage created."

### Example 3: Installing New Theme from List

1. User sees Modern theme with "Install" button
2. User clicks "Install"
3. Dialog appears with demo content option
4. User confirms installation
5. Theme installs and becomes active
6. Toast: "Theme installed! Homepage created." with "Edit Homepage" action

## Code References

- **Themes List**: `src/app/dashboard/themes/themes-list-client.tsx`
- **Preview Page**: `src/app/dashboard/themes/preview/[themeId]/theme-preview-client.tsx`
- **Installation API**: `src/app/api/themes/install/route.ts`
- **Installed Themes API**: `src/app/api/themes/installed/route.ts`
