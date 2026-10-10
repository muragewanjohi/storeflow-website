const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { Client } = require('pg');

const TENANT = '9cb83b50-75ec-4529-ba29-0a87ec2d214f';
const LOCATION = 'f226837b-35b5-48b3-9d48-0ca9820644ad';
const ZONE = 'ac0c8b24-b7b3-4328-98bd-c4337de2c713';
const BEACON = '7d757292-8bc9-4dd1-98fb-070701e557a3';
const API = 'http://127.0.0.1:3000';
const PORT = 3099;
const DWELL_MS = 2500;
const AWAY_MS = 4000;
const TARGET_NAME = 'CP35-4A02';
const TARGET_AWAY_MS = 15000;
const SHOPPER = 'walkthrough-pc';

function readDirectUrl() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const line = env.split(/\r?\n/).find((entry) => entry.startsWith('DIRECT_URL='));
  if (!line) throw new Error('DIRECT_URL is missing');
  let url = line.slice('DIRECT_URL='.length).trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }
  return url;
}

function newScanKey() {
  const token = `dn_scan_${crypto.randomBytes(24).toString('base64url')}`;
  return { token, prefix: token.slice(0, 20), hash: crypto.createHash('sha256').update(token).digest('hex') };
}

async function prepare(client) {
  await client.query(
    `
    INSERT INTO proximity_campaigns (
      tenant_id, name, headline, body, cta_label, starts_at, ends_at, timezone,
      purpose, days_of_week, frequency_cap_per_day, visit_storm_cap, dwell_ms, priority, status
    )
    SELECT $1, 'Beacon walkthrough', 'You are in the Lotions aisle',
           'This offer is on screen because the beacon is next to this computer.',
           'View offer', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', 'Africa/Nairobi',
           'standard', '0123456', 30, 30, 2500, 40, 'approved'
    WHERE NOT EXISTS (
      SELECT 1 FROM proximity_campaigns
      WHERE tenant_id = $1 AND name = 'Beacon walkthrough'
    )
    `,
    [TENANT]
  );
  await client.query(
    `
    UPDATE proximity_campaigns
    SET status = 'approved',
        starts_at = NOW() - INTERVAL '1 day',
        ends_at = NOW() + INTERVAL '2 days',
        frequency_cap_per_day = 30,
        visit_storm_cap = 30,
        billing_paused = false,
        updated_at = NOW()
    WHERE tenant_id = $1 AND name = 'Beacon walkthrough'
    `,
    [TENANT]
  );
  await client.query(
    `
    INSERT INTO proximity_campaign_placements (tenant_id, campaign_id, location_id, zone_id)
    SELECT $1, c.id, $2, $3
    FROM proximity_campaigns c
    WHERE c.tenant_id = $1 AND c.name = 'Beacon walkthrough'
      AND NOT EXISTS (
        SELECT 1 FROM proximity_campaign_placements p
        WHERE p.campaign_id = c.id AND p.location_id = $2 AND p.zone_id = $3
      )
    `,
    [TENANT, LOCATION, ZONE]
  );
  const beacon = await client.query(
    `SELECT ibeacon_uuid, major, minor FROM proximity_beacons WHERE id = $1`,
    [BEACON]
  );
  const key = newScanKey();
  await client.query(
    `INSERT INTO proximity_sdk_apps (tenant_id, name, flavor, key_prefix, key_hash, status)
     VALUES ($1, 'Walkthrough computer', 'scan', $2, $3, 'active')`,
    [TENANT, key.prefix, key.hash]
  );
  return { beacon: beacon.rows[0], token: key.token };
}

function macAddress(addr) {
  try {
    const n = BigInt(addr);
    const bytes = [];
    for (let i = 5; i >= 0; i -= 1) {
      bytes.push(Number((n >> BigInt(i * 8)) & 0xffn).toString(16).padStart(2, '0'));
    }
    return bytes.join(':');
  } catch {
    return String(addr);
  }
}

const devices = new Map();
const state = {
  listening: false,
  bluetoothError: null,
  phase: 'waiting',
  beacon: null,
  card: null,
  reason: null,
  note: null,
  nearby: [],
  target: null,
};

let registered = null;
let scanToken = '';
let visitId = crypto.randomBytes(4).toString('hex');
let presenceKey = null;
let offeredFor = null;
let fetching = false;
let targetAddr = null;
let knownIbeacon = null;

function isTargetDevice(device) {
  return device.addr === targetAddr || (device.name || '').toUpperCase() === TARGET_NAME;
}

function freshDevices(now) {
  const list = [];
  for (const [addr, device] of devices) {
    const limit = isTargetDevice(device) ? TARGET_AWAY_MS : AWAY_MS;
    if (now - device.lastSeen > limit) {
      devices.delete(addr);
      continue;
    }
    list.push(device);
  }
  list.sort((a, b) => b.rssi - a.rssi);
  return list;
}

async function apiGet(params) {
  const url = new URL('/api/v1/proximity/ads/current', API);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${scanToken}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Ad request failed (${response.status})`);
  }
  return body;
}

async function apiDelivered(beacon, campaignId) {
  await fetch(new URL('/api/v1/proximity/events', API), {
    method: 'POST',
    headers: { Authorization: `Bearer ${scanToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uuid: beacon.uuid,
      major: beacon.major,
      minor: beacon.minor,
      campaign_id: campaignId,
      opaque_customer_id: SHOPPER,
      visit_id: visitId,
      event_type: 'delivered',
      source: 'ble',
      consent: true,
      impression_on_screen: true,
      dwell_elapsed_ms: DWELL_MS,
    }),
  });
}

async function adoptBeacon(device, client) {
  const beacon = device.ibeacon;
  if (!isTargetDevice(device) || device.packets < 3) return;
  const same =
    registered.ibeacon_uuid.toLowerCase() === beacon.uuid &&
    Number(registered.major) === beacon.major &&
    Number(registered.minor) === beacon.minor;
  if (same) return;
  await client.query(
    `UPDATE proximity_beacons
     SET ibeacon_uuid = $2, major = $3, minor = $4, updated_at = NOW()
     WHERE id = $1`,
    [BEACON, beacon.uuid, beacon.major, beacon.minor]
  );
  registered = { ibeacon_uuid: beacon.uuid, major: beacon.major, minor: beacon.minor };
  state.note = `Your beacon ${beacon.uuid} / ${beacon.major} / ${beacon.minor} is now the Lotions aisle beacon.`;
}

async function offer(device, client) {
  const beacon = device.ibeacon;
  const key = `${beacon.uuid}:${beacon.major}:${beacon.minor}:${visitId}`;
  if (offeredFor === key || fetching) return;
  fetching = true;
  try {
    await adoptBeacon(device, client);
    const result = await apiGet({
      uuid: beacon.uuid,
      major: beacon.major,
      minor: beacon.minor,
      opaque_customer_id: SHOPPER,
      visit_id: visitId,
      consent: 'true',
      source: 'ble',
      dwell_elapsed_ms: DWELL_MS,
    });
    if (result.action === 'eligible' && result.card) {
      state.card = result.card;
      state.reason = null;
      state.phase = 'showing';
      offeredFor = key;
      await apiDelivered(beacon, result.card.campaign_id);
    } else {
      state.card = null;
      state.reason = result.reason || 'no_card';
      state.phase = 'showing';
      offeredFor = key;
    }
  } catch (error) {
    state.card = null;
    state.reason = error.message;
    state.phase = 'showing';
  } finally {
    fetching = false;
  }
}

function page() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Beacon walkthrough</title>
  <style>
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #f4f0e8; color: #1c1915; }
    main { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; }
    h1 { font-size: 2rem; margin: 0 0 8px; }
    .status { font-size: 1.25rem; margin: 0 0 20px; }
    .card { background: white; border-radius: 18px; padding: 28px; box-shadow: 0 12px 40px rgba(40, 30, 10, 0.12); }
    .card h2 { margin: 0 0 8px; font-size: 1.8rem; }
    .eyebrow { letter-spacing: 0.08em; text-transform: uppercase; font-family: sans-serif; font-size: 0.75rem; color: #8a5a12; }
    .cta { display: inline-block; margin-top: 16px; background: #1c1915; color: white; padding: 10px 16px; border-radius: 999px; font-family: sans-serif; }
    .muted { color: #5c564c; font-family: sans-serif; }
    ul { padding-left: 18px; font-family: sans-serif; }
    .away { background: #efe7da; }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Ruaka · Lotions aisle</p>
    <h1>Beacon walkthrough</h1>
    <p class="status" id="status">Starting the Bluetooth listener…</p>
    <section id="card"></section>
    <p class="muted" id="note"></p>
    <h3>CP35-4A02</h3>
    <ul id="nearby"></ul>
  </main>
  <script>
    const reasons = {
      no_live_campaign: 'The beacon is heard, but no offer is scheduled for this aisle right now.',
      frequency_or_storm_capped: 'This shopper already saw the offer enough times today.',
      dwell_not_met: 'Hold the beacon still for another moment.',
      zone_not_found: 'This beacon is not assigned to an aisle yet.',
      consent_required: 'Consent is required before an offer can show.'
    };
    function render(state) {
      const status = document.getElementById('status');
      const card = document.getElementById('card');
      const note = document.getElementById('note');
      const nearby = document.getElementById('nearby');
      if (state.bluetoothError) status.textContent = state.bluetoothError;
      else if (!state.listening) status.textContent = 'Starting the Bluetooth listener…';
      else if (state.phase === 'showing' && state.card) status.textContent = 'CP35-4A02 is here. The aisle offer is on screen.';
      else if (state.phase === 'showing') status.textContent = reasons[state.reason] || state.reason || 'Beacon is here.';
      else if (state.phase === 'dwelling') status.textContent = 'CP35-4A02 is here. Holding for 2.5 seconds so a quick pass does not count.';
      else if (state.phase === 'away') status.textContent = 'CP35-4A02 left range. Walk it back to the computer to see the offer again.';
      else if (state.listening) status.textContent = 'Listening only for CP35-4A02. Other Bluetooth devices are ignored.';
      else status.textContent = 'Starting the Bluetooth listener…';
      note.textContent = state.note || '';
      if (state.card) {
        card.className = 'card';
        card.innerHTML = '<p class="eyebrow">' + (state.card.advertiser_name || 'Store offer') + '</p><h2></h2><p></p><span class="cta"></span>';
        card.querySelector('h2').textContent = state.card.headline || '';
        card.querySelector('p:last-of-type').textContent = state.card.body || '';
        card.querySelector('.cta').textContent = state.card.cta_label || 'View offer';
      } else if (state.phase === 'away') {
        card.className = 'card away';
        card.textContent = 'No offer. The beacon is out of range.';
      } else {
        card.className = '';
        card.innerHTML = '';
      }
      nearby.innerHTML = '';
      if (state.target) {
        const item = document.createElement('li');
        const id = state.target.ibeacon
          ? ' · iBeacon ' + state.target.ibeacon.major + '/' + state.target.ibeacon.minor
          : '';
        const ago = Math.max(0, Math.round((state.target.ageMs || 0) / 1000));
        item.textContent = 'CP35-4A02' + id + ' · ' + state.target.rssi + ' dBm · heard ' + ago + 's ago';
        nearby.appendChild(item);
      }
    }
    async function tick() {
      try {
        const response = await fetch('/state');
        render(await response.json());
      } catch (error) {
        document.getElementById('status').textContent = 'Lost contact with the walkthrough listener.';
      }
    }
    tick();
    setInterval(tick, 500);
  </script>
</body>
</html>`;
}

async function main() {
  const client = new Client({ connectionString: readDirectUrl(), ssl: { rejectUnauthorized: false } });
  client.on('error', () => {
    state.note = 'The store database connection dropped. Bluetooth listening continues.';
  });
  await client.connect();
  const prepared = await prepare(client);
  registered = prepared.beacon;
  scanToken = prepared.token;

  const server = http.createServer((request, response) => {
    if (request.url === '/state') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(state));
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(page());
  });
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

  const logPath = require('path').join(process.cwd(), 'scripts', 'ble-watch.log');
  const watcher = spawn(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', '.\\scripts\\ble-watch.ps1'],
    { cwd: process.cwd(), windowsHide: true }
  );
  watcher.stderr.on('data', (chunk) => {
    const text = String(chunk).trim();
    if (text) state.bluetoothError = text.slice(0, 240);
  });
  watcher.stdout.on('data', (chunk) => {
    const text = String(chunk);
    if (text.includes('Started')) state.listening = true;
    if (text.includes('error')) state.bluetoothError = text.trim().slice(0, 240);
  });
  let offset = 0;
  setInterval(() => {
    if (!fs.existsSync(logPath)) return;
    const stat = fs.statSync(logPath);
    if (stat.size < offset) offset = 0;
    if (stat.size === offset) return;
    const fd = fs.openSync(logPath, 'r');
    const buffer = Buffer.alloc(stat.size - offset);
    fs.readSync(fd, buffer, 0, buffer.length, offset);
    fs.closeSync(fd);
    offset = stat.size;
    state.listening = true;
    buffer.toString('utf8').split(/\r?\n/).forEach((line) => {
      if (!line.trim()) return;
      let packet;
      try {
        packet = JSON.parse(line);
      } catch {
        return;
      }
      if (packet.error) state.bluetoothError = packet.error;
      if (!packet.addr) return;
      const named = (packet.name || '').toUpperCase() === TARGET_NAME;
      if (named) targetAddr = packet.addr;
      if (packet.addr !== targetAddr && !named) return;
      if (packet.ibeacon) knownIbeacon = packet.ibeacon;
      const previous = devices.get(packet.addr);
      const stillHere = previous && Date.now() - previous.lastSeen < TARGET_AWAY_MS;
      devices.set(packet.addr, {
        addr: packet.addr,
        mac: macAddress(packet.addr),
        name: TARGET_NAME,
        rssi: packet.rssi,
        company: packet.company,
        ibeacon: packet.ibeacon || previous?.ibeacon || knownIbeacon,
        packets: stillHere ? (previous.packets || 1) + 1 : 1,
        firstSeen: stillHere ? previous.firstSeen : Date.now(),
        lastSeen: Date.now(),
      });
    });
  }, 300);

  setInterval(() => {
    const now = Date.now();
    freshDevices(now);
    const beacon = targetAddr ? devices.get(targetAddr) : null;
    const here = Boolean(beacon && now - beacon.lastSeen <= TARGET_AWAY_MS);
    const identity = beacon?.ibeacon || knownIbeacon;
    state.target = beacon
      ? {
          name: TARGET_NAME,
          mac: beacon.mac,
          rssi: beacon.rssi,
          here,
          ageMs: now - beacon.lastSeen,
          ibeacon: identity,
        }
      : null;
    state.nearby = state.target ? [state.target] : [];
    if (!here) {
      if (presenceKey) {
        state.phase = 'away';
        state.card = null;
        state.beacon = null;
        presenceKey = null;
        offeredFor = null;
        visitId = crypto.randomBytes(4).toString('hex');
      }
      return;
    }
    if (presenceKey !== TARGET_NAME) {
      presenceKey = TARGET_NAME;
      offeredFor = null;
      state.card = null;
    }
    if (!identity) {
      state.phase = 'dwelling';
      state.note = 'CP35-4A02 is here. Waiting for its iBeacon advertisement.';
      return;
    }
    beacon.ibeacon = identity;
    state.beacon = { ...identity, rssi: beacon.rssi, heldMs: now - beacon.firstSeen };
    if (now - beacon.firstSeen >= DWELL_MS) {
      offer(beacon, client);
    } else if (state.phase !== 'showing') {
      state.phase = 'dwelling';
    }
  }, 400);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const result = await apiGet({
        uuid: registered.ibeacon_uuid,
        major: registered.major,
        minor: registered.minor,
        opaque_customer_id: 'walkthrough-selftest',
        visit_id: 'selftest',
        consent: 'true',
        source: 'ble',
        dwell_elapsed_ms: 3000,
      });
      if (result.action === 'eligible') {
        console.log(`Ad ready: ${result.card.headline}`);
      } else {
        console.log(`Ad check: ${result.reason}`);
      }
      break;
    } catch (error) {
      if (attempt === 39) console.log(`Store is not answering yet: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  console.log(`Walkthrough listening at http://127.0.0.1:${PORT}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
