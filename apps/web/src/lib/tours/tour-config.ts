export type TourStep = {
  target: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
};

export type TourConfig = {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
};

export const tours: TourConfig[] = [
  {
    id: 'dashboard-overview',
    name: 'Dashboard Overview',
    description: 'Introduction to the main dashboard features',
    steps: [
      {
        target: '#flywheel-health',
        content: 'This shows your overall content flywheel health score',
        placement: 'right'
      },
      {
        target: '#content-preview',
        content: 'Generate and preview content here',
        placement: 'bottom'
      }
    ]
  },
  {
    id: 'content-creation',
    name: 'Content Creation',
    description: 'How to create content using AI',
    steps: [
      {
        target: '#topic-input',
        content: 'Start by entering your content topic here',
        placement: 'bottom'
      }
    ]
  }
];
