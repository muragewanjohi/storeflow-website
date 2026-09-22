# DukaNestProximity SDK

Two flavors, **one repository**, **two binaries**.

| Flavor | File | Who ships it | Key type |
|---|---|---|---|
| Scan | [`src/lib/proximity/sdk/scan.ts`](../../src/lib/proximity/sdk/scan.ts) | Supermarket **consumer** app | `dn_scan_…` |
| Commission | [`src/lib/proximity/sdk/commission.ts`](../../src/lib/proximity/sdk/commission.ts) | DukaNest **merchant** app / staff flavor | `dn_commission_…` |

Never import `commission.ts` from the customer APK. Issue keys under **Dashboard → In-store ads → SDK keys**.

## Shopper (scan)

1. Ask for Bluetooth + in-store experiences. Copy is `PRIVACY_COPY_EN`.
2. Monitor **one** UUID: `6e8a4c12-9f3d-4b71-a2e8-1d7c0b5e4a91` (iOS region budget).
3. `noteSighting` until dwell (~2.5 s).
4. `GET /api/v1/proximity/ads/current` with the scan key.
5. Paint the card, **then** `track({ event_type: 'delivered', impression_on_screen: true })`.
6. Pocket detections: `detected` only. Never `delivered`.
7. Optional `claim`. Prefetch `/ads/prefetch` at visit start.
8. QR fallback: `/api/v1/proximity/qr/{campaignId}` (no dwell).

iOS: Core Location iBeacon. Android: standard BLE scan for manufacturer iBeacon. DX-SMART is the radio; DukaNest owns the API.

## Staff (commission)

Pilot: configure CP35 in the **DX-SMART** app using [CP35_FACTORY_PROGRAMMING.md](./CP35_FACTORY_PROGRAMMING.md), then register MAC/major/minor in the dashboard. `DukaNestProximityCommission.applyProfile` updates DukaNest’s registry (and later GATT).

## App Store

Declare Bluetooth / nearby devices. Nutrition labels: location used for in-store offers, not sold to advertisers. ODPC: retailer is controller; DukaNest is processor.
