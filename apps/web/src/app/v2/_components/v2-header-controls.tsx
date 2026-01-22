"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Bell, Moon, Settings as SettingsIcon, Sun } from "lucide-react";

interface HeaderControlsProps {
  showGoLive?: boolean;
  showNotifications?: boolean;
  showSettings?: boolean;
}

export function V2HeaderControls({
  showGoLive = true,
  showNotifications = true,
  showSettings = true,
}: HeaderControlsProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {showGoLive && (
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:shadow-lg"
        >
          Go Live
        </button>
      )}
      {mounted && (
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 text-default-600 hover:text-default-900 rounded-xl border border-default-200 bg-white dark:border-white/10 dark:bg-gray-900 dark:text-gray-200 transition"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      )}
      {showNotifications && (
        <button
          type="button"
          className="relative rounded-xl border border-default-200 p-2 text-default-600 hover:border-default-300 hover:text-default-900"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        </button>
      )}
      {showSettings && (
        <Link
          href="/v2/settings"
          className="inline-flex items-center gap-2 rounded-xl border border-default-200 px-3 py-2 text-sm font-semibold text-default-600 hover:border-primary hover:text-primary transition-colors"
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </Link>
      )}
    </div>
  );
}
