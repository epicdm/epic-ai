"use client";

import { Button, Tooltip } from "@heroui/react";
import { HelpCircle } from "lucide-react";
import { useHelp } from "@/hooks/use-help";

export function HelpIcon({ articleId }: { articleId: string }) {
  const { openHelp } = useHelp();
  
  return (
    <Tooltip content="Click for help">
      <Button 
        isIconOnly 
        variant="light" 
        size="sm"
        onPress={() => openHelp(articleId)}
      >
        <HelpCircle className="w-4 h-4" />
      </Button>
    </Tooltip>
  );
}
