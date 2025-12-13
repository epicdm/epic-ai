"use client";

/**
 * Content Calendar Component - PKG-024
 * Visual week/month view for scheduled content
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Tabs,
  Tab,
  Tooltip,
} from "@heroui/react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { getPlatformColor, getPlatformName } from "@/lib/utils/platform";

interface CalendarItem {
  id: string;
  title: string;
  status: string;
  scheduledFor: string;
  brand: { id: string; name: string };
  platforms: string[];
  variations: Array<{
    id: string;
    platform: string;
    status: string;
    postUrl: string | null;
  }>;
}

interface CalendarData {
  calendar: Record<string, CalendarItem[]>;
  stats: {
    total: number;
    scheduled: number;
    published: number;
    failed: number;
    draft: number;
  };
  dateRange: {
    start: string;
    end: string;
  };
}

interface Props {
  orgId: string;
  brandId?: string;
}

export function ContentCalendar({ orgId, brandId }: Props) {
  const [view, setView] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range based on view
  const getDateRange = () => {
    const now = new Date(currentDate);
    if (view === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start, end };
    } else {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const start = new Date(now);
      start.setDate(now.getDate() + mondayOffset);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    }
  };

  // Fetch calendar data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { start, end } = getDateRange();
        const params = new URLSearchParams({
          orgId,
          view,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });

        if (brandId) {
          params.append("brandId", brandId);
        }

        const response = await fetch(`/api/content/calendar?${params}`);
        if (!response.ok) throw new Error("Failed to fetch calendar data");

        const data = await response.json();
        setCalendarData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, brandId, view, currentDate]);

  // Navigate to previous/next period
  const navigate = (direction: "prev" | "next") => {
    const delta = direction === "prev" ? -1 : 1;
    const newDate = new Date(currentDate);

    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + delta);
    } else {
      newDate.setDate(newDate.getDate() + delta * 7);
    }

    setCurrentDate(newDate);
  };

  // Get days for the current view
  const getDays = () => {
    const { start, end } = getDateRange();
    const days: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case "FAILED":
        return <XCircle className="w-3 h-3 text-red-500" />;
      case "SCHEDULED":
        return <Clock className="w-3 h-3 text-blue-500" />;
      default:
        return <AlertCircle className="w-3 h-3 text-gray-500" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "success";
      case "FAILED":
        return "danger";
      case "SCHEDULED":
        return "primary";
      case "PUBLISHING":
        return "warning";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <div className="text-center text-red-500">
            <XCircle className="w-8 h-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const days = getDays();
  const { start } = getDateRange();

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Content Calendar</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <Tabs
              selectedKey={view}
              onSelectionChange={(key) => setView(key as "week" | "month")}
              size="sm"
            >
              <Tab key="week" title="Week" />
              <Tab key="month" title="Month" />
            </Tabs>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={() => navigate("prev")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-32 text-center">
                {view === "month"
                  ? start.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : `${formatDate(days[0])} - ${formatDate(days[days.length - 1])}`}
              </span>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={() => navigate("next")}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="flat"
              size="sm"
              onPress={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      {calendarData?.stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardBody className="py-3">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold">{calendarData.stats.total}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-3">
              <p className="text-xs text-gray-500">Scheduled</p>
              <p className="text-xl font-bold text-blue-500">
                {calendarData.stats.scheduled}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-3">
              <p className="text-xs text-gray-500">Published</p>
              <p className="text-xl font-bold text-green-500">
                {calendarData.stats.published}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-3">
              <p className="text-xs text-gray-500">Failed</p>
              <p className="text-xl font-bold text-red-500">
                {calendarData.stats.failed}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-3">
              <p className="text-xs text-gray-500">Draft</p>
              <p className="text-xl font-bold text-gray-500">
                {calendarData.stats.draft}
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Calendar Grid */}
      <Card>
        <CardBody>
          <div
            className={`grid gap-2 ${
              view === "month" ? "grid-cols-7" : "grid-cols-7"
            }`}
          >
            {/* Day Headers */}
            {days.map((day) => {
              const dateKey = day.toISOString().split("T")[0];
              const isToday =
                dateKey === new Date().toISOString().split("T")[0];
              const items = calendarData?.calendar[dateKey] || [];

              return (
                <div
                  key={dateKey}
                  className={`min-h-32 border rounded-lg p-2 ${
                    isToday
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium ${
                        isToday ? "text-blue-600" : ""
                      }`}
                    >
                      {day.toLocaleDateString("en-US", {
                        weekday: "short",
                      })}
                    </span>
                    <span
                      className={`text-sm ${
                        isToday
                          ? "bg-blue-500 text-white px-2 py-0.5 rounded-full"
                          : "text-gray-500"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Content Items */}
                  <div className="space-y-1">
                    {items.slice(0, 4).map((item) => (
                      <Tooltip
                        key={item.id}
                        content={
                          <div className="p-2 max-w-xs">
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(item.scheduledFor).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </p>
                            <div className="flex gap-1 mt-1">
                              {item.platforms.map((p) => (
                                <Chip key={p} size="sm" variant="flat">
                                  {getPlatformName(p)}
                                </Chip>
                              ))}
                            </div>
                          </div>
                        }
                      >
                        <div
                          className={`p-1.5 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                            item.status === "PUBLISHED"
                              ? "bg-green-100 dark:bg-green-900/30"
                              : item.status === "FAILED"
                              ? "bg-red-100 dark:bg-red-900/30"
                              : "bg-blue-100 dark:bg-blue-900/30"
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {getStatusIcon(item.status)}
                            <span className="truncate flex-1">
                              {item.title}
                            </span>
                          </div>
                          <div className="flex gap-0.5 mt-0.5">
                            {item.platforms.slice(0, 3).map((p) => (
                              <div
                                key={p}
                                className={`w-2 h-2 rounded-full ${getPlatformColor(
                                  p
                                )}`}
                              />
                            ))}
                          </div>
                        </div>
                      </Tooltip>
                    ))}
                    {items.length > 4 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{items.length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
