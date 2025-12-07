import { Card, CardBody } from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Track your marketing performance across all channels."
      />

      <Card>
        <CardBody className="py-16 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Analytics Coming Soon
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Unified analytics dashboard showing performance across social media,
            voice calls, and lead conversion.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
              <p className="text-sm text-gray-500">Posts this month</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
              <p className="text-sm text-gray-500">Calls this month</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0%</p>
              <p className="text-sm text-gray-500">Conversion rate</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
