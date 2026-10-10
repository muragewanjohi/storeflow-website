import { prisma } from '@/lib/prisma/client';
import {
  listWeeklyPrice,
  quotePlacements,
  type PlacementPriceInput,
  type PlacementQuote,
  type QuoteLine,
} from './pricing';
import type { RateCardInput } from './validation';

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function asNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

const EMPTY_CARD = {
  defaultWeeklyRate: null as number | null,
  smallMultiplier: 1,
  largeMultiplier: 2,
  currency: 'KES',
};

export async function loadRateCard(tenantId: string) {
  const [card, sectionRates, weekIndexes, branches, sections] = await Promise.all([
    prisma.proximity_rate_cards.findUnique({ where: { tenant_id: tenantId } }),
    prisma.proximity_section_rates.findMany({ where: { tenant_id: tenantId }, orderBy: { kind: 'asc' } }),
    prisma.proximity_week_indexes.findMany({
      where: { tenant_id: tenantId },
      orderBy: { starts_on: 'asc' },
    }),
    prisma.proximity_locations.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, name: true, price_tier: true, rate_multiplier: true, status: true },
      orderBy: { name: 'asc' },
    }),
    prisma.proximity_zones.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        name: true,
        kind: true,
        weekly_rate: true,
        status: true,
        location_id: true,
        location: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    currency: card?.currency || 'KES',
    default_weekly_rate: asNumber(card?.default_weekly_rate),
    small_multiplier: asNumber(card?.small_multiplier) ?? 1,
    large_multiplier: asNumber(card?.large_multiplier) ?? 2,
    section_rates: sectionRates.map((rate) => ({
      kind: rate.kind,
      weekly_rate: Number(rate.weekly_rate),
    })),
    week_indexes: weekIndexes.map((index) => ({
      id: index.id,
      label: index.label,
      starts_on: dateKey(index.starts_on),
      ends_on: dateKey(index.ends_on),
      multiplier: Number(index.multiplier),
    })),
    branches: branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      status: branch.status,
      price_tier: branch.price_tier === 'large' ? 'large' : 'small',
      rate_multiplier: asNumber(branch.rate_multiplier),
    })),
    sections: sections.map((section) => ({
      id: section.id,
      name: section.name,
      kind: section.kind,
      status: section.status,
      location_id: section.location_id,
      location_name: section.location.name,
      weekly_rate: asNumber(section.weekly_rate),
    })),
  };
}

export async function saveRateCard(tenantId: string, body: RateCardInput) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.proximity_rate_cards.upsert({
      where: { tenant_id: tenantId },
      create: {
        tenant_id: tenantId,
        default_weekly_rate: body.default_weekly_rate,
        small_multiplier: body.small_multiplier,
        large_multiplier: body.large_multiplier,
        currency: 'KES',
      },
      update: {
        default_weekly_rate: body.default_weekly_rate,
        small_multiplier: body.small_multiplier,
        large_multiplier: body.large_multiplier,
        updated_at: now,
      },
    });

    await tx.proximity_section_rates.deleteMany({ where: { tenant_id: tenantId } });
    if (body.section_rates.length > 0) {
      await tx.proximity_section_rates.createMany({
        data: body.section_rates.map((rate) => ({
          tenant_id: tenantId,
          kind: rate.kind.trim().toLowerCase(),
          weekly_rate: rate.weekly_rate,
        })),
      });
    }

    await tx.proximity_week_indexes.deleteMany({ where: { tenant_id: tenantId } });
    if (body.week_indexes.length > 0) {
      await tx.proximity_week_indexes.createMany({
        data: body.week_indexes.map((index) => ({
          tenant_id: tenantId,
          label: index.label.trim(),
          starts_on: new Date(`${index.starts_on}T00:00:00.000Z`),
          ends_on: new Date(`${index.ends_on}T00:00:00.000Z`),
          multiplier: index.multiplier,
        })),
      });
    }

    for (const branch of body.branches) {
      await tx.proximity_locations.updateMany({
        where: { id: branch.id, tenant_id: tenantId },
        data: {
          price_tier: branch.price_tier,
          rate_multiplier: branch.rate_multiplier,
          updated_at: now,
        },
      });
    }

    for (const section of body.sections) {
      await tx.proximity_zones.updateMany({
        where: { id: section.id, tenant_id: tenantId },
        data: { weekly_rate: section.weekly_rate, updated_at: now },
      });
    }
  });

  return loadRateCard(tenantId);
}

export function presentQuote(quote: PlacementQuote) {
  return {
    priced: quote.priced,
    total: quote.total,
    billed_weeks: quote.billedWeeks,
    week_index: quote.weekIndex,
    currency: 'KES',
    lines: quote.lines.map((line) => ({
      location_id: line.locationId,
      zone_id: line.zoneId,
      location_name: line.locationName,
      zone_name: line.zoneName,
      weekly_rate: line.weeklyRate,
      branch_multiplier: line.branchMultiplier,
      week_index: line.weekIndex,
      billed_weeks: line.billedWeeks,
      line_total: line.lineTotal,
    })),
    missing: quote.missing,
    message: quote.priced
      ? null
      : 'Publish a weekly rate on the Pricing tab before this flight can be priced.',
  };
}

export async function quoteTenantPlacements(
  tenantId: string,
  startsAt: Date,
  endsAt: Date,
  placements: { location_id: string; zone_id: string }[]
): Promise<PlacementQuote> {
  const [cardRow, kindRows, indexRows, locations, zones] = await Promise.all([
    prisma.proximity_rate_cards.findUnique({ where: { tenant_id: tenantId } }),
    prisma.proximity_section_rates.findMany({ where: { tenant_id: tenantId } }),
    prisma.proximity_week_indexes.findMany({ where: { tenant_id: tenantId } }),
    prisma.proximity_locations.findMany({
      where: { tenant_id: tenantId, id: { in: placements.map((item) => item.location_id) } },
    }),
    prisma.proximity_zones.findMany({
      where: { tenant_id: tenantId, id: { in: placements.map((item) => item.zone_id) } },
    }),
  ]);

  const card = {
    defaultWeeklyRate: asNumber(cardRow?.default_weekly_rate) ?? EMPTY_CARD.defaultWeeklyRate,
    smallMultiplier: asNumber(cardRow?.small_multiplier) ?? EMPTY_CARD.smallMultiplier,
    largeMultiplier: asNumber(cardRow?.large_multiplier) ?? EMPTY_CARD.largeMultiplier,
  };
  const kindRates = kindRows.map((rate) => ({ kind: rate.kind, weeklyRate: Number(rate.weekly_rate) }));
  const weekIndexes = indexRows.map((index) => ({
    startsOn: dateKey(index.starts_on),
    endsOn: dateKey(index.ends_on),
    multiplier: Number(index.multiplier),
  }));

  const pricedPlacements: PlacementPriceInput[] = placements.map((placement) => {
    const location = locations.find((item) => item.id === placement.location_id);
    const zone = zones.find((item) => item.id === placement.zone_id && item.location_id === placement.location_id);
    if (!location || !zone) {
      throw Object.assign(new Error('Choose a product section that belongs to the selected branch.'), { status: 400 });
    }
    return {
      locationId: location.id,
      zoneId: zone.id,
      locationName: location.name,
      zoneName: zone.name,
      zoneKind: zone.kind,
      zoneWeeklyRate: asNumber(zone.weekly_rate),
      priceTier: location.price_tier,
      rateMultiplier: asNumber(location.rate_multiplier),
    };
  });

  return quotePlacements({
    startsAt,
    endsAt,
    card,
    kindRates,
    weekIndexes,
    placements: pricedPlacements,
  });
}

export async function listPricesForInventory(tenantId: string) {
  const [cardRow, kindRows, locations] = await Promise.all([
    prisma.proximity_rate_cards.findUnique({ where: { tenant_id: tenantId } }),
    prisma.proximity_section_rates.findMany({ where: { tenant_id: tenantId } }),
    prisma.proximity_locations.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      include: { zones: { where: { status: 'active' }, select: { id: true, name: true, kind: true, weekly_rate: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);
  const card = {
    defaultWeeklyRate: asNumber(cardRow?.default_weekly_rate),
    smallMultiplier: asNumber(cardRow?.small_multiplier) ?? 1,
    largeMultiplier: asNumber(cardRow?.large_multiplier) ?? 2,
  };
  const kindRates = kindRows.map((rate) => ({ kind: rate.kind, weeklyRate: Number(rate.weekly_rate) }));

  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    zones: location.zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      kind: zone.kind,
      list_weekly_rate: listWeeklyPrice(
        {
          locationId: location.id,
          zoneId: zone.id,
          locationName: location.name,
          zoneName: zone.name,
          zoneKind: zone.kind,
          zoneWeeklyRate: asNumber(zone.weekly_rate),
          priceTier: location.price_tier,
          rateMultiplier: asNumber(location.rate_multiplier),
        },
        card,
        kindRates
      ),
    })),
  }));
}

export function quoteLineCreates(tenantId: string, lines: QuoteLine[]) {
  return lines.map((line) => ({
    tenant_id: tenantId,
    location_id: line.locationId,
    zone_id: line.zoneId,
    location_name: line.locationName,
    zone_name: line.zoneName,
    weekly_rate: line.weeklyRate,
    branch_multiplier: line.branchMultiplier,
    week_index: line.weekIndex,
    billed_weeks: line.billedWeeks,
    line_total: line.lineTotal,
  }));
}

export function resolveCampaignFee(input: {
  quote: PlacementQuote;
  clientFee: number | null | undefined;
  ignoreClientFee: boolean;
}) {
  if (input.ignoreClientFee) {
    if (!input.quote.priced) {
      throw Object.assign(
        new Error('This store has not published proximity rates yet. Ask them to set prices before you book.'),
        { status: 400 }
      );
    }
    return input.quote.total;
  }
  if (input.clientFee != null) return input.clientFee;
  if (input.quote.priced) return input.quote.total;
  return null;
}
