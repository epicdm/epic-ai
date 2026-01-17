"use client";

/**
 * Welcome Modal Component
 *
 * Shows on first visit to dashboard after onboarding.
 * Explains "One Brain, Many Voices" concept and offers guided tour.
 */

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import {
  Brain,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Phone,
  MessageSquare,
  Mail,
  Share2,
  Target,
  Zap,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
  companyName?: string;
}

/**
 * Animated flywheel graphic showing the self-improving cycle
 */
function FlywheelGraphic() {
  return (
    <div className="relative w-48 h-48 mx-auto my-4">
      {/* Central Brain */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg animate-pulse">
          <Brain className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Orbiting Channels */}
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: "15s" }}>
        {/* Voice */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1">
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center border-2 border-success">
            <Phone className="w-5 h-5 text-success" />
          </div>
        </div>
        {/* Social */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
            <Share2 className="w-5 h-5 text-primary" />
          </div>
        </div>
        {/* Email */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1">
          <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center border-2 border-warning">
            <Mail className="w-5 h-5 text-warning" />
          </div>
        </div>
        {/* Chat */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
          <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center border-2 border-secondary">
            <MessageSquare className="w-5 h-5 text-secondary" />
          </div>
        </div>
      </div>

      {/* Connecting Lines (static circle) */}
      <div className="absolute inset-4 rounded-full border-2 border-dashed border-default-300 opacity-50" />
    </div>
  );
}

/**
 * Feature highlight card
 */
function FeatureHighlight({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-default-50 hover:bg-default-100 transition-colors">
      <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-default-800 text-sm">{title}</h4>
        <p className="text-xs text-default-500">{description}</p>
      </div>
    </div>
  );
}

export function WelcomeModal({
  isOpen,
  onClose,
  onStartTour,
  companyName,
}: WelcomeModalProps) {
  const [showFeatures, setShowFeatures] = useState(false);

  const handleStartTour = () => {
    onClose();
    onStartTour?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        backdrop: "bg-gradient-to-t from-primary/10 to-secondary/10 backdrop-blur-sm",
        base: "border border-default-200",
      }}
      hideCloseButton
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1 items-center text-center pt-6 pb-0">
              <div className="absolute top-3 right-3">
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={onClose}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <h2 className="text-2xl font-bold">
                Welcome to Your Marketing Flywheel
                {companyName && (
                  <span className="block text-lg font-normal text-default-500 mt-1">
                    {companyName}
                  </span>
                )}
              </h2>
            </ModalHeader>

            <ModalBody className="py-4">
              {!showFeatures ? (
                <>
                  {/* Animated Flywheel */}
                  <FlywheelGraphic />

                  {/* Core Concept */}
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                      &quot;One Brain, Many Voices&quot;
                    </h3>
                    <p className="text-default-600 max-w-md mx-auto">
                      Your brand speaks consistently across all channels, powered by AI.
                      Voice calls, social posts, emails, and chat messages all share the
                      same intelligence.
                    </p>
                  </div>

                  {/* Self-Improving Badge */}
                  <div className="bg-gradient-to-r from-success/10 to-primary/10 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <RefreshCw className="w-5 h-5 text-success" />
                      <span className="font-semibold text-default-800">
                        Self-Improving System
                      </span>
                    </div>
                    <p className="text-sm text-default-600">
                      The more you use it, the smarter it gets. Every interaction teaches
                      the AI about your brand and customers.
                    </p>
                  </div>

                  <Button
                    variant="light"
                    className="mx-auto mt-4"
                    size="sm"
                    onPress={() => setShowFeatures(true)}
                  >
                    Learn more about features
                  </Button>
                </>
              ) : (
                <>
                  {/* Feature Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FeatureHighlight
                      icon={<Brain className="w-4 h-4" />}
                      title="Brand Brain"
                      description="Your brand's personality, voice, and values in one place"
                    />
                    <FeatureHighlight
                      icon={<Share2 className="w-4 h-4" />}
                      title="Multi-Channel Publishing"
                      description="Post to all platforms with platform-optimized content"
                    />
                    <FeatureHighlight
                      icon={<Phone className="w-4 h-4" />}
                      title="AI Voice Agents"
                      description="Handle calls with your brand's personality"
                    />
                    <FeatureHighlight
                      icon={<Target className="w-4 h-4" />}
                      title="Lead Management"
                      description="Track and nurture prospects across channels"
                    />
                    <FeatureHighlight
                      icon={<Zap className="w-4 h-4" />}
                      title="Automations"
                      description="Set up cross-channel workflows that run automatically"
                    />
                    <FeatureHighlight
                      icon={<TrendingUp className="w-4 h-4" />}
                      title="Analytics & Learning"
                      description="AI analyzes results and improves over time"
                    />
                  </div>

                  <Button
                    variant="light"
                    className="mx-auto mt-4"
                    size="sm"
                    onPress={() => setShowFeatures(false)}
                  >
                    Back to overview
                  </Button>
                </>
              )}
            </ModalBody>

            <ModalFooter className="flex flex-col sm:flex-row gap-2 justify-center pb-6">
              <Button
                variant="bordered"
                onPress={onClose}
                className="min-w-[150px]"
              >
                Skip, I&apos;ll Explore
              </Button>
              {onStartTour && (
                <Button
                  color="primary"
                  onPress={handleStartTour}
                  endContent={<ArrowRight className="w-4 h-4" />}
                  className="min-w-[150px]"
                >
                  Start Quick Tour
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
