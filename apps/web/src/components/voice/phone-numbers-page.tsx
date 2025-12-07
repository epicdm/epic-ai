"use client";

import { Card, CardBody, Button } from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import { Phone, Plus } from "lucide-react";

export function PhoneNumbersPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Phone Numbers"
        description="Manage phone numbers for your voice agents."
        actions={
          <Button color="primary" startContent={<Plus className="w-4 h-4" />} isDisabled>
            Add Number
          </Button>
        }
      />

      <Card>
        <CardBody className="py-16 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Phone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Phone Numbers Coming Soon
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Phone number provisioning will be available soon. You&apos;ll be able to
            purchase numbers from Twilio, Telnyx, or other providers.
          </p>
          <div className="flex flex-col gap-2 max-w-sm mx-auto text-left">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-xl">📞</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Purchase phone numbers
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-xl">🤖</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Assign to voice agents
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-xl">📊</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Track call analytics
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
