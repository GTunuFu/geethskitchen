import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getState } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "login" }, { status: 401 });
  return NextResponse.json({ role, ...(await getState()) });
}
