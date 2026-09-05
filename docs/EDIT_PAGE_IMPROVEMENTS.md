# Edit Page UX Improvements

> Consolidated recommendations for improving the Page Editor experience.
> Benchmarked against Shopify, Wix, and Squarespace page editors.

---

## Current Issues Summary

| Issue | Impact |
|-------|--------|
| 15 section types shown at once | Choice overload for new users |
| Up/down arrows for reordering | Slow, not intuitive |
| No live preview while editing | Users can't see what they're building |
| Editing is in a separate tab, not contextual | Cognitive disconnect |
| No way to hide sections without deleting | Users afraid to experiment |
| Long vertical scroll, dense layout | Hard to navigate |
| Version banner in editing flow | Irrelevant noise |
| No section summaries | Hard to tell what's in each section |
| No unsaved changes warning | Risk of data loss |

---

## Recommended Changes

### Priority 1: High Impact — Layout & Editing Model

#### 1.1 Split-Panel Layout (Section List + Settings Panel)

**Current:** Editing is done via a separate "Edit Section" tab. Users scroll a long page.

**Recommended:**
- **Left panel:** Section list (reorderable)
- **Right panel:** Settings for the selected section (inputs, image picker, product picker, etc.)
- Keep "Basic Information" (title, slug) at the top
- After that, the editing flow is: **select section → edit settings in panel**

This is the Shopify model and dramatically reduces scrolling and cognitive load.

```
┌──────────────────────────────────────────────────────┐
│  Basic Information (Title, Slug)                     │
├────────────────────────┬─────────────────────────────┤
│  Sections              │  Section Settings           │
│                        │                             │
│  ⋮⋮ Hero #1       👁 │  Title: [Beauty That...]    │
│  ⋮⋮ Categories #2 👁 │  Subtitle: [Premium...]     │
│  ⋮⋮ Banners #3    👁 │  Button text: [Shop Now]    │
│  ⋮⋮ Products #4   👁 │  Image: [Upload/Select]     │
│  ⋮⋮ Features #5   👁 │                             │
│  ⋮⋮ CTA #6        👁 │                             │
│                        │                             │
│  [+ Add Section]       │                             │
├────────────────────────┴─────────────────────────────┤
│  Preview    |    Save draft    |    Publish           │
└──────────────────────────────────────────────────────┘
```

#### 1.2 Drag-and-Drop Section Reordering

**Current:** Up/down arrows per section row.

**Recommended:**
- Add a drag handle (`⋮⋮`) on the left of each section row
- Allow drag-and-drop reordering
- Keep up/down arrows as a fallback for accessibility

This single feature is the biggest perceived usability improvement for page builders.

#### 1.3 Live Preview

**Current:** Separate "Preview" button, no split view.

**Recommended:**
- **Sticky top bar** with: `Preview` | `Save draft` | `Publish`
- Preview opens a **split view** (editor left, preview right) or a new tab
- Preview updates as settings change (or on blur/save)
- Show "Last saved: 2 min ago" or "Unpublished changes" status

---

### Priority 2: High Impact — Section Management

#### 2.1 Clickable Section Rows (Primary Edit Action)

**Current:** Global "Sections / Edit Section" toggle at the top. Not obvious how to edit a specific section.

**Recommended:**
- Each section row is **clickable** — opens its settings in the right panel
- Selected row is **highlighted** (border or background)
- Optionally add a visible **Edit** button on each row
- Remove the global "Sections / Edit Section" toggle

#### 2.2 Hide/Show Toggle Per Section

**Current:** No way to hide a section without deleting it.

**Recommended:**
- Add an **eye icon** (👁) per section row to toggle visibility
- Hidden sections appear **dimmed** with a "Hidden" label
- Hidden sections are saved but not rendered on the storefront

This encourages experimentation and reduces fear of breaking a page.

#### 2.3 Section List Summaries

**Current:** Section rows show only type and number (e.g. "Hero #1").

**Recommended:**
- Show a short summary under each section:
  - Hero: `"Beauty That Radiates…" · 1 button`
  - Products: `8 products · Featured`
  - Banners: `3 banners`
  - Categories: `6 categories`
  - CTA: `"Shop Now" · Pink background`
- This gives context without opening the section

#### 2.4 Duplicate Section Action

**Current:** Only delete and reorder.

**Recommended:**
- Add a **Duplicate** action (copy icon) per section row
- Common in Shopify workflows — lets users quickly create variations

---

### Priority 3: Medium Impact — Onboarding & Simplification

#### 3.1 Group Section Types in "Add Section"

**Current:** Flat grid of 15 section icons.

**Recommended:**
- Group into categories:
  - **Hero & Headers:** Hero, Banners
  - **Products:** Products, Product Tabs, Categories, Sales Tab
  - **Content:** Text, Image, Split Layout, Features
  - **Social Proof:** Testimonials, Blogs
  - **Conversion:** CTA, Form
  - **Other:** Location
- Add a **search bar** ("Search sections…")
- Show groups collapsed by default with expand/collapse
- Show **recommended sections** first for new users

#### 3.2 Quick Add Between Sections

**Current:** "Add Section" at the top only.

**Recommended:**
- Show a `+` button **between section rows** on hover
- Clicking opens the section picker, inserting at that position
- This is how Shopify, Wix, and Notion handle insertion

#### 3.3 Pre-Filled Homepage for New Stores

**Current:** New tenants may start with an empty page or default sections.

**Recommended:**
- New stores get a **default homepage** with: Hero, Features, Products, CTA
- Users then **customize** instead of building from scratch
- Offer 2–3 page templates: "Homepage", "About", "Contact", "Landing Page"
- Each template pre-adds relevant sections

#### 3.4 First-Time Contextual Guidance

**Current:** No onboarding for the page editor.

**Recommended:**
- First-time overlay or tooltip:
  > "Your page is built from sections. Click a section to edit it, drag to reorder, or click + to add new ones."
- Optional checklist: `Add Hero ✓ → Add Products → Add CTA`
- Replace version banner with contextual tips:
  > "Tip: Add a Hero section with a clear call-to-action to increase conversions."

---

### Priority 4: Small UX Fixes

#### 4.1 Simplify "Header Image Type" Wording

**Current:** "Header Image Type: Use Banner Image / Use Hero Section (in Page Builder)"

**Recommended:**
- Rename to: **Header style**
- Options: `Banner image` | `Hero section`
- One-line explanation: "Hero section replaces the banner image with a customizable header from the Page Builder."

#### 4.2 Clarify Rich Text vs Page Builder

**Current:** Tabs labeled "Rich Text Editor" and "Page Builder".

**Recommended:**
- Rename to: **Simple Editor** | **Page Builder**
- Add short descriptions:
  - Simple Editor: "Best for text-heavy pages (About, Contact, Policies)."
  - Page Builder: "Best for homepages and landing pages with sections."
- Default to **Page Builder** for homepage, **Simple Editor** for other pages

#### 4.3 Slug Field Improvements

**Current:** Manual slug field with help text.

**Recommended:**
- Auto-generate slug from title (already implemented)
- Add a **"Regenerate"** button
- Show full URL preview: `beauty.dukanest.com/page/about-us`

#### 4.4 Unsaved Changes Warning

**Current:** No warning when navigating away.

**Recommended:**
- Show browser confirmation dialog when leaving with unsaved changes
- Show inline status: "Unsaved changes" next to Save button

#### 4.5 Move Version Banner Out of Editing Flow

**Current:** "You're running DukaNest version v0.1.2" banner at top of edit page.

**Recommended:**
- Move version info to **Settings > About** or a small footer link
- Replace with a dismissible **contextual tip** relevant to the page being edited
- Or remove entirely from the editing flow

#### 4.6 Collapse SEO Settings by Default

**Current:** SEO Settings and SEO Preview are expanded sections at the bottom.

**Recommended:**
- Collapse by default (already partially done)
- Show a green checkmark or warning icon to indicate SEO status at a glance
- Move to a separate tab or accordion to reduce page length

---

## Implementation Priority Matrix

| # | Change | Effort | Impact | Priority |
|---|--------|--------|--------|----------|
| 1.1 | Split-panel layout | High | Very High | P1 |
| 1.2 | Drag-and-drop reordering | Medium | Very High | P1 |
| 1.3 | Live preview | High | Very High | P1 |
| 2.1 | Clickable section rows | Medium | High | P1 |
| 2.2 | Hide/show toggle | Low | High | P2 |
| 2.3 | Section summaries | Low | Medium | P2 |
| 2.4 | Duplicate section | Low | Medium | P2 |
| 3.1 | Group section types | Medium | High | P2 |
| 3.2 | Quick add between sections | Medium | Medium | P3 |
| 3.3 | Pre-filled homepage | Medium | High | P2 |
| 3.4 | First-time guidance | Low | Medium | P3 |
| 4.1 | Simplify header type wording | Low | Medium | P3 |
| 4.2 | Clarify editor modes | Low | Medium | P3 |
| 4.3 | Slug improvements | Low | Low | P4 |
| 4.4 | Unsaved changes warning | Low | High | P2 |
| 4.5 | Move version banner | Low | Low | P4 |
| 4.6 | Collapse SEO | Low | Low | P4 |

---

## Suggested Implementation Order

### Phase 1 — Core Layout (Biggest impact)
1. Split-panel layout (section list + settings panel)
2. Clickable section rows with highlight
3. Drag-and-drop reordering
4. Sticky action bar (Preview | Save draft | Publish)

### Phase 2 — Section Management
5. Hide/show toggle per section
6. Section summaries
7. Duplicate section action
8. Unsaved changes warning
9. Group section types + search

### Phase 3 — Onboarding & Polish
10. Pre-filled homepage templates
11. Quick add between sections
12. First-time contextual guidance
13. Simplify wording (header type, editor modes)

### Phase 4 — Small Fixes
14. Slug field improvements
15. Move version banner
16. Collapse SEO by default

---

## References

- [Shopify Theme Editor](https://shopify.dev/docs/themes/tools/online-editor) — split panel, drag-and-drop, hide/show
- [Wix Editor](https://www.wix.com/) — inline editing, section insertion
- [Squarespace](https://www.squarespace.com/) — live preview, template-first approach
