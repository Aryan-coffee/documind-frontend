import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocuMind AI",
  description: "World most advanced document intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{height:"100%"}}>
      <body style={{height:"100%",margin:0,padding:0,background:"#07070f"}}>{children}</body>
    </html>
  );
}
