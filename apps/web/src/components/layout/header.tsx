"use client";

import { UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Bell, Moon, Sun, Search } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import { Breadcrumbs } from "./breadcrumbs";

interface HeaderProps {
  organizationName?: string;
  userName?: string;
}

export function Header({ organizationName }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <MobileNav />
          <Breadcrumbs />
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Search (Desktop) */}
          <button className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <Search className="w-4 h-4" />
            <span>Search...</span>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
              ⌘K
            </kbd>
          </button>

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Notifications */}
          <button className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            {/* Notification badge */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />

          {/* Org Name (Desktop) */}
          {organizationName && (
            <span className="hidden md:block text-sm text-gray-600 dark:text-gray-400">
              {organizationName}
            </span>
          )}

          {/* User */}
          <div suppressHydrationWarning>
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
