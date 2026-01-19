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
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Force dynamic rendering for entire app - prevents prerender errors with auth/DB
export const dynamic = 'force-dynamic';

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
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
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
      <ClientLayout />
    </div>
  );
};
