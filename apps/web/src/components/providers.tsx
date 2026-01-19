"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { PostHogProvider } from "@/lib/analytics";
import { TourProvider } from "@/context/tour-context";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <TourProvider>
          <HeroUIProvider>
            {children}
            <Toaster richColors position="top-right" />
          </HeroUIProvider>
        </TourProvider>
      </NextThemesProvider>
    </PostHogProvider>
  );
}
