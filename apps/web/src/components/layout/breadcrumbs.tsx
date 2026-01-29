"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { getBreadcrumbs } from "@/lib/routes/route-config";

/**
 * Breadcrumbs component using centralized route config
 * Automatically generates breadcrumb trail based on current pathname
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  // Don't show breadcrumbs on root dashboard or if only one item
  if (breadcrumbs.length <= 1 || pathname === "/dashboard") {
    return null;
  }

  return (
    <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {/* Home / Dashboard link */}
      <Link
        href="/dashboard"
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Dashboard"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const Icon = crumb.icon;

        return (
          <div key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />

            {isLast ? (
              // Current page - not clickable
              <div className="flex items-center gap-1.5 px-1 text-gray-700 dark:text-gray-300 font-medium">
                {Icon && <Icon className="w-4 h-4" />}
                <span>{crumb.name}</span>
              </div>
            ) : (
              // Parent pages - clickable
              <Link
                href={crumb.href}
                className="flex items-center gap-1.5 px-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{crumb.name}</span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
