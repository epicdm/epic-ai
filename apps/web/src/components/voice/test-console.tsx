"use client";

import { Card, CardBody, Button } from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import { Mic } from "lucide-react";

export function TestConsole() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Test Console"
        description="Test your voice agents directly in your browser."
      />

      <Card>
        <CardBody className="py-16 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mic className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Browser Testing Coming Soon
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Test your voice agents using your microphone directly in the browser.
            No phone number required.
          </p>
          <Button color="primary" size="lg" isDisabled>
            Start Test Call
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Requires microphone permissions
          </p>
        </CardBody>
      </Card>

      {/* Instructions */}
      <Card>
        <CardBody className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            How Browser Testing Works
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Select an Agent
                </p>
                <p className="text-sm text-gray-500">
                  Choose which voice agent you want to test
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Grant Microphone Access
                </p>
                <p className="text-sm text-gray-500">
                  Allow your browser to use your microphone
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Start Talking
                </p>
                <p className="text-sm text-gray-500">
                  Have a real conversation with your AI agent
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
