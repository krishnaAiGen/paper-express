import type { Metadata } from "next";
import { appConfig } from "@config/app.config";
import "./globals.css";

export const metadata: Metadata = {
  title: appConfig.portalName,
  description: "Format check, camera-ready check and certificates for conference papers",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
