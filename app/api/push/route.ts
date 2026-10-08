import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify, vapidKeys } from "@/lib/push";

export async function GET() {
  const k = await vapidKeys();
  return NextResponse.json({ publicKey: k.publicKey });
}

export async function POST(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "login" }, { status: 401 });
  const body = await req.json();
  if (body.test) {
    const n = await notify(role, { title: "Ding ding! 🔔", body: "Notifications are working, chef's kiss.", url: `/${role}` });
    return NextResponse.json({ ok: true, sent: n });
  }
  const sub = body.subscription;
  if (!sub?.endpoint) return NextResponse.json({ error: "no subscription" }, { status: 400 });
  await db()`insert into push_subs (endpoint, role, sub) values (${sub.endpoint}, ${role}, ${db().json(sub)})
    on conflict (endpoint) do update set role = excluded.role, sub = excluded.sub`;
  return NextResponse.json({ ok: true });
}
