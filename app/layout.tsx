import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "愛着スタイル診断（45問）",
  description: "2択×45問でA/B/C/Dスコアを算出する愛着スタイル診断",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

