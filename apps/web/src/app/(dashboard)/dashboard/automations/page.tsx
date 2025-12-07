import { Card, CardBody } from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import { Zap } from "lucide-react";

export default function AutomationsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Automations"
        description="Create flywheel automations connecting social, voice, and leads."
      />

      <Card>
        <CardBody className="py-16 text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Automations Coming Soon
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Build powerful automations that connect your social media, voice agents,
            and leads into a seamless flywheel.
          </p>
          <div className="flex flex-col gap-2 max-w-sm mx-auto text-left">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-xl">📱</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Social DM → Voice follow-up
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-xl">📞</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Successful call → Social proof post
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-xl">👥</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                High engagement → Lead capture
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
