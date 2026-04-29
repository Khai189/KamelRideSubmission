import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalDeck Analytics",
  description: "Mock event analytics dashboard built with Next.js and TypeScript."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,168,65,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(13,148,136,0.18),_transparent_30%),linear-gradient(180deg,_#fbf8f1_0%,_#f2eee4_100%)] text-slate-900 antialiased selection:bg-teal-200"
      >
        {children}
      </body>
    </html>
  );
}
