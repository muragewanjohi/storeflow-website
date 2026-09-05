/**
 * Curated category taxonomy — one flat list of real category names per
 * business type (register/page.tsx's own `businessTypes` list, matched by
 * exact string). User-requested directly: "is it possible to have a list
 * of what someone is selling based on business type, since anyone can
 * input anything yet they are of the same niche" (with a Jiji.co.ke
 * category-browser screenshot as the reference point).
 *
 * Two real, live uses (both explicit selection — nothing here is ever
 * auto-created without the merchant choosing it):
 *  1. Registration: register/page.tsx shows a second, filterable "Category"
 *     dropdown scoped to whichever business type the merchant picked
 *     (@/components/shared/filterable-select.tsx) — "what are you selling"
 *     — and that ONE chosen category is created for real for the new
 *     tenant. This replaced an earlier auto-create-every-category-in-the-
 *     list design: the user pointed out that e.g. "Aquarium & Fish
 *     Supplies" and "Pet Carriers & Housing" are very different niches
 *     within "Pets & Animals", so a tenant who only does one of them
 *     shouldn't have all of them created as siblings — they should pick
 *     the one that's actually theirs.
 *     (Historical note: an earlier version of this registration step ran
 *     through applyStarterPackToTenant(), which turned out to be dead code
 *     for real registrations — includeDemoContent is hardcoded false and
 *     no real registration path ever supplies a starterPackJobId, so that
 *     function never actually ran. The current registration-time category
 *     creation is a small, direct, unconditional prisma.categories.create
 *     call instead — see src/app/api/tenants/register/route.ts.)
 *  2. AI Assistant chat: grounds handleCategoryConfigTarget's suggestions
 *     (@/lib/assistant/shared.ts) against this REAL list instead of
 *     letting Claude invent fresh names every conversation — before this,
 *     two tenants with the identical business type could get two
 *     completely different sets of AI-suggested category names.
 *
 * Deliberately includes explicit SERVICE business types (Repair &
 * Technical Services, Home & Trade Services, Cleaning Services, Beauty,
 * Salon & Spa Services, Events/Photography/Entertainment Services,
 * Transport, Moving & Logistics Services, Professional & Business
 * Services, Health, Fitness & Wellness Services, Education & Training
 * Services, Construction & Contracting Services) alongside the original
 * product-oriented types — mirroring how Jiji.co.ke's own "Services" is a
 * full top-level category with ~25 real subcategories, not a single line
 * item buried inside a product type. Existing product-oriented types (e.g.
 * Beauty & Personal Care) keep their own service-flavored category entries
 * too (Salon Services, Barbershop Services, etc.) for businesses that mix
 * retail and services — a category can legitimately contain a mix of
 * requires_shipping: true/false products, since Services Phase 1 made that
 * decision per-product, not per-category or per-tenant (docs/SERVICES_PLAN.md).
 *
 * "Other" has no entry here on purpose — a merchant who picked "Other" at
 * registration has no fixed business type to curate against; the category
 * dropdown simply doesn't appear for that case, and AI suggestion
 * generation falls back to free generation (grounded in niche/business
 * context prose only), same as before this file existed.
 */

export const BUSINESS_TYPE_CATEGORIES: Record<string, string[]> = {
  'Fashion & Clothing': [
    "Women's Wear",
    "Men's Wear",
    "Kids' Wear",
    'Shoes',
    'Bags & Handbags',
    'Jewelry & Watches',
    'Belts & Wallets',
    'Sunglasses',
    'Traditional Wear',
    'Activewear',
    'Tailoring Services',
  ],
  'Beauty & Personal Care': [
    'Skincare',
    'Haircare',
    'Makeup & Cosmetics',
    'Fragrances & Perfumes',
    'Hair Extensions & Wigs',
    'Nail Care',
    'Bath & Body',
    "Men's Grooming",
    'Salon Services',
    'Barbershop Services',
    'Spa & Massage Services',
  ],
  'Electronics & Gadgets': [
    'Smartphones',
    'Laptops & Computers',
    'Phone Accessories',
    'Audio & Headphones',
    'Smart Watches & Wearables',
    'TVs & Home Entertainment',
    'Cameras & Photography',
    'Gaming',
    'Chargers & Power Banks',
    'Repair & Installation Services',
  ],
  'Home & Kitchen': [
    'Kitchen Appliances',
    'Cookware & Bakeware',
    'Home Decor',
    'Bedding & Bath',
    'Furniture',
    'Storage & Organization',
    'Cleaning Supplies',
    'Lighting',
    'Dining & Serving',
  ],
  'Groceries & Food': [
    'Fresh Produce',
    'Packaged Foods',
    'Beverages',
    'Dairy & Eggs',
    'Grains & Cereals',
    'Snacks & Confectionery',
    'Cooking Oils & Fats',
    'Spices & Seasonings',
    'Household Essentials',
  ],
  'Bakery & Cakes': [
    'Celebration Cakes',
    'Cupcakes',
    'Bread & Pastries',
    'Cookies & Biscuits',
    'Custom Cake Orders',
    'Wedding Cakes',
    'Baking Ingredients & Supplies',
  ],
  'Restaurant & Takeaway': [
    'Main Dishes',
    'Fast Food',
    'Drinks & Beverages',
    'Combo Meals',
    'Snacks',
    'Desserts',
    'Catering Services',
  ],
  'Agriculture & Farm Supplies': [
    'Seeds & Seedlings',
    'Fertilizers',
    'Agrochemicals & Pesticides',
    'Farm Tools & Equipment',
    'Animal Feeds',
    'Irrigation Supplies',
    'Veterinary Supplies',
  ],
  'Flowers & Gifts': [
    'Bouquets & Arrangements',
    'Gift Hampers',
    'Wedding Flowers',
    'Event Decor',
    'Gift Cards & Vouchers',
    'Balloons & Party Supplies',
    'Potted Plants',
    'Event Planning Services',
  ],
  'Health & Pharmacy': [
    'Prescription Medicine',
    'Over-the-Counter Medicine',
    'Vitamins & Supplements',
    'Medical Supplies & Equipment',
    'First Aid',
    'Baby Health',
    'Personal Protective Equipment',
  ],
  'Automotive & Motorbike': [
    'Car Parts & Accessories',
    'Motorcycle Parts & Gear',
    'Tyres & Rims',
    'Car Care & Detailing',
    'Helmets & Riding Gear',
    'Vehicle Electronics',
    'Repair & Mechanic Services',
  ],
  'Hardware & Construction': [
    'Building Materials',
    'Hand Tools',
    'Power Tools',
    'Plumbing Supplies',
    'Electrical Supplies',
    'Paints & Finishes',
    'Fasteners & Fittings',
    'Safety Equipment',
  ],
  'Sports & Outdoor': [
    'Gym & Fitness Equipment',
    'Bicycles & Accessories',
    'Sportswear',
    'Outdoor & Camping Gear',
    'Team Sports Equipment',
    'Swimming Gear',
  ],
  'Toys, Kids & Baby Products': [
    'Toys & Games',
    'Baby Clothing',
    'Baby Gear',
    'Feeding & Nursing',
    'Diapers & Baby Care',
    'Educational Toys',
    'School Supplies',
  ],
  'Pets & Animals': [
    'Pet Food',
    'Pet Accessories',
    'Pet Grooming Supplies',
    'Aquarium & Fish Supplies',
    'Pet Health & Wellness',
    'Pet Carriers & Housing',
    'Veterinary Services',
  ],

  // --- Explicit service business types (Jiji.co.ke's "Services" is a full
  // top-level category with ~25 real subcategories — these mirror that
  // breadth as separate, granular business types instead of one catch-all). ---
  'Repair & Technical Services': [
    'Phone & Tablet Repair',
    'Laptop & Computer Repair',
    'TV & Electronics Repair',
    'Home Appliance Repair',
    'Vehicle Repair & Mechanic Services',
    'Watch & Jewelry Repair',
    'Shoe & Bag Repair',
    'Furniture Repair & Upholstery',
  ],
  'Home & Trade Services': [
    'Plumbing Services',
    'Electrical Installation & Repair',
    'Carpentry & Furniture Making',
    'Painting Services',
    'Masonry Services',
    'Welding & Metal Fabrication',
    'Pest Control & Fumigation',
    'Handyman Services',
  ],
  'Cleaning Services': [
    'House Cleaning',
    'Office Cleaning',
    'Carpet & Sofa Cleaning',
    'Fumigation Services',
    'Laundry & Dry Cleaning',
    'Post-Construction Cleaning',
    'Compound & Garden Cleaning',
  ],
  'Beauty, Salon & Spa Services': [
    'Hair Styling & Braiding',
    'Barbershop Services',
    'Nail Technician Services',
    'Makeup Artist Services',
    'Spa & Massage Therapy',
    'Eyelash & Eyebrow Services',
    'Mobile Beauty Services',
  ],
  'Events, Photography & Entertainment Services': [
    'Photography & Videography',
    'Event Planning & Decor',
    'DJ & MC Services',
    'Catering Services',
    'Wedding Planning',
    'Sound & Stage Hire',
    'Tent, Chair & Furniture Hire',
    'Live Band & Entertainment',
  ],
  'Transport, Moving & Logistics Services': [
    'Movers & Packers',
    'Courier & Delivery Services',
    'Trailer & Truck Hire',
    'Car Hire & Chauffeur Services',
    'Boda Boda & Taxi Services',
    'Freight & Cargo Services',
  ],
  'Professional & Business Services': [
    'Legal Services',
    'Accounting & Tax Services',
    'Business Consulting',
    'Graphic Design & Branding',
    'Web & Software Development',
    'Printing & Signage',
    'Translation Services',
    'Recruitment & HR Services',
  ],
  'Health, Fitness & Wellness Services': [
    'Personal Training',
    'Physiotherapy',
    'Nutrition & Diet Consulting',
    'Home Nursing & Caregiving',
    'Counseling & Therapy',
    'Massage Therapy',
    'Mobile Veterinary Services',
  ],
  'Education & Training Services': [
    'Private Tutoring',
    'Driving Lessons',
    'Music Lessons',
    'Vocational Training',
    'Language Classes',
    'Exam Coaching',
    'Computer & Digital Skills Training',
  ],
  'Construction & Contracting Services': [
    'General Contracting',
    'Architecture & Design Services',
    'Interior Design',
    'Landscaping & Gardening',
    'Solar Installation',
    'Borehole Drilling',
    'Roofing Services',
  ],
};

/** Real curated list for a business type, or empty when unrecognized (e.g. "Other") — never invented here. */
export function getCategoriesForBusinessType(businessType: string | null | undefined): string[] {
  if (!businessType) return [];
  return BUSINESS_TYPE_CATEGORIES[businessType] ?? [];
}

/**
 * True when `category` is a real, curated category for `businessType` —
 * used to defensively validate a client-submitted registration-time
 * category selection server-side before creating it for real (never trust
 * the client to only send back what the dropdown actually offered).
 */
export function isValidCategoryForBusinessType(
  businessType: string | null | undefined,
  category: string | null | undefined,
): boolean {
  if (!businessType || !category) return false;
  const trimmed = category.trim();
  if (!trimmed) return false;
  return getCategoriesForBusinessType(businessType).includes(trimmed);
}

/**
 * The 10 business types added this session that are 100% service
 * businesses by definition — no physical product path exists for any of
 * them (contrast with e.g. "Beauty & Personal Care" or "Automotive &
 * Motorbike", which mix real retail with service-flavored category line
 * items, so nothing there can be assumed shipping-free by business type
 * alone). User-requested connection: "when the store is registered do we
 * track what is a service based on what the user selects as a business
 * type / category?" — this is that connection, feeding a smarter (never
 * silent) `requires_shipping` default at product-creation time, both in
 * the manual product forms and the AI product-intake conversation.
 */
export const SERVICE_ONLY_BUSINESS_TYPES: readonly string[] = [
  'Repair & Technical Services',
  'Home & Trade Services',
  'Cleaning Services',
  'Beauty, Salon & Spa Services',
  'Events, Photography & Entertainment Services',
  'Transport, Moving & Logistics Services',
  'Professional & Business Services',
  'Health, Fitness & Wellness Services',
  'Education & Training Services',
  'Construction & Contracting Services',
];

/** True when `businessType` is one of the explicit service-only business types above. */
export function isServiceOnlyBusinessType(businessType: string | null | undefined): boolean {
  if (!businessType) return false;
  return SERVICE_ONLY_BUSINESS_TYPES.includes(businessType);
}

/**
 * Sensible starting point for a NEW product's `requires_shipping` toggle,
 * derived from the tenant's registered business type — `true` (ships) for
 * everything except the 10 service-only business types. Never used to
 * silently skip asking/showing the choice — the manual product form still
 * renders the toggle (just pre-set), and the AI intake conversation still
 * confirms out loud rather than assuming quietly (see
 * ai-intake-shared.ts's buildProductIntakeSystemPrompt). Editing an
 * existing product never uses this — its own stored value always wins.
 */
export function defaultRequiresShippingForBusinessType(businessType: string | null | undefined): boolean {
  return !isServiceOnlyBusinessType(businessType);
}
