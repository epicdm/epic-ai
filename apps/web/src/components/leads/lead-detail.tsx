"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Calendar,
  Edit,
  Trash2,
  Plus,
  MessageSquare,
  PhoneCall,
  FileText,
  Clock,
} from "lucide-react";

interface Lead {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  status: string;
  source: string;
  sourceDetails: string | null;
  estimatedValue: number | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  lastContactedAt: string | null;
  convertedAt: string | null;
  brand: { id: string; name: string } | null;
  activities: Activity[];
  calls: Call[];
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
}

interface Call {
  id: string;
  direction: string;
  status: string;
  createdAt: string;
  agent: { id: string; name: string } | null;
}

const STATUS_OPTIONS = [
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "PROPOSAL", label: "Proposal" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "CONVERTED", label: "Converted" },
  { key: "LOST", label: "Lost" },
];

const ACTIVITY_TYPES = [
  { key: "NOTE", label: "Note" },
  { key: "CALL", label: "Call" },
  { key: "EMAIL", label: "Email" },
  { key: "MEETING", label: "Meeting" },
];

const getStatusBadgeVariant = (
  status: string
): "default" | "secondary" | "outline" | "destructive" => {
  const variants: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    NEW: "default",
    CONTACTED: "secondary",
    QUALIFIED: "outline",
    PROPOSAL: "outline",
    NEGOTIATION: "outline",
    CONVERTED: "default",
    LOST: "destructive",
  };
  return variants[status] || "default";
};

const getActivityIcon = (type: string) => {
  const icons: Record<string, typeof FileText> = {
    NOTE: FileText,
    CALL: PhoneCall,
    EMAIL: Mail,
    MEETING: Calendar,
    STATUS_CHANGE: Clock,
  };
  return icons[type] || MessageSquare;
};

async function fetchLeadData(leadId: string): Promise<Lead> {
  const response = await fetch(`/api/leads/${leadId}`);
  if (!response.ok) throw new Error("Failed to fetch lead");
  return response.json();
}

export function LeadDetail({ leadId }: { leadId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activityType, setActivityType] = useState("NOTE");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");

  const {
    data: lead,
    isLoading,
    error,
  } = useQuery<Lead, Error>({
    queryKey: ["lead", leadId],
    queryFn: () => fetchLeadData(leadId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activityType,
          title: activityTitle,
          description: activityDescription || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to add activity");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      setDialogOpen(false);
      setActivityTitle("");
      setActivityDescription("");
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      router.push("/dashboard/leads");
    },
  });

  function handleDeleteLead() {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    deleteLeadMutation.mutate();
  }

  function handleAddActivity() {
    if (!activityTitle.trim()) return;
    addActivityMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-red-500">
            {error instanceof Error ? error.message : "Lead not found"}
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/leads">Back to Leads</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${lead.firstName} ${lead.lastName || ""}`}
        description={lead.company || lead.email || "Lead details"}
        actions={
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/leads">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dashboard/leads/${leadId}/edit`}>
                <Edit className="w-4 h-4" />
                Edit
              </Link>
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLead}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Card */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center space-y-0">
              <CardTitle className="text-lg">Contact Information</CardTitle>
              <Select
                value={lead.status}
                onValueChange={(val) => updateStatusMutation.mutate(val)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lead.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}
                {lead.company && (
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Company</p>
                      <p className="text-gray-900 dark:text-white">
                        {lead.company}
                        {lead.jobTitle && (
                          <span className="text-gray-500">
                            {" "}
                            - {lead.jobTitle}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {lead.notes && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-sm text-gray-500 mb-2">Notes</p>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {lead.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center space-y-0">
              <CardTitle className="text-lg">Activity</CardTitle>
              <Button
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Add Activity
              </Button>
            </CardHeader>
            <CardContent>
              {lead.activities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No activities yet
                </p>
              ) : (
                <div className="space-y-4">
                  {lead.activities.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div
                        key={activity.id}
                        className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {activity.title}
                          </p>
                          {activity.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {activity.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Current Status</span>
                <Badge variant={getStatusBadgeVariant(lead.status)}>
                  {lead.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Source</span>
                <span className="text-gray-900 dark:text-white">
                  {lead.source.replace("_", " ")}
                </span>
              </div>
              {lead.estimatedValue && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Est. Value</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    ${lead.estimatedValue.toLocaleString()}
                  </span>
                </div>
              )}
              {lead.lastContactedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Last Contact</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(lead.lastContactedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {lead.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Calls */}
          {lead.calls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related Calls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.calls.map((call) => (
                  <div
                    key={call.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {call.direction === "inbound" ? "Inbound" : "Outbound"}
                      </span>
                      <Badge variant="secondary">
                        {call.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(call.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>
              Record a new activity for this lead.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activity-type">Activity Type</Label>
              <Select
                value={activityType}
                onValueChange={(val) => setActivityType(val)}
              >
                <SelectTrigger id="activity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.key} value={type.key}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-title">Title *</Label>
              <Textarea
                id="activity-title"
                placeholder="Brief description of the activity"
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-description">Details (optional)</Label>
              <Textarea
                id="activity-description"
                placeholder="Additional notes..."
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddActivity}>
              Add Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
