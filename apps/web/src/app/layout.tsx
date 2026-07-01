import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Paypoq OS",
  description: "Paypoq fabrikasi boshqaruv tizimi",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
