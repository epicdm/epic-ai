"use client";

import Link from "next/link";
import { Button } from "@heroui/react";

export function LandingHero() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
            Epic AI
          </span>
          <div className="flex items-center gap-4">
            <Button as={Link} href="/sign-in" variant="light">
              Sign In
            </Button>
            <Button as={Link} href="/sign-up" color="primary">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            AI Marketing Engine
            <span className="block bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              From Social to Sale
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Social media management and voice AI agents in one platform. From
            first impression to closed deal — all automated.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button as={Link} href="/sign-up" color="primary" size="lg">
              Start Free Trial
            </Button>
            <Button as={Link} href="#demo" variant="bordered" size="lg">
              Watch Demo
            </Button>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            No credit card required - 14-day free trial
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Social Media
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Schedule and publish to 20+ platforms. AI generates content that
              matches your brand voice.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Voice AI Agents
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              AI agents that make and receive calls. Book appointments, qualify
              leads, provide support.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">🔄</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              The Flywheel
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Social attracts leads, voice converts them, success stories become
              content. Fully automated.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>© 2024 Epic AI. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
