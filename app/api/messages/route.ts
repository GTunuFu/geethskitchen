import { NextResponse } from "next/server";
import { getRole, HER_NAME } from "@/lib/auth";
import { db, ready } from "@/lib/db";
import { notify } from "@/lib/push";

export const dynamic = "force-dynamic";

// GET: the conversation (oldest first). Opening it marks the other person's messages as read.
export async function GET() {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "login" }, { status: 401 });
  await ready();
  const s = db();
  await s`update messages set read_at = now() where sender <> ${role} and read_at is null`;
  const rows = await s`select * from (select * from messages order by id desc limit 300) m order by id asc`;
  const [last] = await s`select max(id)::int as id from messages where sender = ${role} and read_at is not null`;
  return NextResponse.json({
    me: role,
    lastReadMine: last?.id || 0,
    messages: rows.map((m: any) => ({ id: m.id, sender: m.sender, body: m.body, createdAt: m.created_at })),
  });
}

// POST: send a message and ping the other person.
export async function POST(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "login" }, { status: 401 });
  await ready();
  const { body } = await req.json();
  const text = typeof body === "string" ? body.trim().slice(0, 2000) : "";
  if (!text) return NextResponse.json({ error: "Say something!" }, { status: 400 });
  const [m] = await db()`insert into messages (sender, body) values (${role}, ${text}) returning id, created_at`;
  const to = role === "chef" ? "her" : "chef";
  await notify(to, {
    title: role === "chef" ? "💬 Chef" : `💬 ${HER_NAME}`,
    body: text.length > 140 ? text.slice(0, 137) + "…" : text,
    url: `/${to}?tab=chat`,
    tag: "chat",
  });
  return NextResponse.json({ ok: true, id: m.id });
}
