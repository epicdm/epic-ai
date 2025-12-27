"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Chip, Button, Spinner } from "@heroui/react";
import { CheckCircle2, XCircle, Clock, FileText, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ContentItem {
  id: string;
  content: string;
  contentType: string;
  category: string | null;
  status: string;
  approvalStatus: string | null;
  createdAt: string;
  scheduledFor: string | null;
}

interface ApprovalData {
  pendingItems: ContentItem[];
  approvedToday: number;
  rejectedToday: number;
}

export default function ContentApprovalPage() {
  const [data, setData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/content/approval");
        if (!res.ok) {
          throw new Error("Failed to fetch approval queue");
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

  const pendingItems = data?.pendingItems || [];
  const approvedToday = data?.approvedToday || 0;
  const rejectedToday = data?.rejectedToday || 0;

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Approval Queue</h1>
        <p className="text-gray-500 mt-2">
          Review and approve content before publishing
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-500">Pending Approval</p>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{pendingItems.length}</span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-500">Approved Today</p>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{approvedToday}</span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-gray-500">Rejected Today</p>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{rejectedToday}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Content List */}
      <Card>
        <CardHeader className="flex gap-2">
          <FileText className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">Items Pending Review</h3>
            <p className="text-sm text-gray-500">
              {pendingItems.length === 0
                ? "No content awaiting approval"
                : `${pendingItems.length} item${pendingItems.length === 1 ? "" : "s"} need your review`}
            </p>
          </div>
        </CardHeader>
        <CardBody>
          {pendingItems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium">All caught up!</h3>
              <p className="text-gray-500 mt-2">
                No content is waiting for approval right now.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingItems.map((item) => (
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
                        {item.category && (
                          <Chip variant="bordered" size="sm">
                            {item.category}
                          </Chip>
                        )}
                        <Chip color="warning" variant="flat" size="sm">
                          Pending
                        </Chip>
                      </div>
                      <p className="text-sm text-gray-500">
                        Created {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {item.scheduledFor && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        Scheduled for {new Date(item.scheduledFor).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <p className="text-sm line-clamp-3">
                    {item.content}
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" color="primary" className="gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button size="sm" variant="bordered" className="gap-1">
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button size="sm" variant="light">
                      View Details
                    </Button>
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
