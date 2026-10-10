/**
 * @jest-environment node
 *
 * Exercises the live local supermarket: a vendor submits a campaign, sees the
 * price, downloads the invoice, and the store approves or rejects it.
 * Requires `npm run dev` on port 3000.
 */
import http from 'node:http';

const HOST = 'supermarket.localhost:3000';

type Reply = { status: number; raw: Buffer; cookies: string[] };

function request(method: string, path: string, options?: { cookie?: string; body?: unknown }): Promise<Reply> {
  const payload = options?.body === undefined ? null : JSON.stringify(options.body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path,
        method,
        headers: {
          Host: HOST,
          Accept: '*/*',
          ...(options?.cookie ? { Cookie: options.cookie } : {}),
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const setCookie = res.headers['set-cookie'] || [];
          resolve({
            status: res.statusCode || 0,
            raw: Buffer.concat(chunks),
            cookies: setCookie.map((value) => value.split(';')[0]),
          });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function json(reply: Reply) {
  return JSON.parse(reply.raw.toString('utf8'));
}

function pdfText(pdf: Buffer): string {
  return [...pdf.toString('latin1').matchAll(/<([0-9A-Fa-f]+)>/g)]
    .map((match) => Buffer.from(match[1], 'hex').toString('latin1'))
    .join('');
}

function week(seed: number) {
  const start = new Date(Date.UTC(2029, 0, 1 + (seed % 600)));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const bound = (value: Date, endOfDay: boolean) =>
    new Date(`${value.toISOString().slice(0, 10)}T${endOfDay ? '23:59:59' : '00:00:00'}+03:00`).toISOString();
  return { starts_at: bound(start, false), ends_at: bound(end, true) };
}

async function login(path: string, email: string) {
  const reply = await request('POST', path, {
    body: { email, password: 'DukaNest-local-1' },
  });
  const body = reply.raw.toString('utf8');
  if (reply.status !== 200) throw new Error(`${path} ${reply.status} ${body}`);
  return reply.cookies.join('; ');
}

describe('proximity campaign review', () => {
  jest.setTimeout(120000);
  const seed = Date.now() % 100000;
  const approvedName = `Review approve ${seed}`;
  const rejectedName = `Review reject ${seed}`;
  const createdIds: string[] = [];
  let vendorCookie = '';
  let storeCookie = '';

  afterAll(async () => {
    if (!storeCookie) return;
    for (const id of createdIds) {
      await request('POST', `/api/dashboard/proximity/campaigns/${id}/review`, {
        cookie: storeCookie,
        body: { action: 'end' },
      });
      await request('DELETE', `/api/dashboard/proximity/campaigns/${id}`, { cookie: storeCookie });
    }
  });

  it('prices a submitted campaign, lets the store approve or reject it, and issues a downloadable invoice', async () => {
    vendorCookie = await login('/api/v1/proximity/vendor/login', 'vendor@dukanest.test');
    storeCookie = await login('/api/auth/tenant/login', 'supermarket@dukanest.test');

    const inventory = json(await request('GET', '/api/v1/proximity/vendor/inventory', { cookie: vendorCookie }));
    const location = inventory.data?.[0];
    const zone = location?.zones?.[0];
    expect(location?.id).toBeTruthy();
    expect(zone?.id).toBeTruthy();

    const approved = await submitCampaign(vendorCookie, approvedName, week(seed), location.id, zone.id);
    createdIds.push(approved.id);
    expect(approved.price).toBeGreaterThan(0);

    const issuedPdf = await request('GET', `/api/v1/proximity/vendor/invoices/${approved.invoiceId}`, {
      cookie: vendorCookie,
    });
    expect(issuedPdf.status).toBe(200);
    expect(issuedPdf.raw.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdfText(issuedPdf.raw)).toContain(approvedName);
    expect(pdfText(issuedPdf.raw)).toContain(approved.price.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

    const approvedReview = json(
      await request('POST', `/api/dashboard/proximity/campaigns/${approved.id}/review`, {
        cookie: storeCookie,
        body: { action: 'approve' },
      })
    );
    expect(approvedReview.data.status).toBe('approved');

    const rejected = await submitCampaign(vendorCookie, rejectedName, week(seed + 40), location.id, zone.id);
    createdIds.push(rejected.id);
    const rejectedReview = json(
      await request('POST', `/api/dashboard/proximity/campaigns/${rejected.id}/review`, {
        cookie: storeCookie,
        body: { action: 'reject', reason: 'Does not meet store guidelines' },
      })
    );
    expect(rejectedReview.data.status).toBe('rejected');

    const campaigns = json(await request('GET', '/api/v1/proximity/vendor/campaigns', { cookie: vendorCookie }));
    const rejectedCampaign = campaigns.data.find((item: { id: string }) => item.id === rejected.id);
    expect(rejectedCampaign.fee_amount).not.toBeNull();
    expect(Number(rejectedCampaign.fee_amount)).toBe(rejected.price);
    expect(rejectedCampaign.rejection_reason).toBe('Does not meet store guidelines');

    const invoices = json(await request('GET', '/api/v1/proximity/vendor/invoices', { cookie: vendorCookie }));
    const voided = invoices.data.find((item: { id: string }) => item.id === rejected.invoiceId);
    expect(voided.status).toBe('void');
    const voidPdf = await request('GET', `/api/v1/proximity/vendor/invoices/${rejected.invoiceId}`, {
      cookie: vendorCookie,
    });
    expect(pdfText(voidPdf.raw)).toContain('VOID');
  });
});

async function submitCampaign(
  cookie: string,
  name: string,
  dates: { starts_at: string; ends_at: string },
  locationId: string,
  zoneId: string
) {
  const placements = [{ location_id: locationId, zone_id: zoneId }];
  const quote = json(
    await request('POST', '/api/v1/proximity/vendor/quote', {
      cookie,
      body: { ...dates, placements },
    })
  );
  expect(quote.data.priced).toBe(true);

  const created = json(
    await request('POST', '/api/v1/proximity/vendor/campaigns', {
      cookie,
      body: {
        name,
        headline: `${name} headline`,
        starts_at: dates.starts_at,
        ends_at: dates.ends_at,
        trading_hours_start: '08:00',
        trading_hours_end: '21:00',
        days_of_week: '0123456',
        purpose: 'standard',
        terms_accepted: true,
        placements,
      },
    })
  );
  expect(created.price.total).toBe(quote.data.total);
  expect(created.invoice.status).toBe('issued');
  expect(created.invoice.amount).toBe(quote.data.total);
  return { id: created.data.id as string, invoiceId: created.invoice.id as string, price: created.price.total as number };
}
