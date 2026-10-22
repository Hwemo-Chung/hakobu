import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Hakobu — Korea ↔ Japan parcel plan",
  description:
    "One-screen parcel preparation for Korea and Japan: prohibited checks, HS candidates, duty estimates, address formatting, and carrier rate comparison."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
