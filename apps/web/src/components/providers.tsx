"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { PostHogProvider } from "@/lib/analytics";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <HeroUIProvider>
          {children}
          <Toaster richColors position="top-right" />
        </HeroUIProvider>
      </NextThemesProvider>
    </PostHogProvider>
  );
}
