import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Trivia Game Show",
  description: "A two-player trivia game show hosted by an AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
