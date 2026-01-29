import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  BookOpen,
  MessageSquare,
  Mail,
  ExternalLink,
  ArrowLeft,
  HelpCircle,
  Video,
  FileText,
  Users,
} from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function HelpPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={userId ? "/dashboard" : "/"}
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {userId ? "Dashboard" : "Home"}
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Help & Support
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Get help with Epic AI - Your AI-powered marketing platform
          </p>
        </div>

        {/* Quick Links Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Documentation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Documentation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Comprehensive guides and tutorials to help you get started
                </p>
                <Link
                  href="https://docs.epic.dm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  View Documentation
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Video Tutorials */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Video className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Video Tutorials
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Step-by-step video guides for common tasks
                </p>
                <Link
                  href="https://youtube.com/@epiccommunications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                >
                  Watch Tutorials
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Community */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Community
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Connect with other users and share tips
                </p>
                <Link
                  href="https://community.epic.dm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
                >
                  Join Community
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                How do I connect my social media accounts?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Navigate to Dashboard → Social Accounts → Connect Account. We support Twitter/X,
                LinkedIn, Facebook, and Instagram. Follow the OAuth flow to authorize Epic AI to
                post on your behalf.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                How does the Brand Brain work?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Brand Brain is your AI-powered brand intelligence system. It learns your voice,
                tone, and content preferences to generate posts that sound authentically like you.
                The more you use it, the better it gets at understanding your brand.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Can I schedule posts in advance?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! Use the Content Calendar to schedule posts days, weeks, or months in advance.
                Our AI can also suggest optimal posting times based on your audience engagement patterns.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                How do Voice AI agents work?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Voice AI agents can handle phone calls on your behalf - answering questions,
                booking appointments, and qualifying leads 24/7. Configure them in the Voice AI
                section of your dashboard.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                What analytics are available?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Track impressions, engagement rates, click-through rates, and conversions across
                all your connected platforms. Our AI also provides insights on what content
                performs best for your audience.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Email Support */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Mail className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Email Support
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Get help from our support team
                </p>
                <a
                  href="mailto:support@epic.dm"
                  className="inline-flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium"
                >
                  support@epic.dm
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Live Chat */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <MessageSquare className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Live Chat
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Chat with our team in real-time
                </p>
                <button
                  onClick={() => {
                    // Initialize chat widget (e.g., Intercom, Crisp)
                    if (typeof window !== 'undefined' && (window as any).$crisp) {
                      (window as any).$crisp.push(['do', 'chat:open']);
                    }
                  }}
                  className="inline-flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium"
                >
                  Start Live Chat
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Additional Resources
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="https://epic.dm/blog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Blog
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="https://epic.dm/changelog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Changelog
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="https://status.epic.dm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              System Status
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
