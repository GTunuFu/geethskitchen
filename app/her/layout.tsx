import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Geeth's Kitchen",
  manifest: "/her.webmanifest",
  icons: { icon: "/icons/her-192.png", apple: "/icons/her-180.png" },
  appleWebApp: { capable: true, title: "Geeth's Kitchen", statusBarStyle: "black-translucent" },
};

export default async function HerLayout({ children }: { children: React.ReactNode }) {
  const role = await getRole();
  if (role !== "her") redirect("/?as=her");
  return children;
}
