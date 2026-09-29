import { DUKANEST_PROXIMITY_UUID, PRIVACY_COPY_SW, PROXIMITY_VISIT_STORM_CAP } from '../constants';
import { DukaNestProximityScan } from '../sdk/scan';

function scan() {
  return new DukaNestProximityScan({
    baseUrl: 'http://store.test',
    scanSdkKey: 'dn_scan_test',
    opaqueCustomerId: 'shopper-1',
    visitId: 'visit-1',
    consent: true,
    locale: 'sw',
  });
}

describe('shopper scan SDK', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ json: async () => ({ action: 'eligible' }) });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('waits for dwell before a BLE sighting is ready', () => {
    const client = scan();
    const sighting = { uuid: DUKANEST_PROXIMITY_UUID, major: 1, minor: 2 };
    expect(client.noteSighting(sighting, 1_000).ready).toBe(false);
    expect(client.noteSighting(sighting, 3_500).ready).toBe(true);
    expect(client.platformUuid()).not.toBe('E2C56DB5-DFFB-48D2-B060-D0F5A71096E0');
  });

  it('asks for the current card with locale and only after consent', async () => {
    const client = scan();
    const refused = new DukaNestProximityScan({
      baseUrl: 'http://store.test',
      scanSdkKey: 'dn_scan_test',
      opaqueCustomerId: 'shopper-1',
      consent: false,
    });
    await expect(refused.fetchCurrent({ uuid: DUKANEST_PROXIMITY_UUID, major: 1, minor: 2 }, 0)).resolves.toEqual({
      action: 'none',
      reason: 'consent_required',
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await client.fetchCurrent({ uuid: DUKANEST_PROXIMITY_UUID, major: 1, minor: 2 }, 2600, 'ble');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/v1/proximity/ads/current?');
    expect(url).toContain('locale=sw');
    expect(url).toContain('consent=true');
    expect(PRIVACY_COPY_SW.length).toBeGreaterThan(20);
  });

  it('refuses a delivered event until the card is on screen and stops at the visit storm cap', async () => {
    const client = scan();
    await expect(client.track({ event_type: 'delivered', campaign_id: 'c1' })).rejects.toThrow(/on screen/);

    for (let n = 0; n < PROXIMITY_VISIT_STORM_CAP; n += 1) {
      await client.track({
        event_type: 'delivered',
        campaign_id: `c${n}`,
        impression_on_screen: true,
        battery_mv: 2500,
      });
    }
    await expect(
      client.track({ event_type: 'delivered', campaign_id: 'extra', impression_on_screen: true })
    ).resolves.toEqual({ skipped: 'storm_cap' });

    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(firstBody).toMatchObject({
      event_type: 'delivered',
      impression_on_screen: true,
      battery_mv: 2500,
      opaque_customer_id: 'shopper-1',
      consent: true,
    });
  });

  it('checks the branch geofence before BLE starts', async () => {
    const client = scan();
    await client.checkGeofence(-1.208, 36.78);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://store.test/api/v1/proximity/geofence',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ latitude: -1.208, longitude: 36.78 }),
      })
    );
  });
});
