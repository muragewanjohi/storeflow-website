import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });
import { prisma } from "../src/lib/prisma/client";

async function main() {
  const rows = await prisma.tenant_tumizi_integrations.findMany({
    where: { enabled: true },
    take: 5,
    select: { tenant_id: true, merchant_external_id: true },
  });
  console.log("ENABLED_MERCHANTS:");
  console.log(JSON.stringify(rows, null, 2));

  const events = await prisma.tumizi_webhook_events.findMany({
    orderBy: { created_at: "desc" },
    take: 8,
    select: {
      event_name: true,
      external_reference: true,
      processing_status: true,
      processing_error: true,
      created_at: true,
    },
  });
  console.log("RECENT_WEBHOOKS:");
  console.log(JSON.stringify(events, null, 2));
}

main().finally(() => prisma.$disconnect());
