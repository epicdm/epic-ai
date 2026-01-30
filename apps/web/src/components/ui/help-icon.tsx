"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useHelp } from "@/hooks/use-help";

export function HelpIcon({ articleId }: { articleId: string }) {
  const { openHelp } = useHelp();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openHelp(articleId)}
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Click for help</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
