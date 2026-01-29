export type NudgeType = "hint" | "warning" | "suggestion" | "achievement";

export interface NudgeConfig {
  id: string;
  type: NudgeType;
  title: string;
  message: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  triggers: {
    idle?: number; // seconds of inactivity
    confusion?: boolean; // rapid back/forward navigation
    error?: string; // specific error pattern
    achievement?: string; // milestone reached
  };
}
