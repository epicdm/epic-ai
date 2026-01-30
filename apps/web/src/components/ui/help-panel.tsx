"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHelp } from "@/hooks/use-help";
import { HelpArticle } from "@/lib/help/articles";

export function HelpPanel() {
  const { isOpen, currentArticle, closeHelp } = useHelp();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closeHelp(); }}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{currentArticle?.title || 'Help'}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {currentArticle ? (
            <div className="prose">
              {currentArticle.content}
              <div className="flex justify-between mt-4">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!currentArticle?.relatedArticles?.length}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!currentArticle?.relatedArticles?.length}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p>Select a help article</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
