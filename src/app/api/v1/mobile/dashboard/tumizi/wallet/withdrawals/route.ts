import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  mobileTenantMustAllowWrites,
  requireMobileTenantStaff,
} from '@/lib/auth/mobile-dashboard-tenant';
import { tumiziClient } from '@/lib/tumizi/client';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import { getChargeForAmount } from '@/lib/tumizi/wallet-withdrawal-tiers';
import {
  getErrorMessage,
  getErrorStatus,
  getTumiziMerchantExternalIdOrThrow,
  normalizeKenyaTumiziPhone,
  tumiziWithdrawalSchema,
} from '@/lib/tumizi/mobile-route-helpers';

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;

  if (gate.ctx.user.role !== 'tenant_admin') {
    return NextResponse.json(
      mobileError('FORBIDDEN', 'Only the store owner can request Tumizi wallet withdrawals'),
      { status: 403 },
    );
  }

  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  try {
    const payload = tumiziWithdrawalSchema.parse(await request.json());
    const config = await getTumiziTenantConfigByTenantId(gate.ctx.tenantId);
    const merchantExternalId = getTumiziMerchantExternalIdOrThrow(config);

    const normalizedPhone = normalizeKenyaTumiziPhone(payload.phoneNumber);
    if (!normalizedPhone) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Enter a valid Kenya M-Pesa phone number (e.g. 2547XXXXXXXX).',
          [{ field: 'phoneNumber', message: 'Use 2547XXXXXXXX, 07XXXXXXXX, or 7XXXXXXXX format' }],
        ),
        { status: 400 },
      );
    }

    const withdrawalCharge = getChargeForAmount(payload.amount);
    const externalReference = `mobile-wallet-withdrawal-${gate.ctx.tenantId}-${Date.now()}`;
    const response = await tumiziClient.createWithdrawal({
      merchant_external_id: merchantExternalId,
      external_reference: externalReference,
      phone_number: normalizedPhone,
      amount: payload.amount,
      currency: 'KES',
      narration: payload.narration || 'Wallet withdrawal to M-Pesa',
    });

    const withdrawalReference =
      (response?.data as Record<string, unknown> | undefined)?.withdrawal_reference ||
      response.withdrawal_reference;

    await prisma.payment_logs.create({
      data: {
        tenant_id: gate.ctx.tenantId,
        user_id: gate.ctx.user.id,
        gateway: 'tumizi_withdrawal',
        amount: payload.amount,
        currency: 'KES',
        status: 'pending',
        payment_id: externalReference,
        transaction_id: typeof withdrawalReference === 'string' ? withdrawalReference : null,
        metadata: {
          source: 'mobile_tumizi_wallet_withdrawal',
          merchant_external_id: merchantExternalId,
          withdrawal_charge: withdrawalCharge,
          phone_number: normalizedPhone,
          external_reference: externalReference,
          response,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(
      mobileSuccess({
        externalReference,
        withdrawalCharge,
        response,
      }),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Validation error',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }

    const status = getErrorStatus(error);
    console.error('[Mobile Tumizi wallet withdrawal POST]', error);
    return NextResponse.json(
      mobileError(
        status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
        getErrorMessage(error, 'Failed to create Tumizi wallet withdrawal'),
      ),
      { status },
    );
  }
}
