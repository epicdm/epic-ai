"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { useAnalytics } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type CelebrationType = "confetti" | "toast" | "modal";

type CelebrationContextType = {
  showCelebration: (type: CelebrationType, message?: string) => void;
};

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const { track } = useAnalytics();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [celebrationType, setCelebrationType] = useState<CelebrationType | null>(null);

  const showCelebration = (type: CelebrationType, message = "Completed successfully!") => {
    track("celebration_shown", { type });
    setCelebrationType(type);

    switch (type) {
      case "confetti":
        if (typeof window !== "undefined") {
          import("canvas-confetti").then((module) => {
            module.default({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 }
            });
          });
        }
        toast.success(message);
        break;
      case "toast":
        toast.success(message);
        break;
      case "modal":
        setModalContent(message);
        setModalOpen(true);
        break;
    }
  };

  useEffect(() => {
    if (celebrationType === "modal" && modalOpen) {
      const timer = setTimeout(() => {
        setModalOpen(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [celebrationType, modalOpen]);

  return (
    <CelebrationContext.Provider value={{ showCelebration }}>
      {children}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Success!</DialogTitle>
          </DialogHeader>
          <p>{modalContent}</p>
          <DialogFooter>
            <Button onClick={() => setModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return context;
}
