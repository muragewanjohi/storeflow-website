/**
 * Curated category taxonomy — one flat list of real category names per
 * business type (register/page.tsx's own `businessTypes` list, matched by
 * exact string). User-requested directly: "is it possible to have a list
 * of what someone is selling based on business type, since anyone can
 * input anything yet they are of the same niche" (with a Jiji.co.ke
 * category-browser screenshot as the reference point).
 *
 * Scoped deliberately narrow for a first version, per user decision: a
 * flat list (no subcategories/tree yet — `categories.parent_id` already
 * supports one, but real usage today barely uses it, so building a
 * two-level tree now would be curating content nobody's asked to browse
 * yet) of ~8-15 real category names per business type, not Jiji's full
 * marketplace-wide breadth (dozens of top-level categories).
 *
 * First real use: grounds handleCategoryConfigTarget's AI suggestions
 * (@/lib/assistant/shared.ts) against this REAL list instead of letting
 * Claude invent fresh names every conversation — the same "never invent
 * when a real source exists" discipline this app already applies
 * everywhere else (expense categories, legal-page drafts, etc.). Before
 * this, two tenants with the identical business type could get two
 * completely different sets of AI-suggested category names, since nothing
 * grounded the suggestion in a shared vocabulary.
 *
 * Deliberately includes real SERVICE-flavored categories where a business
 * type's own description already implies services (e.g. Beauty & Personal
 * Care's "barbershops, salons" — see docs/SERVICES_PLAN.md) — a category
 * can legitimately contain a mix of requires_shipping: true/false products
 * since Phase 1 of that work made the decision per-product, not per-category
 * or per-tenant.
 *
 * "Other" has no entry here on purpose — a merchant who picked "Other" at
 * registration has no fixed business type to curate against; suggestion
 * generation falls back to free generation (grounded in niche/business
 * context prose only) for that case, same as before this file existed.
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
};

/** Real curated list for a business type, or empty when unrecognized (e.g. "Other") — never invented here. */
export function getCategoriesForBusinessType(businessType: string | null | undefined): string[] {
  if (!businessType) return [];
  return BUSINESS_TYPE_CATEGORIES[businessType] ?? [];
}
