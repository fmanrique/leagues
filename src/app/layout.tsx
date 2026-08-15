import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "DE/SPORTS", template: "%s · DE/SPORTS" },
  description: "Plataforma de administración de ligas de fútbol — Juega hoy, revívelo siempre",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${montserrat.variable} font-sans`}>{children}</body>
    </html>
  );
}
