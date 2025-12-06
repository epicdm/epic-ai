import Link from "next/link";
import { Button } from "@heroui/react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
          Epic AI
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl">
          AI-powered marketing platform combining social media management
          and voice AI agents. From first impression to closed deal — all automated.
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            as={Link}
            href="/login"
            color="primary"
            size="lg"
          >
            Get Started
          </Button>
          <Button
            as={Link}
            href="/demo"
            variant="bordered"
            size="lg"
          >
            Watch Demo
          </Button>
        </div>
      </div>
    </main>
  );
}
