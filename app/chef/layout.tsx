import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GK Chef",
  manifest: "/chef.webmanifest",
  icons: { icon: "/icons/chef-192.png", apple: "/icons/chef-180.png" },
  appleWebApp: { capable: true, title: "GK Chef", statusBarStyle: "black-translucent" },
};

export default async function ChefLayout({ children }: { children: React.ReactNode }) {
  const role = await getRole();
  if (role !== "chef") redirect("/?as=chef");
  return children;
}
