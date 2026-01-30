"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Sparkles,
  Send,
  X,
  Edit3,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";

interface Suggestion {
  id: string;
  content: string;
  imageUrl?: string;
  triggerType: string;
  triggerData?: Record<string, unknown>;
  suggestedPlatforms: string[];
  status: "PENDING" | "APPROVED" | "POSTED" | "DISMISSED";
  postedAt?: string;
  postPlatforms?: string[];
  dismissedAt?: string;
  dismissReason?: string;
  createdAt: string;
}

interface Integration {
  id: string;
  name: string;
  identifier: string;
  picture?: string;
  disabled: boolean;
}

const TRIGGER_LABELS: Record<string, string> = {
  LEAD_CONVERTED: "New Customer",
  FIVE_STAR_CALL: "Great Call",
  WEEKLY_CONTENT: "Weekly Content",
  MANUAL: "Manual",
};

const PLATFORMS: Record<string, { name: string; color: string }> = {
  x: { name: "X", color: "bg-black" },
  twitter: { name: "X", color: "bg-black" },
  linkedin: { name: "LinkedIn", color: "bg-blue-600" },
  facebook: { name: "Facebook", color: "bg-blue-500" },
  instagram: { name: "Instagram", color: "bg-pink-500" },
};

export function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState("pending");
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [editedContent, setEditedContent] = useState("");
  const [posting, setPosting] = useState(false);

  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    try {
      const status = selectedTab === "all" ? "" : selectedTab.toUpperCase();
      const url = `/api/social/suggestions${status ? `?status=${status}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    }
  }, [selectedTab]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch("/api/social/integrations");
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSuggestions(), fetchIntegrations()]);
      setLoading(false);
    };
    load();
  }, [fetchSuggestions, fetchIntegrations]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSuggestions();
    setRefreshing(false);
  };

  const openPostModal = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setSelectedPlatforms(suggestion.suggestedPlatforms);
    setPostModalOpen(true);
  };

  const openEditModal = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setEditedContent(suggestion.content);
    setEditModalOpen(true);
  };

  const handlePost = async () => {
    if (!selectedSuggestion || selectedPlatforms.length === 0) return;

    setPosting(true);
    try {
      const response = await fetch(`/api/social/suggestions/${selectedSuggestion.id}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          scheduleType: "now",
        }),
      });

      if (response.ok) {
        setPostModalOpen(false);
        await fetchSuggestions();
      } else {
        const error = await response.json();
        console.error("Post error:", error.error || "Failed to post");
      }
    } catch (error) {
      console.error("Failed to post:", error);
    } finally {
      setPosting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedSuggestion) return;

    try {
      const response = await fetch(`/api/social/suggestions/${selectedSuggestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      });

      if (response.ok) {
        setEditModalOpen(false);
        await fetchSuggestions();
      } else {
        console.error("Failed to update suggestion");
      }
    } catch (error) {
      console.error("Failed to update:", error);
    }
  };

  const handleDismiss = async (suggestion: Suggestion) => {
    try {
      const response = await fetch(`/api/social/suggestions/${suggestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISMISSED" }),
      });

      if (response.ok) {
        await fetchSuggestions();
      }
    } catch (error) {
      console.error("Failed to dismiss:", error);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending Review</Badge>;
      case "APPROVED":
        return <Badge variant="secondary">Approved</Badge>;
      case "POSTED":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Posted</Badge>;
      case "DISMISSED":
        return <Badge variant="secondary">Dismissed</Badge>;
      default:
        return null;
    }
  };

  const availablePlatforms = integrations
    .filter((int) => !int.disabled)
    .map((int) => int.identifier)
    .filter((v, i, a) => a.indexOf(v) === i);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Suggestions"
        description="AI-generated social media content based on your business activity"
      />

      <div className="flex justify-between items-center">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="posted">Posted</TabsTrigger>
            <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Refresh
          </Button>
          <Link href="/dashboard/social/settings">
            <Button variant="secondary">
              <Settings className="w-4 h-4 mr-1" />
              Autopilot Settings
            </Button>
          </Link>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">No suggestions yet</h3>
            <p className="text-gray-500 mb-4">
              Suggestions are generated automatically when leads convert or calls are completed.
            </p>
            <Link href="/dashboard/social/settings">
              <Button variant="secondary">
                Configure Autopilot
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id}>
              <CardHeader className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {TRIGGER_LABELS[suggestion.triggerType] || suggestion.triggerType}
                  </Badge>
                  {getStatusChip(suggestion.status)}
                  {suggestion.suggestedPlatforms.map((platform) => (
                    <Badge
                      key={platform}
                      variant="secondary"
                      className={`text-white ${PLATFORMS[platform]?.color || "bg-gray-500"}`}
                    >
                      {PLATFORMS[platform]?.name || platform}
                    </Badge>
                  ))}
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(suggestion.createdAt).toLocaleDateString()}
                </span>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">
                  {suggestion.content}
                </p>

                {suggestion.status === "POSTED" && suggestion.postedAt && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Posted on {new Date(suggestion.postedAt).toLocaleDateString()}
                    {suggestion.postPlatforms && ` to ${suggestion.postPlatforms.join(", ")}`}
                  </p>
                )}

                {suggestion.status === "PENDING" && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={() => openPostModal(suggestion)}
                      disabled={availablePlatforms.length === 0}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Post Now
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => openEditModal(suggestion)}
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDismiss(suggestion)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Post Modal */}
      <Dialog open={postModalOpen} onOpenChange={setPostModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post to Social Media</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Content Preview:</p>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedSuggestion?.content}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Select platforms:</p>
                <div className="flex flex-wrap gap-3">
                  {availablePlatforms.map((platform) => (
                    <div key={platform} className="flex items-center gap-2">
                      <Checkbox
                        id={`platform-${platform}`}
                        checked={selectedPlatforms.includes(platform)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPlatforms([...selectedPlatforms, platform]);
                          } else {
                            setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
                          }
                        }}
                      />
                      <Label htmlFor={`platform-${platform}`}>
                        {PLATFORMS[platform]?.name || platform}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPostModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePost}
              disabled={posting || selectedPlatforms.length === 0}
            >
              {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Post Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Suggestion</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
