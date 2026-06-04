import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { FilterProvider } from "@/lib/FilterContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "ICP Lead Intelligence | Job Portal Scraper Dashboard",
  description:
    "Professional B2B lead intelligence platform powered by multi-source job portal scraping. Monitor companies, leads, and signals in real-time.",
  keywords: ["lead intelligence", "ICP scoring", "job portal scraper", "B2B leads"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <FilterProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-y-auto">
                <div className="min-h-full p-6 lg:p-8">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </FilterProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "hsl(222 47% 12%)",
              border: "1px solid hsl(217 30% 22%)",
              color: "hsl(210 40% 96%)",
            },
          }}
        />
      </body>
    </html>
  );
}
