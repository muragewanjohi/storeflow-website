# UI Context

Visual system for DukaNest. The app has **three distinct UI surfaces** — use the tokens and patterns that match where you are working.

## Surfaces

| Surface | Where | Visual system |
| ------- | ----- | ------------- |
| **Dashboard / Admin** | `/dashboard/*`, `/admin/*` | shadcn/ui + semantic Tailwind tokens; light default |
| **Marketing** | `dukanest.com`, landing pages | Custom DukaNest brand palette (blues + navy) |
| **Storefront** | Tenant subdomains / custom domains | Per-tenant theme components + injected CSS variables |

---

## Dashboard & Admin Theme

Light-first operational UI. **`next-themes`** wraps the app with `defaultTheme="light"`, `enableSystem={false}`, `attribute="class"`. Dark mode tokens exist in `globals.css` (`.dark` class) but the dashboard defaults to light.

Design language: clean admin workspace — white/card surfaces, blue primary actions, muted secondary text, subtle borders.

### Colors (shadcn tokens)

All dashboard/admin components use **HSL CSS variables** — never raw hex in new dashboard code. Tokens are defined in `src/app/globals.css` and mapped in `tailwind.config.ts` as `hsl(var(--token))`.

| Role | Tailwind class | CSS variable | Light mode (HSL) |
| ---- | -------------- | ------------ | ---------------- |
| Page background | `bg-background` | `--background` | `0 0% 100%` (white) |
| Body text | `text-foreground` | `--foreground` | `222.2 84% 4.9%` |
| Card / sidebar surface | `bg-card` | `--card` | `0 0% 100%` |
| Primary action | `bg-primary` | `--primary` | `221.2 83.2% 53.3%` (blue) |
| Primary on-primary text | `text-primary-foreground` | `--primary-foreground` | `210 40% 98%` |
| Secondary surface | `bg-secondary` | `--secondary` | `210 40% 96.1%` |
| Muted text | `text-muted-foreground` | `--muted-foreground` | `215.4 16.3% 46.9%` |
| Hover / subtle fill | `bg-accent` | `--accent` | `210 40% 96.1%` |
| Border | `border-border` | `--border` | `214.3 31.8% 91.4%` |
| Focus ring | `ring-ring` | `--ring` | `221.2 83.2% 53.3%` |
| Destructive | `bg-destructive` | `--destructive` | `0 84.2% 60.2%` |
| Charts (Recharts) | `chart-1` … `chart-5` | `--chart-1` … `--chart-5` | See `globals.css` |

Active nav item pattern: `bg-primary text-primary-foreground shadow-sm`.

### Marketing brand colors (landing pages only)

Marketing components (`src/components/marketing/`) use a fixed DukaNest palette — do not replace these with shadcn tokens on marketing pages:

| Role | Hex | Usage |
| ---- | --- | ----- |
| Brand blue | `#0025cc` | CTAs, badges, links, gradients |
| Brand blue dark | `#001a99` | Gradient end, hover states |
| Headline navy | `#0c0528` | Headings |
| Body gray | `#555` | Paragraph text |
| Light background | `#f6faff` | Section gradients |

---

## Storefront Themes

Tenant storefronts use **theme templates** registered in `src/lib/themes/theme-registry.ts`. Components live under `src/components/themes/` (e.g. `modern`, `grocery`, `hexfashion`, `furniture`, `minimal`, `default`, `multipurpose`).

`ThemeStylesServer` injects per-tenant colors (from DB theme settings) as CSS variables in `<head>` to prevent FOUC. Storefront primary/accent colors override the global tokens per tenant.

When editing storefront UI, match the theme folder you are in — headers, product cards, and heroes are theme-specific.

---

## Typography

- **No custom `next/font` setup** — the app uses the Tailwind/system sans-serif stack.
- Body default: `bg-background text-foreground` (set in `globals.css` `@layer base`).
- Headings in dashboard: `font-semibold` / `font-bold`; sidebar section labels use `text-xs font-semibold uppercase tracking-wider text-muted-foreground`.
- User-guide HTML content uses scoped styles in `.user-guide-html-content` (custom navy/blue, not shadcn tokens).
- Rich text / page builder: TipTap editor in `src/components/content/rich-text-editor.tsx`.

---

## Border Radius

Base token: **`--radius: 0.5rem`** (8px).

| Context | Class | Computed |
| ------- | ----- | -------- |
| Buttons, inputs | `rounded-md` | `calc(var(--radius) - 2px)` |
| Small chips | `rounded-sm` | `calc(var(--radius) - 4px)` |
| Default / large | `rounded-lg` | `var(--radius)` |
| Cards, panels | `rounded-xl` | Tailwind default (0.75rem) |
| Modals / dialogs | `rounded-lg` (shadcn Dialog) | — |
| Mobile grid tiles | `rounded-xl` | Dashboard mobile "More" menu |

Use `cn()` from `@/lib/utils/cn` to merge radius with other conditional classes.

---

## Component Library

**shadcn/ui** on **Tailwind CSS 3** + **`tailwindcss-animate`**. Base primitives in `src/components/ui/`:

`accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `progress`, `radio-group`, `select`, `separator`, `skeleton`, `slider`, `switch`, `table`, `tabs`, `textarea`, `sonner`

Patterns:
- **Radix UI** primitives under the hood (accessible dialogs, dropdowns, etc.)
- **`class-variance-authority`** for component variants (see `button.tsx`)
- Import from `@/components/ui/[component]` or add new primitives via `_template.tsx`
- **Sonner** toasts via `<Toaster />` in root layout — themed with shadcn tokens
- **Recharts** for analytics charts in dashboard/admin

Feature components by area:
- `src/components/dashboard/` — sidebar, header, banners, help panel
- `src/components/admin/` — landlord admin chrome
- `src/components/shared/` — cross-cutting UI
- `src/components/marketing/` — landing page sections
- `src/components/storefront/` — cart, header, rating, demo extras
- `src/components/content/` — page builder, rich text, image upload/crop

---

## Layout Patterns

### Tenant dashboard (`/dashboard/*`)

- **Desktop:** Fixed left sidebar (`lg:pl-64`; collapsed `lg:pl-20`) + top header + scrollable main
- **Sidebar:** `bg-card border-r`; grouped accordion nav (Products, Marketing, Content, Support, Subscription)
- **Mobile:** Bottom tab bar for core routes (Home, Orders, Products, Analytics, More); slide-over sidebar for full nav; immersive shell on key pages
- **Banners:** Access restriction, update notification, complete-profile prompt above content
- **Content width:** Full-width main inside sidebar offset; page-level padding in clients

### Landlord admin (`/admin/*`)

- Same sidebar + header shell as dashboard
- Main content: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6`

### Marketing site

- Full-width sections with `container mx-auto px-4 sm:px-6 lg:px-8`
- Gradient hero backgrounds, two-column hero grids on `lg:`

### Storefront

- Theme-specific `Header` / `Footer` / `Hero` / `ProductCard`
- Tenant branding (logo, colors) from theme settings
- Customer account, cart, checkout as standalone app routes outside `(tenant-storefront)/`

### Overlays

- **Dialogs / alert dialogs:** shadcn `Dialog` / `AlertDialog` — centered, backdrop, `rounded-lg`
- **Mobile menus:** Fixed overlay `bg-black/50` + slide-in panel
- **Toasts:** Sonner, top-right, semantic colors from tokens

---

## Icons

Two libraries in use — **match the surrounding file**:

| Library | Where used | Import |
| ------- | ---------- | ------ |
| **Heroicons** (outline) | Dashboard, admin, storefront ops, sidebars | `@heroicons/react/24/outline` |
| **Lucide React** | shadcn UI internals, marketing, some newer dashboard/marketing components | `lucide-react` |

Sizing conventions:
- Sidebar / nav icons: `h-5 w-5` or `h-6 w-6`
- Inline with text: `h-4 w-4`
- shadcn buttons: `[&_svg]:size-4` built into `button.tsx`
- Use outline/stroke icons only — no filled icon sets

---

## Providers (root layout)

Wrapped in `src/app/layout.tsx`:

- `ThemeProvider` (next-themes)
- `QueryProvider` (TanStack Query)
- `CurrencyProvider` (tenant currency formatting)
- `Toaster` (Sonner)
- `ThemeStylesServer` (tenant storefront CSS injection)

When adding global client UI behavior, follow this provider pattern in `src/components/providers/`.
