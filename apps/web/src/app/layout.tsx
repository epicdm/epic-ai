import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";
import { FeatureUnlockProvider } from "@/context/feature-unlock-context";
import { NudgeProvider } from "@/context/nudge-context";
import { useNudge } from "@/hooks/use-nudge";
import { SmartNudge } from "@/components/ui/smart-nudge";
import { CelebrationProvider } from "@/components/ui/celebration";
import { CommandPalette } from "@/components/ui/command-palette";
import { HelpProvider } from "@/context/help-context";
import { Suspense } from "react";

// Force dynamic rendering to prevent prerender issues with tenant/brand context
export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Epic AI - AI Marketing Platform",
  description:
    "Social media management and voice AI agents in one platform. From first impression to closed deal — all automated.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Skip Clerk initialization in E2E test mode (auth is bypassed server-side)
  // Check both NEXT_PUBLIC_ (client) and server-side env vars for reliability
  const isE2EMode = process.env.NEXT_PUBLIC_E2E_UAT_BYPASS === "true" || process.env.E2E_UAT_BYPASS === "true";

  const content = (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
          <FeatureUnlockProvider>
            <NudgeProvider>
              <CelebrationProvider>
                <HelpProvider>
                  {children}
                </HelpProvider>
              </CelebrationProvider>
            </NudgeProvider>
          </FeatureUnlockProvider>
        </Providers>
      </body>
    </html>
  );

  // In E2E mode, use ClerkProvider with `dynamic` prop so it does NOT require
  // clerkMiddleware headers during SSR. Middleware skips clerkMiddleware to avoid
  // Clerk's dev-browser redirect on custom domains.
  if (isE2EMode) {
    return (
      <ClerkProvider
        dynamic
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/sign-up/welcome"
      >
        {content}
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/sign-up/welcome"
    >
      {content}
    </ClerkProvider>
  );
}

export const ClientRootLayout = () => {
  const { nudges } = useNudge();

  return (
    <div className="fixed bottom-4 right-4 space-y-3 z-50">
      {nudges.map(nudge => (
        <SmartNudge key={nudge.id} nudge={nudge} />
      ))}
      <CommandPalette />
    </div>
  );
};
