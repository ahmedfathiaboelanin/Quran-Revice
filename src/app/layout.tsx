import type { Metadata, Viewport } from "next";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: {
    default: "ورد الحفظ — مراجعة القرآن الكريم",
    template: "%s | ورد الحفظ",
  },
  description:
    "تطبيق عربي لحفظ القرآن الكريم ومراجعته بالتكرار المتباعد (SM-2)، مع وضع التسميع الغيبي، وتذكير بالورد اليومي، ونسخ احتياطي كامل لتقدمك.",
  applicationName: "ورد الحفظ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ورد الحفظ",
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icons/favicon-32.png"],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b3d2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-dvh antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
