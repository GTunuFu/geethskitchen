import type { Metadata, Viewport } from "next";
import "@fontsource/dela-gothic-one/400.css";
import "@fontsource/m-plus-rounded-1c/500.css";
import "@fontsource/m-plus-rounded-1c/700.css";
import "@fontsource/m-plus-rounded-1c/800.css";
import "@fontsource/m-plus-rounded-1c/900.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Geeth's Kitchen",
  description: "Nonstop deliciousness, cooked to order.",
  icons: { icon: "/icons/her-192.png", apple: "/icons/her-180.png" },
  appleWebApp: { capable: true, title: "Geeth's Kitchen", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1110",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
