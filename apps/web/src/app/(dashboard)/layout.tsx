import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { syncUser, getUserOrganization } from "@/lib/sync-user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Sync user and get their organization
  await syncUser();
  const organization = await getUserOrganization();
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Org Name */}
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
                  Epic AI
                </span>
              </Link>

              {organization && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">/</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {organization.name}
                  </span>
                </>
              )}
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/social"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white text-sm font-medium"
              >
                Social
              </Link>
              <Link
                href="/dashboard/voice"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white text-sm font-medium"
              >
                Voice
              </Link>
              <Link
                href="/dashboard/leads"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white text-sm font-medium"
              >
                Leads
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white text-sm font-medium"
              >
                Settings
              </Link>
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                {user?.firstName || user?.emailAddresses[0]?.emailAddress}
              </span>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
