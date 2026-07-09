"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthPage, setIsAuthPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const publicPages = ['/login', '/signup'];
    const currentIsAuth = publicPages.includes(pathname);
    setIsAuthPage(currentIsAuth);

    if (!currentIsAuth && !auth.isLoggedIn()) {
      router.push('/login');
    } else {
      setLoading(false);
    }
  }, [pathname, router]);

  // Don't render dynamic layout until mounted on client to prevent hydration mismatch
  if (!mounted) {
    return (
      <html lang="en">
        <body className="bg-slate-950 text-slate-200" suppressHydrationWarning>
          <div className="min-h-screen flex items-center justify-center text-slate-500">
            Initializing LeadPilot...
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-200" suppressHydrationWarning>
        {isAuthPage ? (
          children
        ) : (
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 pl-64 flex flex-col">
              <Header />
              <main className="p-8 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
