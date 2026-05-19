import { extractTumiziCustomerPaymentStatus } from '@/lib/tumizi/apply-payment-status';

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

  it('reads flat response shape', () => {
    const result = extractTumiziCustomerPaymentStatus({
      status: 'initiated',
      payment_reference: 'pay-ref-1',
    });

    expect(result.status).toBe('initiated');
    expect(result.transactionReference).toBe('pay-ref-1');
  });
});
