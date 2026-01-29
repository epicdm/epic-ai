"use client";

import { useQuery } from "@tanstack/react-query";
import { getBrandVoice } from "@/lib/services/brand-brain/core";

export function useBrandVoice(brandId: string) {
  return useQuery({
    queryKey: ["brand-voice", brandId],
    queryFn: () => getBrandVoice(brandId),
    enabled: !!brandId
  });
}
