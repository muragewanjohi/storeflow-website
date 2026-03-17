import { prisma } from '@/lib/prisma/client';

export interface SellingMatch {
  selling: string;
  businessType: string;
  tenantCount: number;
}

export interface SellingExistenceResult {
  query: {
    selling: string;
    sellingKey: string;
    businessType?: string;
  };
  exists: boolean;
  exactMatchCount: number;
  matches: SellingMatch[];
}

function singularizeWord(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(xes|zes|ches|shes|ses)$/.test(word) && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

const SELLING_QUALIFIER_TOKENS = new Set([
  'kid',
  'kids',
  'child',
  'children',
  'boy',
  'boys',
  'girl',
  'girls',
  'adult',
  'adults',
  'men',
  'mens',
  'man',
  'women',
  'womens',
  'woman',
  'male',
  'female',
  'unisex',
  'for',
  'the',
  'and',
]);

function normalizeSellingTokens(value: string): string[] {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((item) => item.trim())
    .filter(Boolean);
}

function reduceSellingTokens(tokens: string[]): string[] {
  const normalized = tokens.map((item) => singularizeWord(item));
  const withoutQualifiers = normalized.filter((item) => !SELLING_QUALIFIER_TOKENS.has(item));
  return withoutQualifiers.length > 0 ? withoutQualifiers : normalized;
}

export function normalizeSellingKey(value: string): string {
  const reducedTokens = reduceSellingTokens(normalizeSellingTokens(value));
  return reducedTokens.sort().join(' ');
}

export function buildSellingMatchKeys(value: string): string[] {
  const originalTokens = normalizeSellingTokens(value);
  if (originalTokens.length === 0) return [];

  const tokens = reduceSellingTokens(originalTokens);
  const singularTokens = tokens.map((item) => singularizeWord(item));

  const originalSingularTokens = originalTokens.map((item) => singularizeWord(item));

  const keySet = new Set<string>([
    tokens.join(' '),
    [...tokens].sort().join(' '),
    singularTokens.join(' '),
    [...singularTokens].sort().join(' '),
    originalTokens.join(' '),
    [...originalTokens].sort().join(' '),
    originalSingularTokens.join(' '),
    [...originalSingularTokens].sort().join(' '),
  ]);

  return Array.from(keySet).filter(Boolean);
}

export function isSellingEquivalent(a: string, b: string): boolean {
  const keysA = new Set(buildSellingMatchKeys(a));
  const keysB = new Set(buildSellingMatchKeys(b));
  if (keysA.size === 0 || keysB.size === 0) return false;

  for (const key of keysA) {
    if (keysB.has(key)) return true;
  }

  const tokensA = new Set(reduceSellingTokens(normalizeSellingTokens(a)));
  const tokensB = new Set(reduceSellingTokens(normalizeSellingTokens(b)));
  if (tokensA.size === 0 || tokensB.size === 0) return false;

  // If one reduced token set is a subset of the other, treat it as equivalent.
  const [smaller, larger] =
    tokensA.size <= tokensB.size ? [tokensA, tokensB] : [tokensB, tokensA];
  const subsetMatch = Array.from(smaller).every((token) => larger.has(token));
  if (subsetMatch) return true;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }

  const denominator = Math.max(tokensA.size, tokensB.size);
  return denominator > 0 && intersection / denominator >= 0.8;
}

export async function checkSellingExists(params: {
  selling: string;
  businessType?: string;
  limit?: number;
}): Promise<SellingExistenceResult> {
  const sellingKey = normalizeSellingKey(params.selling);
  const queryText = params.selling;
  const normalizedBusinessType = params.businessType?.trim() || undefined;
  const limit = params.limit ?? 5;

  if (!sellingKey) {
    return {
      query: {
        selling: params.selling,
        sellingKey,
        businessType: normalizedBusinessType,
      },
      exists: false,
      exactMatchCount: 0,
      matches: [],
    };
  }

  const businessTypeFilter = normalizedBusinessType
    ? `%${normalizedBusinessType.toLowerCase()}%`
    : null;

  const rows = await prisma.$queryRaw<Array<{
    selling: string;
    business_type: string;
  }>>`
    SELECT
      COALESCE(NULLIF(data->>'selling', ''), 'Unknown') AS selling,
      COALESCE(NULLIF(data->>'business_type', ''), 'Unknown') AS business_type
    FROM tenants
    WHERE
      COALESCE((data->>'isDemo')::boolean, false) != true
      AND COALESCE((data->>'is_demo')::boolean, false) != true
      AND LENGTH(TRIM(COALESCE(data->>'selling', ''))) > 0
      AND (
        ${businessTypeFilter}::text IS NULL
        OR LOWER(COALESCE(data->>'business_type', '')) LIKE ${businessTypeFilter}
      )
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 500
  `;

  const countsByPair = new Map<string, SellingMatch>();
  for (const row of rows) {
    if (!isSellingEquivalent(row.selling, queryText)) continue;
    const mapKey = `${row.selling}::${row.business_type}`;
    const existing = countsByPair.get(mapKey);
    if (existing) {
      existing.tenantCount += 1;
    } else {
      countsByPair.set(mapKey, {
        selling: row.selling,
        businessType: row.business_type,
        tenantCount: 1,
      });
    }
  }

  const matches = Array.from(countsByPair.values())
    .sort((a, b) => b.tenantCount - a.tenantCount)
    .slice(0, limit);

  const exactMatchCount = matches.reduce((acc, item) => acc + item.tenantCount, 0);

  return {
    query: {
      selling: params.selling,
      sellingKey,
      businessType: normalizedBusinessType,
    },
    exists: exactMatchCount > 0,
    exactMatchCount,
    matches,
  };
}
