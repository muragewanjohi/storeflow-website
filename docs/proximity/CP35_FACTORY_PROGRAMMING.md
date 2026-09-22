# CP35 factory programming request (pilot)

**Status:** Send this to DX-SMART before ordering a production logo batch.  
**Order size:** 10–20 units for lab + one store. Do not laser-logo 1,000 until the aisle lab passes.

Vendor: SHEN ZHEN DX-SMART TECHNOLOGY CO., LTD  
Email: manager@szdx-smart.com  
WhatsApp: +86 15798463070  
Site: https://en.szdx-smart.com

## DukaNest iBeacon identity

Use this platform UUID on every DukaNest CP35. Never ship the public AirLocate UUID `E2C56DB5-DFFB-48D2-B060-D0F5A71096E0`.

| Field | Value |
|---|---|
| iBeacon UUID | `6e8a4c12-9f3d-4b71-a2e8-1d7c0b5e4a91` |
| Major | Assigned per branch at commission (0–65535). Factory may leave `0`. |
| Minor | Assigned per zone at commission (0–65535). Factory may leave `0`. |

Major/minor are finished in the store with the DX-SMART app (pilot) or the DukaNest merchant commission SDK (production). Factory only needs a stable UUID and radio profile.

## Factory profile (never ship DX-SMART defaults)

1. **Frames:** iBeacon only. Set UID, URL, ACC, User to NoData. TLM off for the lab batch.
2. **Trigger:** off (advertising must not depend on button or motion).
3. **TX power:** `-13.5 dBm` (step list: -19.5, -13.5, -9, -7, -3.5, -1, +1.5, +2.5). Default +2.5 dBm is 55–73 m and cannot sell zones.
4. **Advertise interval:** 500 ms (acceptable range 400–800 ms).
5. **Connection password:** do **not** use `dx1234` / `1234`. Set a DukaNest batch password and send it out of band. Change again per retailer at install.
6. **Button enable:** off after factory test (or we disable at install).
7. **BLE name:** `DN-CP35-XXXX` (last 4 of MAC) if customizable.

## Email template

```text
Subject: OEM programming for 20 x DX-CP35 — DukaNest iBeacon profile

Hello DX-SMART,

We would like to order 20 x DX-CP35 for a supermarket proximity pilot.

Please factory-program:

- Protocol: iBeacon only (disable Eddystone UID/URL, ACC, User, TLM)
- UUID: 6e8a4c12-9f3d-4b71-a2e8-1d7c0b5e4a91
- Major/Minor: 0 / 0 (we will set per store)
- TX: -13.5 dBm
- Interval: 500 ms
- Trigger: off
- Connection password: [BATCH_PASSWORD — send separately]
- Do not use default UUID E2C56DB5-DFFB-48D2-B060-D0F5A71096E0 or password dx1234

Please confirm:
1. You can freeze a single iBeacon frame (not UUID rotation).
2. Unit price, lead time, and whether you can provide a GATT/config SDK under NDA for our staff app (shopper apps will only scan iBeacon).
3. Packing list with MAC + QR for each unit.

We will not order a branded 1000-unit run until this 20-unit sample passes an aisle test.

Thank you,
DukaNest
```

## After delivery

1. Dump one unit’s advertisement with nRF Connect: confirm UUID, single iBeacon frame, TX class.
2. Change password per retailer.
3. Register MAC, QR, major, minor, zone in the DukaNest dashboard (`/dashboard/proximity/beacons`).
4. Run [CP35_AISLE_LAB.md](./CP35_AISLE_LAB.md) before selling a zone.
