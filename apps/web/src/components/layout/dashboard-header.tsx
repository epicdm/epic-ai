"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardHeaderProps {
  organizationName?: string;
  userName?: string;
}

export function DashboardHeader({
  organizationName,
  userName,
}: DashboardHeaderProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", exact: true },
    { href: "/dashboard/social", label: "Social" },
    { href: "/dashboard/voice", label: "Voice" },
    { href: "/dashboard/leads", label: "Leads" },
    { href: "/dashboard/settings", label: "Settings" },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
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

            {organizationName && (
              <>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {organizationName}
                </span>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href, link.exact)
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {userName && (
              <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                {userName}
              </span>
            )}
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
  );
}
