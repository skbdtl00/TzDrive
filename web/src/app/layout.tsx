import type { Metadata } from "next";
import { Anuphan } from "next/font/google";
import "./globals.css";

const anuphan = Anuphan({
  variable: "--font-anuphan",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "TzDrive แดชบอร์ด",
  description: "จัดการไฟล์ด้วยพื้นที่จัดเก็บ Local หรือ S3 พร้อมโควตาต่อผู้ใช้",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${anuphan.variable} font-sans antialiased bg-gradient-to-br from-white via-emerald-50 to-green-100 text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
