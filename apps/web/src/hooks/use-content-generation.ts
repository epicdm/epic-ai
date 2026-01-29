"use client";

import { useState } from "react";
import { generateContent } from "@/lib/services/content-factory/core";
import type { ContentRequest, GeneratedContent } from "@/lib/services/content-factory/types";

export function useContentGeneration(brandId: string) {
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generate = async (request: Omit<ContentRequest, 'brandId'>) => {
    setIsLoading(true);
    try {
      const result = await generateContent({
        ...request,
        brandId
      });
      setContent(result);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generate,
    content,
    isLoading
  };
}
