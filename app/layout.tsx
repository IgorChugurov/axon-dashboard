import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import React, { type ReactNode } from "react";
import { headers } from "next/headers";

import { cn } from "@/lib/utils";

import "@/app/globals.css";
import AppSidebar from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ProjectsProvider } from "@/components/providers/ProjectsProvider";
import { ProjectsEventListener } from "@/components/providers/ProjectsEventListener";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster";
import { GlobalLoader } from "@/components/GlobalLoader";
import { cookies } from "next/headers";
import { getServerUser } from "@/lib/supabase/auth";
import { getAllProjectsFromSupabase } from "@/lib/projects/supabase";

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
  let projects: any[] = [];

  // Проверяем авторизацию только для защищенных маршрутов
  if (!isPublicRoute) {
    // Получаем пользователя из Supabase
    user = await getServerUser();

    // Загружаем все проекты для отображения в сайдбаре
    try {
      projects = await getAllProjectsFromSupabase();
      //console.log("[Layout] Loaded projects:", projects.length);
    } catch (error) {
      console.error("[Layout] Error loading projects:", error);
      // Не блокируем рендер, если не удалось загрузить проекты
    }
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
          <QueryProvider>
            <AuthProvider initialUser={user}>
              {isPublicRoute ? (
                // Для публичных маршрутов (login, logout) показываем только children
                children
              ) : (
                // Для защищенных маршрутов показываем полный интерфейс
                <ProjectsProvider initialProjects={projects}>
                  <ProjectsEventListener />
                  <SidebarProvider defaultOpen={defaultOpen}>
                    <AppSidebar projects={projects} />
                    <main className="w-full pb-8 ">
                      <Navbar />
                      <div className="px-4 pt-4">{children}</div>
                    </main>
                  </SidebarProvider>
                </ProjectsProvider>
              )}
              <Toaster />
              <GlobalLoader />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
