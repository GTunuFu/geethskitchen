import { NextResponse } from "next/server";
import { pinFor, setSession, type Role } from "@/lib/auth";

export async function POST(req: Request) {
  const { role, pin } = (await req.json()) as { role: Role; pin: string };
  if (role !== "chef" && role !== "her") return NextResponse.json({ error: "who are you?" }, { status: 400 });
  const envSet = role === "chef" ? process.env.CHEF_PIN : process.env.HER_PIN;
  if (!envSet && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: `Set ${role === "chef" ? "CHEF_PIN" : "HER_PIN"} in Vercel first!` }, { status: 500 });
  }
  if (String(pin) !== pinFor(role)) return NextResponse.json({ error: "Wrong PIN, try again!" }, { status: 401 });
  await setSession(role);
  return NextResponse.json({ ok: true, role });
}
