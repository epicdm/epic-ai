"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Divider } from "@heroui/react";
import { useAnalytics } from "@/hooks/use-analytics";
import { WhyExplanationCard } from "@/components/ui/why-explanation-card";

type WhyExplanationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  analysis: {
    keyFactors: string[];
    confidenceScore: number;
    dataPoints: {
      label: string;
      value: string | number;
    }[];
  };
};

export function WhyExplanationModal({ isOpen, onClose, title, analysis }: WhyExplanationModalProps) {
  const { track } = useAnalytics();
  
  useEffect(() => {
    if (isOpen) {
      track("why_explanation_viewed", { title });
    }
  }, [isOpen, title, track]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">{title} Analysis</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Key Factors</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {analysis.keyFactors.map((factor, i) => (
                  <li key={i}>{factor}</li>
                ))}
              </ul>
            </div>
            
            <Divider />
            
            <WhyExplanationCard 
              title="Confidence Score"
              briefExplanation={`This recommendation has a confidence score of ${analysis.confidenceScore}%`}
              data={[
                { label: "Score", value: `${analysis.confidenceScore}%` },
                { label: "Threshold", value: "80%" }
              ]}
            />
            
            <Divider />
            
            <div>
              <h4 className="font-medium mb-2">Supporting Data</h4>
              <div className="grid grid-cols-2 gap-4">
                {analysis.dataPoints.map((point, i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">{point.label}</p>
                    <p className="font-medium">{point.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onPress={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
