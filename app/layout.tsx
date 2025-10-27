import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import React, { type ReactNode } from "react";
import { headers } from "next/headers";

import { cn } from "@/lib/utils";

import "@/app/globals.css";
import AppSidebar from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import Navbar from "@/components/Navbar";
import { cookies } from "next/headers";
import { getUserFromCookies } from "@/lib/auth/simple-auth";

const GeistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const GeistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const MontserratSerif = Montserrat({
  subsets: ["latin"],
  variable: "--font-serif",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // Получаем текущий путь
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // Маршруты, для которых не нужна проверка авторизации
  const publicRoutes = ["/login", "/logout"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  let user = null;

  // Проверяем авторизацию только для защищенных маршрутов
  if (!isPublicRoute) {
    // ТОЛЬКО чтение из cookies, БЕЗ установки cookies
    user = await getUserFromCookies();
    console.log("user from cookies:", user);
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <html
      lang="en"
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        MontserratSerif.variable,
        "bg-background text-foreground"
      )}
      suppressHydrationWarning
    >
      <body className={isPublicRoute ? "" : "flex"}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider initialUser={user}>
            {isPublicRoute ? (
              // Для публичных маршрутов (login, logout) показываем только children
              children
            ) : (
              // Для защищенных маршрутов показываем полный интерфейс
              <SidebarProvider defaultOpen={defaultOpen}>
                <AppSidebar />
                <main className="w-full ">
                  <Navbar />
                  <div className="px-4">{children}</div>
                </main>
              </SidebarProvider>
            )}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
