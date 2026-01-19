"use client";

import { Card, CardBody, Button, Badge } from "@heroui/react";
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

const colorMap: Record<NudgeType, 'primary' | 'success' | 'danger' | 'warning'> = {
  hint: 'primary',
  warning: 'danger',
  suggestion: 'primary',
  achievement: 'success'
};

export function SmartNudge({ nudge }: { nudge: SmartNudgeProps['nudge'] }) {
  const { dismissNudge } = useNudge();

  return (
    <Card className={`border-l-4 border-${colorMap[nudge.type]}`}>
      <CardBody className="flex items-start gap-3 p-4">
        <div className={`text-${colorMap[nudge.type]} p-2 rounded-lg bg-${colorMap[nudge.type]}/10`}>
          {iconMap[nudge.type]}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{nudge.title}</h3>
            <Badge variant="flat" color={colorMap[nudge.type]} size="sm">
              {nudge.type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{nudge.message}</p>
          
          {nudge.action && (
            <div className="flex gap-2 mt-3">
              <Button 
                variant="flat" 
                size="sm"
                onPress={nudge.action.onClick}
              >
                {nudge.action.label}
              </Button>
              <Button 
                variant="light" 
                size="sm"
                onPress={() => dismissNudge(nudge.id)}
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
