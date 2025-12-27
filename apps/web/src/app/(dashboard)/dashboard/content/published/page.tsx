"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import { CheckCircle2, ExternalLink, BarChart3, Calendar, Heart, MessageCircle, Share2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface PublishedItem {
  id: string;
  content: string;
  contentType: string;
  category: string | null;
  status: string;
  publishedAt: string | null;
  publishedUrl: string | null;
  publishedPlatform: string | null;
  analytics: {
    impressions: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
  } | null;
}

interface PublishedData {
  publishedItems: PublishedItem[];
  totalPublished: number;
  thisWeek: number;
  totalImpressions: number;
  avgEngagement: number;
}

export default function PublishedContentPage() {
  const [data, setData] = useState<PublishedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/content/published");
        if (!res.ok) {
          throw new Error("Failed to fetch published content");
        }
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <Card>
          <CardBody>
            <p className="text-center text-gray-500">{error}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const publishedItems = data?.publishedItems || [];
  const totalPublished = data?.totalPublished || 0;
  const thisWeek = data?.thisWeek || 0;
  const totalImpressions = data?.totalImpressions || 0;
  const avgEngagement = data?.avgEngagement || 0;

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Published Content</h1>
        <p className="text-gray-500 mt-2">
          View and track your published content across all platforms
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-500">Total Published</p>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{totalPublished}</span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-500">This Week</p>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{thisWeek}</span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-500">Total Impressions</p>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{totalImpressions}</span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-500">Avg. Engagement</p>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{avgEngagement}%</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Content List */}
      <Card>
        <CardHeader className="flex gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div>
            <h3 className="font-semibold">Published Posts</h3>
            <p className="text-sm text-gray-500">
              {publishedItems.length === 0
                ? "No content has been published yet"
                : `${publishedItems.length} post${publishedItems.length === 1 ? "" : "s"} published`}
            </p>
          </div>
        </CardHeader>
        <CardBody>
          {publishedItems.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No published content yet</h3>
              <p className="text-gray-500 mt-2">
                Content will appear here once it&apos;s been published.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {publishedItems.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Chip color="secondary" variant="flat" size="sm">
                          {item.contentType}
                        </Chip>
                        {item.publishedPlatform && (
                          <Chip variant="bordered" size="sm">
                            {item.publishedPlatform}
                          </Chip>
                        )}
                        {item.category && (
                          <Chip variant="bordered" size="sm">
                            {item.category}
                          </Chip>
                        )}
                        <Chip color="success" variant="flat" size="sm">
                          Published
                        </Chip>
                      </div>
                      {item.publishedAt && (
                        <p className="text-sm text-gray-500">
                          Published {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
                          {" "}({format(new Date(item.publishedAt), "MMM d, yyyy 'at' h:mm a")})
                        </p>
                      )}
                    </div>
                    {item.publishedUrl && (
                      <a
                        href={item.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        View Post <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-sm line-clamp-3">
                    {item.content}
                  </p>
                  {/* Analytics */}
                  <div className="flex items-center gap-6 pt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span>{item.analytics?.likes || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{item.analytics?.comments || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="h-4 w-4" />
                      <span>{item.analytics?.shares || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      <span>{item.analytics?.impressions || 0} impressions</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
