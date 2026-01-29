"use client";

import Link from "next/link";
import { Card, CardBody, Button } from "@heroui/react";

interface OnboardingContentProps {
  firstName: string | null;
}

export function OnboardingContent({ firstName }: OnboardingContentProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="max-w-lg w-full">
        <CardBody className="p-8 text-center">
          <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🎉</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Epic AI!
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Hi {firstName || "there"}! Your account is ready. Let&apos;s set up
            your workspace so you can start automating your marketing.
          </p>

          <div className="space-y-4">
            <Button
              as={Link}
              href="/dashboard/setup"
              color="primary"
              size="lg"
              className="w-full"
            >
              Set Up My Workspace
            </Button>

            <Button
              as={Link}
              href="/dashboard"
              variant="light"
              size="lg"
              className="w-full"
            >
              Skip for now
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            You can always complete setup later from your dashboard.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
