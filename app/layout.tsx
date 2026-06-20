import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuperLedger — See how your super really stacks up",
  description:
    "Compare your Australian super fund's net returns and fees against every MySuper product, using official APRA data. Free, no sign-up.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
