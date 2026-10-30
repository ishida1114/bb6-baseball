// app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "監督、プレイボールです！～カレッジガールズ・6ベースボール～",
  description: "6人制の大学女子野球シミュレーションゲーム。春のオープン戦、夏の全国トーナメント、秋の公式リーグ戦を戦い抜き、冬の世代交代・新歓ドラフトを経て常勝チームを作り上げよう！",
  metadataBase: new URL("https://bb6-baseball.vercel.app"),
  openGraph: {
    title: "監督、プレイボールです！～カレッジガールズ・6ベースボール～",
    description: "6人制大学女子野球SLG！春・夏・秋・冬の年間サイクルと世代交代ドラフトを搭載。監督としてチームを勝利へ導こう！",
    url: "https://bb6-baseball.vercel.app",
    siteName: "監督、プレイボールです！",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "監督、プレイボールです！～カレッジガールズ・6ベースボール～",
    description: "6人制大学女子野球SLG！春・夏・秋・冬の年間サイクルを戦い抜け！",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}