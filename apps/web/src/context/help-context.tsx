"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { HelpArticle } from "@/lib/help/articles";
import { helpArticles } from "@/lib/help/articles";

type HelpContextType = {
  isOpen: boolean;
  currentArticle: HelpArticle | null;
  openHelp: (articleId: string) => void;
  closeHelp: () => void;
};

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<HelpArticle | null>(null);

  const openHelp = (articleId: string) => {
    const article = helpArticles.find(a => a.id === articleId);
    setCurrentArticle(article || null);
    setIsOpen(true);
  };

  const closeHelp = () => {
    setIsOpen(false);
    setCurrentArticle(null);
  };

  return (
    <HelpContext.Provider value={{ isOpen, currentArticle, openHelp, closeHelp }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}
