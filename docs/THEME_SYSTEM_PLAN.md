# Theme System Plan — Styling Customization + Theme Variety

**Goal:** Merchants can freely restyle (colors/fonts/branding/CSS) whatever theme they've installed — but they cannot generate or clone entirely new layouts. Layout variety comes from us shipping more real, hand-built themes over time.

Two tracks, run mostly in parallel, one shared contract between them.

- **Track B — Styling customization.** Merchant-facing. Colors, fonts, logo, favicon, optional CSS. Ships fast — most of the plumbing already exists.
- **Track A — Theme variety.** Engineering-only. New full layouts (new Header/Footer/ProductCard/Hero/Homepage components). No AI involved — this is software development, not a runtime feature.

---

## What already exists (audited from the codebase, not assumed)

| Piece | Status | Where |
|---|---|---|
| `tenant_themes` schema (`custom_colors`, `custom_fonts`, `custom_css`, `custom_js`, logo, favicon, meta) | ✅ Exists | `prisma/schema.prisma:815` |
| `themes` catalog table (title, price, `is_premium`, colors, typography, screenshot) | ✅ Exists | `prisma/schema.prisma:1021` |
| 18-key color schema + descriptions | ✅ Exists, already used by the onboarding starter-pack | `src/lib/themes/color-settings.ts` |
| Per-theme default palettes/fonts (grocery, hexfashion, furnito, ...) | ✅ Exists | `src/lib/themes/theme-defaults.ts` |
| 6 layout templates registered (component paths, layout config, demo content) | ⚠️ Registered, **not all built** | `src/lib/themes/theme-registry.ts` — `default`, `modern`, `hexfashion`, `minimal`, `grocery`, `furniture` |
| Logo/favicon upload | ✅ Working | `src/app/api/themes/upload-branding/route.ts` |
| Customize UI (references `custom_css` already) | ⚠️ Partially wired | `src/app/dashboard/themes/customize/theme-customize-client.tsx` |
| Theme preview page | ✅ Exists | `src/app/dashboard/themes/preview/[themeId]/page.tsx` |
| **Gap found while reviewing:** `PUT /api/themes/[id]` (the theme *catalog* editor, not merchant customization) has a literal `// TODO: Add admin authentication check` — anyone can currently edit or delete catalog theme rows | 🔴 Fix regardless of this plan | `src/app/api/themes/[id]/route.ts` |

Conclusion: Track B is ~60% built already. Track A has the registry skeleton for 6 themes but likely only `default` has real components behind it.

---

## Track B — Styling customization (ship first)

### B0. Close the gaps in what exists (small, do first)
- Fix the missing admin-auth check on `PUT /DELETE /api/themes/[id]` before building more on top of it.
- Confirm and document the actual save path for **merchant-facing** customization (`tenant_themes`, not the `themes` catalog table — those are two different endpoints and must not be confused).
- Standardize on **one** color/font schema everywhere: the 18-key set already defined in `color-settings.ts`. The customize UI, the AI styling feature (B2), and the starter-pack should all read/write that exact shape — not three slightly different ones.

### B1. Manual customization UI (mostly UI work, schema already supports it)
- Color pickers bound to the 18 keys, with live preview via the existing `preview/[themeId]` page.
- Font pickers limited to a vetted list matching what `theme-defaults.ts` already uses (Inter, Playfair Display, Merriweather, Lato, ...) — don't allow arbitrary font URLs.
- Wire the already-working logo/favicon upload into the same screen.
- **Guardrail:** raw `custom_css`/`custom_js` are a real XSS/injection surface since they render on the live storefront domain. Gate behind Pro/Premium, sanitize on save, and consider a CSS-only mode (no `custom_js`) as the default for Basic.

### B2. AI-assisted styling (the actual new feature)
Two entry points, both producing the **same** output — a `custom_colors`/`custom_fonts` payload in the standard 18-key shape. Neither ever touches layout, imagery, or copy.

| Entry point | Model call | Cost/request |
|---|---|---:|
| Text prompt ("warm and earthy", "energetic and bold") | Claude Haiku 4.5, text-only | ~$0.002 |
| Reference screenshot ("make it feel like this site") | Playwright screenshot (already a devDependency) → Claude Haiku 4.5 vision, above-the-fold only (1280×800) | ~$0.0025 |

Guardrails to build in from day one, not bolt on later:
- Prompt explicitly instructs "extract palette/typography mood only — never layout, imagery, or copy."
- UI copy says "inspired by," never "clone of."
- The merchant's **layout choice** (which of the Track-A themes they're on) stays a separate, explicit decision — AI styling never changes `theme_id`.

### B costs at scale
Negligible — consistent with every other Claude Haiku estimate in this project (fractions of a cent per request). At 380 merchants each running this a handful of times a month, total spend is single-digit dollars.

---

## Track A — Theme variety (engineering roadmap, not an AI feature)

### A0. Inventory
Confirm which of the 6 registered templates (`default`, `modern`, `hexfashion`, `minimal`, `grocery`, `furniture`) have real components vs. folders that just alias back to `default`. This tells you the true starting point.

### A1. Shared component contract (do this before building more themes)
Every theme must implement the same interface already implied by `ThemeTemplateConfig.componentPaths`: `Header`, `Footer`, `ProductCard`, `ProductGrid`, `Hero`, `Homepage`. Locking this down first means:
- Track B's color/font/CSS layer applies uniformly across every theme (CSS variables driven by the 18-key schema, not per-theme hardcoded styles).
- New themes are drop-in swappable without touching routing or data-fetching code.

### A2. Build order — one theme fully finished at a time
Don't build 5 themes halfway in parallel. Finish one (all 6 components + demo content + default palette + real screenshot) before starting the next, so the catalog is always "N fully working themes," never "5 half-built ones." Suggested order by likely merchant demand in your market:

1. `hexfashion` — fashion is a large SMB category
2. `grocery` — already has a distinct, well-defined default palette
3. `minimal` — general-purpose, likely lowest build effort
4. `modern` — electronics, overlaps somewhat with `default`
5. `furniture` — smallest expected demand, do last

### A3. Marketplace polish per theme
- Replace the Unsplash placeholder `screenshotUrl` with a real rendered screenshot of the finished theme — the same Playwright pipeline from B2 can generate these.
- Add/confirm the `themes` DB row (title, price, `is_premium`).
- Decide Basic-vs-Pro gating per theme, following the precedent already set by `plan-access.ts` for advanced analytics (e.g., 1–2 themes free on Basic, the rest Pro/Premium-only).

### A4. Integration QA (the seam between the two tracks)
Every finished theme must be tested with Track B's customization layer applied on top — a merchant's chosen colors/fonts/logo should render correctly no matter which of the 6 layouts they're on. This is the actual acceptance test for "wide variety of themes + free styling" working together.

---

## Sequencing

1. **B0 first** (small, unblocks everything, fixes a real security gap).
2. **A1 (component contract) before heavy A2 work**, and ideally before B1 ships, so new themes and the styling layer are built against one interface instead of retrofitted later.
3. **B1 can ship in parallel with early A2** — manual customization doesn't need new themes to be useful on `default` alone.
4. **B2 (AI styling) waits until at least 2 Track-A themes exist** — "pick your base layout, then style it" only makes sense once there's a real choice of layout.
5. **A2 continues theme-by-theme** after that, each one immediately gaining B's styling layer for free once A1's contract is in place.

## Cost summary

- **Track A: $0 in AI/API spend.** Pure engineering time.
- **Track B: only B2 has ongoing cost**, and it's negligible — ~$0.002–$0.0045 per AI styling request, consistent with every other Claude Haiku 4.5 estimate already produced for this project. Not a factor in Basic-vs-Pro pricing; the value differentiation there is feature access and theme count, not COGS.
