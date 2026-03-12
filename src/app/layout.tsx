import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quem conhece a Graca?",
  description: "Um quiz multiplayer em tempo real — diversao garantida!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT">
      <body className="antialiased">{children}</body>
    </html>
  );
}
