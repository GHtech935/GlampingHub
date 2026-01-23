"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import { ClientI18nProvider } from "@/components/providers/ClientI18nProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/favicon.png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClientI18nProvider>
          <Providers>
            {isAdminRoute ? (
              children
            ) : (
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
                <Toaster />
              </div>
            )}
          </Providers>
        </ClientI18nProvider>
      </body>
    </html>
  );
}
