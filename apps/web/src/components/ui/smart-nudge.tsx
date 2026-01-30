"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, AlertCircle, Sparkles, CheckCircle } from "lucide-react";
import { NudgeType } from "@/lib/nudges/nudge-config";
import { useNudge } from "@/hooks/use-nudge";

interface SmartNudgeProps {
  nudge: {
    type: NudgeType;
    title: string;
    message: string;
    action?: {
      label: string;
      onClick: () => void;
    };
    id: string;
  };
}

const iconMap: Record<NudgeType, React.ReactNode> = {
  hint: <Info className="w-5 h-5" />,
  warning: <AlertCircle className="w-5 h-5" />,
  suggestion: <Sparkles className="w-5 h-5" />,
  achievement: <CheckCircle className="w-5 h-5" />
};

const badgeVariantMap: Record<NudgeType, "default" | "secondary" | "destructive" | "outline"> = {
  hint: "default",
  warning: "destructive",
  suggestion: "default",
  achievement: "default"
};

const colorMap: Record<NudgeType, string> = {
  hint: "border-primary",
  warning: "border-destructive",
  suggestion: "border-primary",
  achievement: "border-green-500"
};

const iconColorMap: Record<NudgeType, string> = {
  hint: "text-primary bg-primary/10",
  warning: "text-destructive bg-destructive/10",
  suggestion: "text-primary bg-primary/10",
  achievement: "text-green-500 bg-green-500/10"
};

export function SmartNudge({ nudge }: { nudge: SmartNudgeProps['nudge'] }) {
  const { dismissNudge } = useNudge();

  return (
    <Card className={`border-l-4 ${colorMap[nudge.type]}`}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`p-2 rounded-lg ${iconColorMap[nudge.type]}`}>
          {iconMap[nudge.type]}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{nudge.title}</h3>
            <Badge variant={badgeVariantMap[nudge.type]}>
              {nudge.type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{nudge.message}</p>

          {nudge.action && (
            <div className="flex gap-2 mt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={nudge.action.onClick}
              >
                {nudge.action.label}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNudge(nudge.id)}
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
