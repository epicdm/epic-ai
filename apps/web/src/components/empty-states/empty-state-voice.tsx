"use client";

import Link from "next/link";
import { Card, CardBody, Button } from "@heroui/react";

export function EmptyStateVoice() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Voice AI Agents
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Create AI-powered voice agents to handle calls
        </p>
      </div>

      {/* Empty State */}
      <Card className="max-w-2xl mx-auto">
        <CardBody className="py-16 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🤖</span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Create Your First Voice Agent
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Voice AI agents can answer calls, qualify leads, schedule
            appointments, and more. Set up your first agent in minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              as={Link}
              href="/dashboard/voice/agents/new"
              color="primary"
              size="lg"
            >
              Create Agent
            </Button>
            <Button
              as={Link}
              href="/dashboard/voice/phone-numbers"
              variant="bordered"
              size="lg"
            >
              Get Phone Number
            </Button>
          </div>

          {/* Feature Highlights */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-2xl mb-2 block">📞</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                24/7 Availability
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Never miss a call with always-on AI agents
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-2xl mb-2 block">🎯</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Lead Qualification
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Automatically qualify and route leads
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-2xl mb-2 block">🗣️</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Natural Voice
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Human-like conversations powered by AI
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
