import {
  mapTumiziStatusToOrderPaymentStatus,
  normalizeTumiziEventPayload,
  shouldProcessTumiziWebhookEvent,
} from '@/lib/tumizi/webhook';

describe('tumizi webhook helpers', () => {
  it('maps successful tumizi statuses to paid', () => {
    expect(mapTumiziStatusToOrderPaymentStatus('successful')).toBe('paid');
    expect(mapTumiziStatusToOrderPaymentStatus('SUCCESSFUL')).toBe('paid');
    expect(mapTumiziStatusToOrderPaymentStatus('completed')).toBe('paid');
  });

  it('maps failed tumizi statuses to failed', () => {
    expect(mapTumiziStatusToOrderPaymentStatus('failed')).toBe('failed');
    expect(mapTumiziStatusToOrderPaymentStatus('reversed')).toBe('failed');
    expect(mapTumiziStatusToOrderPaymentStatus('cancelled')).toBe('failed');
  });

  it('maps unknown tumizi statuses to pending', () => {
    expect(mapTumiziStatusToOrderPaymentStatus('queued')).toBe('pending');
    expect(mapTumiziStatusToOrderPaymentStatus(undefined)).toBe('pending');
  });

  it('normalizes payload from direct webhook shape', () => {
    const normalized = normalizeTumiziEventPayload({
      event: 'partner.customer_payment.updated',
      data: {
        merchant_external_id: 'tenant-1',
        external_reference: 'ref-1',
        status: 'successful',
      },
    });

    expect(normalized.event).toBe('partner.customer_payment.updated');
    expect(normalized.merchantExternalId).toBe('tenant-1');
    expect(normalized.externalReference).toBe('ref-1');
    expect(normalized.status).toBe('successful');
  });

  it('normalizes payload from nested payload shape', () => {
    const normalized = normalizeTumiziEventPayload({
      type: 'partner.withdrawal.updated',
      payload: {
        merchantExternalId: 'tenant-2',
        externalReference: 'wd-1',
        status: 'processing',
      },
    });

    expect(normalized.event).toBe('partner.withdrawal.updated');
    expect(normalized.merchantExternalId).toBe('tenant-2');
    expect(normalized.externalReference).toBe('wd-1');
    expect(normalized.status).toBe('processing');
  });

  it('only processes supported webhook events', () => {
    expect(shouldProcessTumiziWebhookEvent('partner.customer_payment.updated')).toBe(true);
    expect(shouldProcessTumiziWebhookEvent('partner.withdrawal.updated')).toBe(true);
    expect(shouldProcessTumiziWebhookEvent('partner.refund.updated')).toBe(true);
    expect(shouldProcessTumiziWebhookEvent('partner.unknown.updated')).toBe(false);
    expect(shouldProcessTumiziWebhookEvent(undefined)).toBe(false);
  });
});
