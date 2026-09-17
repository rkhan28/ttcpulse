import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "TTC Pulse — Live TTC intelligence for every ride",
  description:
    "Follow Toronto transit with vehicle maps, service alerts, nearby stops and Ask Pulse.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
