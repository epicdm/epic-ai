"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useContentGeneration } from "@/hooks/use-content-generation";
import { useBrandVoice } from "@/hooks/use-brand-voice";

export function ContentPreview({ brandId }: { brandId: string }) {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<'twitter' | 'linkedin' | 'facebook' | 'instagram'>('twitter');
  
  const { data: brandVoice } = useBrandVoice(brandId);
  const { generate, content, isLoading } = useContentGeneration(brandId);

  return (
    <Card className="p-4 min-h-[400px]" data-testid="content-preview">
      <CardContent className="space-y-4">
        <h3 className="font-medium">Content Preview</h3>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Content Topic</label>
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <Tabs value={platform} onValueChange={(v) => setPlatform(v as typeof platform)}>
          <TabsList>
            <TabsTrigger value="twitter">Twitter</TabsTrigger>
            <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
            <TabsTrigger value="facebook">Facebook</TabsTrigger>
            <TabsTrigger value="instagram">Instagram</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          onClick={() => generate({ topic, brandVoice, platforms: [platform] })}
          disabled={!topic || isLoading}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Generate Preview
        </Button>
        
        {content && (
          <div className="mt-4 p-4 bg-default-100 rounded-lg min-h-[200px]">
            <h4 className="font-medium mb-2">{platform} Content</h4>
            <p className="whitespace-pre-line">{content.find(c => c.platform === platform)?.content}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
