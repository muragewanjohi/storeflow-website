import {
  extractTumiziCustomerPaymentStatus,
  shouldSkipTumiziOrderPaymentDowngrade,
} from '@/lib/tumizi/apply-payment-status';

describe('extractTumiziCustomerPaymentStatus', () => {
  it('reads status and mpesa receipt from nested data', () => {
    const result = extractTumiziCustomerPaymentStatus({
      data: {
        status: 'successful',
        mpesa_receipt_number: 'QHK123ABC',
      },
    });

    expect(result.status).toBe('successful');
    expect(result.transactionReference).toBe('QHK123ABC');
  });

  it('blocks downgrading a paid order when a later STK attempt fails', () => {
    expect(shouldSkipTumiziOrderPaymentDowngrade('paid', 'failed')).toBe(true);
    expect(shouldSkipTumiziOrderPaymentDowngrade('paid', 'pending')).toBe(true);
    expect(shouldSkipTumiziOrderPaymentDowngrade('paid', 'paid')).toBe(false);
    expect(shouldSkipTumiziOrderPaymentDowngrade('paid', 'refunded')).toBe(false);
    expect(shouldSkipTumiziOrderPaymentDowngrade('failed', 'paid')).toBe(false);
  });

  it('reads flat response shape', () => {
    const result = extractTumiziCustomerPaymentStatus({
      status: 'initiated',
      payment_reference: 'pay-ref-1',
    });

    expect(result.status).toBe('initiated');
    expect(result.transactionReference).toBe('pay-ref-1');
  });

  it('reads status from nested customer_payment object', () => {
    const result = extractTumiziCustomerPaymentStatus({
      data: {
        customer_payment: {
          status: 'succeeded',
          mpesa_receipt_number: 'UF67B6SAEH',
        },
      },
    });

    expect(result.status).toBe('succeeded');
    expect(result.transactionReference).toBe('UF67B6SAEH');
  });
});
