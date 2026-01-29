export type HelpArticle = {
  id: string;
  title: string;
  content: string;
  relatedArticles?: string[];
};

export const helpArticles: HelpArticle[] = [
  {
    id: "dashboard-overview",
    title: "Dashboard Overview",
    content: "The dashboard shows key metrics and quick access to features..."
  },
  {
    id: "content-creation",
    title: "Creating Content",
    content: "Use the content creation wizard to generate posts..."
  }
];
