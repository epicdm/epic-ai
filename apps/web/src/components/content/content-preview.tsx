"use client";

import { useState } from "react";
import { Card, CardBody, Tabs, Tab, Button, Spinner, Textarea } from "@heroui/react";
import { useContentGeneration } from "@/hooks/use-content-generation";
import { useBrandVoice } from "@/hooks/use-brand-voice";

export function ContentPreview({ brandId }: { brandId: string }) {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<'twitter' | 'linkedin' | 'facebook' | 'instagram'>('twitter');
  
  const { data: brandVoice } = useBrandVoice(brandId);
  const { generate, content, isLoading } = useContentGeneration(brandId);

  return (
    <Card className="p-4 min-h-[400px]" data-testid="content-preview">
      <CardBody className="space-y-4">
        <h3 className="font-medium">Content Preview</h3>
        
        <Textarea 
          label="Content Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="min-h-[100px]"
        />
        
        <Tabs 
          selectedKey={platform}
          onSelectionChange={(key) => setPlatform(key as any)}
        >
          <Tab key="twitter" title="Twitter" />
          <Tab key="linkedin" title="LinkedIn" />
          <Tab key="facebook" title="Facebook" />
          <Tab key="instagram" title="Instagram" />
        </Tabs>
        
        <Button 
          onPress={() => generate({ topic, brandVoice, platforms: [platform] })}
          isDisabled={!topic || isLoading}
          endContent={isLoading ? <Spinner /> : null}
        >
          Generate Preview
        </Button>
        
        {content && (
          <div className="mt-4 p-4 bg-default-100 rounded-lg min-h-[200px]">
            <h4 className="font-medium mb-2">{platform} Content</h4>
            <p className="whitespace-pre-line">{content.find(c => c.platform === platform)?.content}</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
