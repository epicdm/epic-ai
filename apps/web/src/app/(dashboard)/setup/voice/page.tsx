/**
 * Voice Setup Page
 *
 * Entry point for users who chose "Voice-First Setup" in onboarding.
 * Configures Brand Brain for AI voice agents and phone interactions.
 */

import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { MicIcon, Phone, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Voice Setup | Epic AI",
  description: "Configure your AI voice agents and phone system",
};

export default async function VoiceSetupPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user has completed onboarding and get brand data
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: {
      organization: {
        include: {
          brands: {
            take: 1,
          },
        },
      },
    },
  });

  if (!membership?.organization) {
    throw new Error("Organization not found - please contact support");
  }

  const organization = membership.organization;
  const brand = organization.brands[0];

  if (!brand) {
    throw new Error("Brand not found - please contact support");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-600 rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            Voice-First Setup
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Configure Your AI Voice Agents
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Set up AI-powered phone agents that handle calls, qualify leads, and schedule appointments using your Brand Brain.
          </p>
        </div>

        {/* Setup Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
              <MicIcon className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Voice Agent Configuration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your AI voice agents will use {brand.name}'s Brand Brain for personality and responses
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Phone className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Phone System Integration
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connect your phone numbers and configure call routing
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <MicIcon className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Voice & Personality
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure voice characteristics and conversation style from Brand Brain
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/voice"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
            >
              Go to Voice Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Skip for Now
            </Link>
          </div>
        </div>

        {/* Info */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Voice agents use your Brand Brain to maintain consistent personality across all channels.
          </p>
        </div>
      </div>
    </div>
  );
}
