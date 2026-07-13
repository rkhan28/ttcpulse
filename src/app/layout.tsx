import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "TTC Pulse — Live TTC intelligence for every ride",
  description:
    "A premium live TTC companion: live vehicles, routes, alerts, nearby stops, commute status, and an AI assistant called Ask Pulse.",
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
