# CP35 aisle lab protocol

**Goal:** Freeze the DukaNest slot profile (TX step + interval) so two paid **departments** do not constantly false-trigger. This is not a shelf-level test. Adjacent shelves will hear each other; do not sell “this bay only.”

**Hardware:** commissioned CP35s (see [CP35_FACTORY_PROGRAMMING.md](./CP35_FACTORY_PROGRAMMING.md)).  
**Phones:** one iPhone (current iOS), two Android OEMs (e.g. Samsung + Tecno/Infinix).  
**App:** supermarket scan SDK or nRF Connect + a notes sheet. Prefer the DukaNest scan SDK dwell=0 for lab.

## Slot profile under test

Start at factory request: UUID `6e8a4c12-9f3d-4b71-a2e8-1d7c0b5e4a91`, TX **-13.5 dBm**, interval 500 ms, iBeacon only.

If entrance detect fails at walking pace, try **-9 dBm**. If adjacent department still fires, try **-19.5 dBm**. Record the lowest TX that still detects at the intended walk path.

## Layout

Place four beacons, same UUID, unique minor:

1. Entrance  
2. Category A (e.g. Beverages)  
3. Category B adjacent (e.g. Beauty or Household)  
4. Checkout  

Mount at ~2 m, facing the aisle, not behind metal back panels or stacked stock.

## Runs

For each TX step **-19.5, -13.5, -9 dBm**:

1. Quiet store, then a busy period if possible.
2. Walk entrance → A → B → checkout at normal pace. Repeat 10 times per phone.
3. Stand in A for 10 s. Count detections of B (false positives).
4. App **open**, **backgrounded**, **killed**. Background/killed rate is the real media funnel.
5. Time-to-first-detect at the entrance (walking).
6. RSSI at 1 m, 3 m, 6 m in the aisle (note metal).

## Pass / fail

**Pass (zone product):**  
- Entrance vs checkout rarely confused.  
- Category A vs B: false-positive rate under ~20% of visits at the chosen TX, after 2.5 s dwell.  
- Walking-pace detect on iPhone + both Androids with app open.

**Fail (do not sell aisle/department slots):**  
- A and B fire interchangeably at every TX step.  
- Then either sell only **entrance + checkout**, or switch SKU (Minew / Feasycom).

**Never pass:** “shelf 4 vs shelf 5.” Use QR/NFC on the strip.

## Freeze

Write the chosen TX, interval, mount height, and false-positive rate into the retailer beacon records. That profile is what the rate card means by a “zone.”
