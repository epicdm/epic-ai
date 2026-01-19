"use client";

import { Card, CardBody, Button, Collapse } from "@heroui/react";
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
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{title}</h3>
          <Button 
            isIconOnly 
            variant="light" 
            size="sm"
            onPress={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
        
        <p className="text-sm">{briefExplanation}</p>
        
        <Collapse isOpen={isExpanded}>
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
        </Collapse>
      </CardBody>
    </Card>
  );
}
