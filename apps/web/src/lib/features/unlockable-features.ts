export type UnlockableFeature = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  dependencies: string[];
  unlockConditions: {
    type: 'wizard_completion' | 'manual' | 'event_count';
    value: string | number;
  };
};

export const UNLOCKABLE_FEATURES: UnlockableFeature[] = [
  {
    id: 'content_generator',
    name: 'AI Content Generator',
    description: 'Create posts optimized for each platform',
    icon: '✨',
    dependencies: [],
    unlockConditions: {
      type: 'wizard_completion',
      value: 'onboarding'
    }
  },
  {
    id: 'workflows',
    name: 'Cross-Channel Workflows',
    description: 'Automate content across platforms',
    icon: '🔄',
    dependencies: ['content_generator'],
    unlockConditions: {
      type: 'event_count',
      value: 3 // Create 3 content pieces
    }
  }
];
