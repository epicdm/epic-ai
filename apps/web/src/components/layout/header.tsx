"use client";

import { UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Bell, Moon, Sun, Search, Zap } from "lucide-react";
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
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <MobileNav />
          <Breadcrumbs />
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Search (Desktop) */}
          <button className="hidden md:flex items-center gap-2 px-4 py-2 text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors">
            <Search className="w-4 h-4" />
            <span>Search...</span>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 rounded-md font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Go Live Button */}
          <button
            type="button"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200"
          >
            <Zap className="w-4 h-4" />
            Go Live
          </button>

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Notifications */}
          <button
            className="relative p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-800" />
          </button>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Org Name (Desktop) */}
          {organizationName && (
            <span className="hidden md:block text-sm font-medium text-slate-600 dark:text-slate-400">
              {organizationName}
            </span>
          )}

          {/* User */}
          <div suppressHydrationWarning>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 rounded-xl",
                },
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
