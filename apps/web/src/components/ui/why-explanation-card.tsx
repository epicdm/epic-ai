"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type WhyExplanationCardProps = {
  title: string;
  briefExplanation: string;
  detailedExplanation?: string;
  data?: {
    label: string;
    value: string | number;
  }[];
};

export function WhyExplanationCard({
  title,
  briefExplanation,
  detailedExplanation,
  data
}: WhyExplanationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{title}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>

        <p className="text-sm">{briefExplanation}</p>

        {isExpanded && (
          <div className="mt-3 space-y-3">
            {detailedExplanation && (
              <p className="text-sm text-muted-foreground">{detailedExplanation}</p>
            )}

            {data && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {data.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
