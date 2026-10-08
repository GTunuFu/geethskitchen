import { db, ready } from "@/lib/db";
import { getRole } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getRole())) return new Response("nope", { status: 401 });
  const { id } = await params;
  await ready();
  const rows = await db()`select data from images where id = ${Number(id)}`;
  if (!rows.length) return new Response("not found", { status: 404 });
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/.exec(rows[0].data);
  if (!m) return new Response("bad", { status: 500 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
