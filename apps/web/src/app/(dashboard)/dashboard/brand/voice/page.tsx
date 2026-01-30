"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Sparkles, Volume2 } from "lucide-react";

interface BrandBrain {
  id: string;
  voiceTone: string | null;
  voiceToneCustom: string | null;
  formalityLevel: number | null;
  writingStyle: string | null;
  ctaStyle: string | null;
  useEmojis: boolean;
  emojiFrequency: string | null;
  useHashtags: boolean;
  hashtagStyle: string | null;
  doNotMention: string[];
  mustMention: string[];
}

export const dynamic = 'force-dynamic';

export default function BrandVoicePage() {
  const [brandBrain, setBrandBrain] = useState<BrandBrain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/brand-brain/current");
        if (!res.ok) {
          throw new Error("Failed to fetch brand brain");
        }
        const data = await res.json();
        setBrandBrain(data.brain);
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !brandBrain) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <Card>
          <CardContent>
            <p className="text-center text-gray-500">
              {error || "No brand brain found. Please set up your brand first."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Voice & Style</h1>
        <p className="text-gray-500 mt-2">
          Define how your brand communicates across all channels
        </p>
      </div>

      <Tabs aria-label="Voice settings tabs" className="w-full">
        <TabsTrigger value="tone">
          <Card className="mt-4">
            <CardHeader className="flex gap-2">
              <Volume2 className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Voice Tone</h3>
                <p className="text-sm text-gray-500">
                  The emotional quality and personality of your brand&apos;s communication
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Primary Tone</label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" variant="secondary">
                      {brandBrain.voiceTone || "Professional"}
                    </Badge>
                    {brandBrain.voiceToneCustom && (
                      <Badge variant="outline">
                        {brandBrain.voiceToneCustom}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Formality Level</label>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(brandBrain.formalityLevel || 3) * 20}%` }} />
            </div>
                    <span className="text-sm text-gray-500">
                      {brandBrain.formalityLevel || 3}/5
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsTrigger>

        <TabsTrigger value="style">
          <Card className="mt-4">
            <CardHeader className="flex gap-2">
              <MessageSquare className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Writing Style</h3>
                <p className="text-sm text-gray-500">
                  How your brand structures and presents written content
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Style Description</label>
                <p className="text-gray-500">
                  {brandBrain.writingStyle || "No writing style defined yet."}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">CTA Style</label>
                <Badge variant="secondary" variant="secondary">
                  {brandBrain.ctaStyle || "Direct"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsTrigger>

        <TabsTrigger value="preferences">
          <Card className="mt-4">
            <CardHeader className="flex gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Content Preferences</h3>
                <p className="text-sm text-gray-500">
                  Fine-tune how content is generated for your brand
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emoji Usage</label>
                  <div className="flex items-center gap-2">
                    <Badge color={brandBrain.useEmojis ? "success" : "default"} variant="secondary">
                      {brandBrain.useEmojis ? "Enabled" : "Disabled"}
                    </Badge>
                    {brandBrain.useEmojis && brandBrain.emojiFrequency && (
                      <span className="text-sm text-gray-500">
                        ({brandBrain.emojiFrequency} frequency)
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hashtag Usage</label>
                  <div className="flex items-center gap-2">
                    <Badge color={brandBrain.useHashtags ? "success" : "default"} variant="secondary">
                      {brandBrain.useHashtags ? "Enabled" : "Disabled"}
                    </Badge>
                    {brandBrain.hashtagStyle && (
                      <span className="text-sm text-gray-500">
                        ({brandBrain.hashtagStyle})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {brandBrain.doNotMention && brandBrain.doNotMention.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Do Not Mention</label>
                  <div className="flex flex-wrap gap-2">
                    {brandBrain.doNotMention.map((item: string, i: number) => (
                      <Badge key={i} variant="destructive" variant="secondary" >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {brandBrain.mustMention && brandBrain.mustMention.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Must Mention</label>
                  <div className="flex flex-wrap gap-2">
                    {brandBrain.mustMention.map((item: string, i: number) => (
                      <Badge key={i}  variant="secondary" >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsTrigger>
      </Tabs>
    </div>
  );
}
