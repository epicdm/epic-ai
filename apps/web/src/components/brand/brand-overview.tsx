"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  Palette,
  Users,
  Target,
  BookOpen,
  Globe,
  Sparkles,
  Plus,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfidenceIndicator } from "@/components/ui/confidence-indicator";
import { SectionCard } from "@/components/ui/section-card";
import { MetricCard, MetricCardGrid } from "@/components/ui/metric-card";
import { apiClient, endpoints, queryKeys } from "@/lib/api";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface BrandData {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  brain: {
    id: string;
    voiceTone: string | null;
    writingStyle: string | null;
    targetAudience: string | null;
    keyTopics: string[];
    contentPillars: string[];
    keyMessages: string[];
  } | null;
  audiences: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  competitors: Array<{
    id: string;
    name: string;
    website: string | null;
  }>;
  contextSources: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
  }>;
}

/* -------------------------------------------------------------------------- */
/*                              Component                                     */
/* -------------------------------------------------------------------------- */

export function NewBrandOverview() {
  const { data: brand, isLoading } = useQuery({
    queryKey: queryKeys.brand.current(),
    queryFn: async () => {
      const res = await apiClient.get<BrandData>(endpoints.brand.current());
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });

  /* ------------------------------ Loading state ----------------------------- */

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  /* ----------------------------- Empty / no brand --------------------------- */

  if (!brand) {
    return (
      <Card className="py-16">
        <CardContent className="flex flex-col items-center text-center">
          <Brain className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold">No Brand Configured</h2>
          <p className="mt-2 max-w-sm text-muted-foreground">
            Set up your brand to power AI content generation with your unique
            voice and style.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/brand/voice">
              <Sparkles className="mr-2 h-4 w-4" />
              Set Up Brand
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ----------------------------- Completeness ------------------------------ */

  const brain = brand.brain;

  const brainFields = [
    { label: "Voice Tone", value: brain?.voiceTone },
    { label: "Writing Style", value: brain?.writingStyle },
    { label: "Target Audience", value: brain?.targetAudience },
  ] as const;

  const completedFields = brainFields.filter((f) => f.value).length;

  const brainCompleteness = Math.round(
    ((completedFields +
      (brain?.contentPillars?.length ? 1 : 0) +
      (brain?.keyTopics?.length ? 1 : 0) +
      (brain?.keyMessages?.length ? 1 : 0)) /
      6) *
      100
  );

  /* -------------------------------- Render --------------------------------- */

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{brand.name}</h1>
          <p className="text-muted-foreground">
            {brand.industry && (
              <Badge variant="outline" className="mr-2">
                {brand.industry}
              </Badge>
            )}
            {brand.website && (
              <span className="text-sm">{brand.website}</span>
            )}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/brand/voice">
            <Palette className="mr-2 h-4 w-4" />
            Edit Voice &amp; Tone
          </Link>
        </Button>
      </div>

      {/* ---- Metrics ---- */}
      <MetricCardGrid>
        <MetricCard
          label="Brain Completeness"
          value={`${brainCompleteness}%`}
          icon={<Brain className="h-5 w-5" />}
        />
        <MetricCard
          label="Content Pillars"
          value={brain?.contentPillars?.length ?? 0}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <MetricCard
          label="Audiences"
          value={brand.audiences.length}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          label="Context Sources"
          value={brand.contextSources.length}
          icon={<Globe className="h-5 w-5" />}
        />
      </MetricCardGrid>

      {/* ---- Tabs ---- */}
      <Tabs defaultValue="voice">
        <TabsList>
          <TabsTrigger value="voice">Voice &amp; Tone</TabsTrigger>
          <TabsTrigger value="audiences">Audiences</TabsTrigger>
          <TabsTrigger value="context">Context Sources</TabsTrigger>
        </TabsList>

        {/* ==================== Voice Tab ==================== */}
        <TabsContent value="voice" className="mt-4 space-y-4">
          <SectionCard
            title="Brand Voice"
            description="How your brand communicates"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {brainFields.map((f) => (
                <div key={f.label} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="mt-1 text-sm font-medium">
                    {f.value || "Not set"}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          {brain?.contentPillars && brain.contentPillars.length > 0 && (
            <SectionCard
              title="Content Pillars"
              description="Core themes for your content"
            >
              <div className="flex flex-wrap gap-2">
                {brain.contentPillars.map((pillar) => (
                  <Badge key={pillar} variant="secondary">
                    {pillar}
                  </Badge>
                ))}
              </div>
            </SectionCard>
          )}

          {brain?.keyTopics && brain.keyTopics.length > 0 && (
            <SectionCard
              title="Key Topics"
              description="Topics your brand covers"
            >
              <div className="flex flex-wrap gap-2">
                {brain.keyTopics.map((topic) => (
                  <Badge key={topic} variant="outline">
                    {topic}
                  </Badge>
                ))}
              </div>
            </SectionCard>
          )}
        </TabsContent>

        {/* ==================== Audiences Tab ==================== */}
        <TabsContent value="audiences" className="mt-4">
          <SectionCard
            title="Target Audiences"
            description={`${brand.audiences.length} audience${brand.audiences.length !== 1 ? "s" : ""}`}
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/brand/strategy">
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Link>
              </Button>
            }
          >
            {brand.audiences.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No audiences defined yet
              </p>
            ) : (
              <div className="divide-y">
                {brand.audiences.map((a) => (
                  <div key={a.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium">{a.name}</p>
                    {a.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {a.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ==================== Context Tab ==================== */}
        <TabsContent value="context" className="mt-4">
          <SectionCard
            title="Context Sources"
            description="External data feeding your AI"
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/context">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Source
                </Link>
              </Button>
            }
          >
            {brand.contextSources.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No context sources configured
              </p>
            ) : (
              <div className="divide-y">
                {brand.contextSources.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {s.type}
                      </p>
                    </div>
                    <Badge
                      variant={s.status === "active" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
