import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "睡眠债务山丘 · Sleep Debt Visualizer",
  description:
    "每天记一下睡了几小时，把睡眠债画成一座会涨会退的山丘，直观看到你欠身体多少觉。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased text-slate-800">{children}</body>
    </html>
  );
}
