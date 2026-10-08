import webpush from "web-push";
import { db, getSetting } from "./db";
import type { Role } from "./auth";

let configured = false;

export async function vapidKeys() {
  const raw = await getSetting("vapid", () => JSON.stringify(webpush.generateVAPIDKeys()));
  return JSON.parse(raw) as { publicKey: string; privateKey: string };
}

async function configure() {
  if (configured) return;
  const k = await vapidKeys();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:chef@geethskitchen.app", k.publicKey, k.privateKey);
  configured = true;
}

export async function notify(role: Role, payload: { title: string; body: string; url?: string; tag?: string }) {
  try {
    await configure();
    const s = db();
    const subs = await s`select endpoint, sub from push_subs where role = ${role}`;
    await Promise.all(
      subs.map(async (row) => {
        try {
          await webpush.sendNotification(row.sub as any, JSON.stringify(payload), { TTL: 60 * 60 * 12 });
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await s`delete from push_subs where endpoint = ${row.endpoint}`;
          } else {
            console.error("push failed", e?.statusCode, e?.body);
          }
        }
      })
    );
    return subs.length;
  } catch (e) {
    console.error("notify error", e);
    return 0;
  }
}
