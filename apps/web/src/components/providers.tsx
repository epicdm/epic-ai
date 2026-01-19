"use client";

import { useState } from "react";
import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { PostHogProvider } from "@/lib/analytics";
import { TourProvider } from "@/context/tour-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PostHogProvider>
      <QueryClientProvider client={queryClient}>
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
          <TourProvider>
            <HeroUIProvider>
              {children}
              <Toaster richColors position="top-right" />
            </HeroUIProvider>
          </TourProvider>
        </NextThemesProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
}
