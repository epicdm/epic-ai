"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from "@heroui/react";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHelp } from "@/hooks/use-help";
import { HelpArticle } from "@/lib/help/articles";

export function HelpPanel() {
  const { isOpen, currentArticle, closeHelp } = useHelp();
  
  return (
    <Drawer isOpen={isOpen} onClose={closeHelp} placement="right">
      <DrawerContent>
        <DrawerHeader>
          <h3 className="text-lg font-medium">{currentArticle?.title || 'Help'}</h3>
        </DrawerHeader>
        <DrawerBody>
          {currentArticle ? (
            <div className="prose">
              {currentArticle.content}
              <div className="flex justify-between mt-4">
                <Button 
                  isIconOnly 
                  variant="light" 
                  size="sm"
                  isDisabled={!currentArticle?.relatedArticles?.length}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  isIconOnly 
                  variant="light" 
                  size="sm"
                  isDisabled={!currentArticle?.relatedArticles?.length}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p>Select a help article</p>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
