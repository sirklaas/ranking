import type { Metadata } from "next";
import { Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ranking the Starzzz",
  description: "Interactive voting and ranking game show platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={barlow.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${barlow.className} antialiased`} style={{ fontFamily: 'var(--font-barlow), "Barlow Semi Condensed", sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
