import { redirect } from "next/navigation";
import { getRole, HER_NAME } from "@/lib/auth";
import Login from "./Login";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const role = await getRole().catch(() => null);
  if (role) redirect(`/${role}`);
  const { as } = await searchParams;
  return <Login herName={HER_NAME} initial={as === "chef" || as === "her" ? as : null} />;
}
