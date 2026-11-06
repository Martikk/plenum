import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "Plenum — field service for HVAC & plumbing",
  description: "Dispatch, quotes, work orders and invoice review in one place.",
};

const themeScript = `try{var m=localStorage.getItem('plenum-theme');if(m&&m!=='system')document.documentElement.setAttribute('data-theme',m)}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
