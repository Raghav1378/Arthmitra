import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: '--font-jakarta'
});

const space = Space_Grotesk({ 
  subsets: ["latin"],
  variable: '--font-space'
});

export const metadata: Metadata = {
  title: "ArthMitra - AI Financial Guardian",
  description: "Secure, Smart, and Scalable Financial Orchestrator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${jakarta.variable} ${space.variable}`}>
       <body className="font-sans antialiased text-white bg-[#0a0e1a]">{children}</body>
    </html>
  );
}
