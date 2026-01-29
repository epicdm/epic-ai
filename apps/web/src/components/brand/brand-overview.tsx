"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Progress,
  Chip,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import { BrandSetupWizard } from "@/components/brand/wizard";
import {
  Brain,
  Globe,
  FileText,
  Sparkles,
  ArrowRight,
  BookOpen,
  Target,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

interface Brand {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  brain: {
    id: string;
    voiceTone: string | null;
    writingStyle: string | null;
    targetAudience: string | null;
    keyTopics: string[];
    contentPillars: string[];
    learnings: unknown;
    keyMessages: string[];
  } | null;
  contextSources: {
    id: string;
    type: string;
    name: string;
    status: string;
    lastProcessedAt: Date | null;
  }[];
  _count: {
    contextSources: number;
    contentItems: number;
  };
}

interface BrandOverviewProps {
  brand: Brand | null;
  organizationId: string;
}

export function BrandOverview({ brand, organizationId }: BrandOverviewProps) {
  const router = useRouter();

  // No brand exists - show setup wizard
  if (!brand) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Brand Brain"
          description="Set up your brand to start generating AI-powered content."
        />

        <BrandSetupWizard
          organizationId={organizationId}
          onComplete={(brandId) => {
            // Router push happens in the wizard's complete step
            router.refresh();
          }}
        />
      </div>
    );
  }

  // Brand exists - show overview
  const brainCompleteness = calculateBrainCompleteness(brand);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Brand Brain"
        description={`AI-powered content intelligence for ${brand.name}`}
        actions={
          <Button
            color="primary"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={() => {
              // Trigger brain regeneration
              fetch(`/api/brands/${brand.id}/brain/regenerate`, { method: "POST" });
            }}
          >
            Regenerate Brain
          </Button>
        }
      />

      {/* Brain Health */}
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold">{brand.name} Brain</h2>
                <Chip
                  color={brainCompleteness >= 80 ? "success" : brainCompleteness >= 50 ? "warning" : "danger"}
                  variant="flat"
                  size="sm"
                >
                  {brainCompleteness}% Complete
                </Chip>
              </div>
              <Progress
                value={brainCompleteness}
                color={brainCompleteness >= 80 ? "success" : brainCompleteness >= 50 ? "warning" : "danger"}
                className="max-w-md"
                size="sm"
              />
              <p className="text-sm text-gray-500 mt-2">
                {brainCompleteness < 50
                  ? "Add more context sources to improve your brain"
                  : brainCompleteness < 80
                  ? "Your brain is learning! Keep adding context to improve it"
                  : "Your brand brain is well-trained and ready to generate content"}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Quick Setup Steps */}
      {brainCompleteness < 80 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Complete Your Setup</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <SetupStep
              completed={brand.contextSources.length > 0}
              title="Add Context Sources"
              description="Website, documents, or RSS feeds"
              href="/dashboard/brand/context"
            />
            <SetupStep
              completed={!!brand.brain?.voiceTone}
              title="Define Your Voice"
              description="Tone, style, and personality"
              href="/dashboard/brand/voice"
            />
            <SetupStep
              completed={(brand.brain?.contentPillars?.length ?? 0) > 0}
              title="Set Content Strategy"
              description="Topics, pillars, and goals"
              href="/dashboard/brand/strategy"
            />
          </CardBody>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/brand/context">
          <Card isPressable className="hover:shadow-md transition-shadow h-full">
            <CardBody className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Globe className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{brand._count.contextSources}</p>
                  <p className="text-sm text-gray-500">Context Sources</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/content">
          <Card isPressable className="hover:shadow-md transition-shadow h-full">
            <CardBody className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{brand._count.contentItems}</p>
                  <p className="text-sm text-gray-500">Content Items</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/content/generate">
          <Card isPressable className="hover:shadow-md transition-shadow h-full">
            <CardBody className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">Generate</p>
                  <p className="text-sm text-gray-500">AI Content</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* Brain Details */}
      {brand.brain && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voice & Style */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold">Voice & Style</h3>
              </div>
              <Link href="/dashboard/brand/voice">
                <Button size="sm" variant="light">
                  Edit
                </Button>
              </Link>
            </CardHeader>
            <CardBody className="space-y-4">
              {brand.brain.voiceTone && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tone</p>
                  <p className="text-sm">{brand.brain.voiceTone}</p>
                </div>
              )}
              {brand.brain.writingStyle && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Writing Style</p>
                  <p className="text-sm">{brand.brain.writingStyle}</p>
                </div>
              )}
              {brand.brain.targetAudience && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Target Audience</p>
                  <p className="text-sm">{brand.brain.targetAudience}</p>
                </div>
              )}
              {!brand.brain.voiceTone && !brand.brain.writingStyle && (
                <p className="text-sm text-gray-500">
                  No voice settings configured yet.{" "}
                  <Link href="/dashboard/brand/voice" className="text-brand-500 hover:underline">
                    Set up now
                  </Link>
                </p>
              )}
            </CardBody>
          </Card>

          {/* Content Strategy */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold">Content Strategy</h3>
              </div>
              <Link href="/dashboard/brand/strategy">
                <Button size="sm" variant="light">
                  Edit
                </Button>
              </Link>
            </CardHeader>
            <CardBody className="space-y-4">
              {brand.brain.contentPillars && brand.brain.contentPillars.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Content Pillars</p>
                  <div className="flex flex-wrap gap-2">
                    {brand.brain.contentPillars.map((pillar, i) => (
                      <Chip key={i} size="sm" variant="flat">
                        {pillar}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              {brand.brain.keyTopics && brand.brain.keyTopics.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Key Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {brand.brain.keyTopics.slice(0, 6).map((topic, i) => (
                      <Chip key={i} size="sm" variant="bordered">
                        {topic}
                      </Chip>
                    ))}
                    {brand.brain.keyTopics.length > 6 && (
                      <Chip size="sm" variant="bordered">
                        +{brand.brain.keyTopics.length - 6} more
                      </Chip>
                    )}
                  </div>
                </div>
              )}
              {(!brand.brain.contentPillars || brand.brain.contentPillars.length === 0) && (
                <p className="text-sm text-gray-500">
                  No strategy configured yet.{" "}
                  <Link href="/dashboard/brand/strategy" className="text-brand-500 hover:underline">
                    Set up now
                  </Link>
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Recent Context Sources */}
      {brand.contextSources.length > 0 && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold">Recent Context Sources</h3>
            </div>
            <Link href="/dashboard/brand/context">
              <Button size="sm" variant="light" endContent={<ArrowRight className="w-4 h-4" />}>
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {brand.contextSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    {source.type === "WEBSITE" && <Globe className="w-5 h-5 text-gray-500" />}
                    {source.type === "DOCUMENT" && <FileText className="w-5 h-5 text-gray-500" />}
                    {source.type === "RSS" && <BookOpen className="w-5 h-5 text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{source.name}</p>
                    <p className="text-xs text-gray-500">
                      {source.lastProcessedAt
                        ? `Updated ${new Date(source.lastProcessedAt).toLocaleDateString()}`
                        : "Never processed"}
                    </p>
                  </div>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={
                      source.status === "ACTIVE" ? "success" :
                      source.status === "PROCESSING" ? "warning" :
                      source.status === "ERROR" ? "danger" : "default"
                    }
                    startContent={
                      source.status === "ACTIVE" ? <CheckCircle2 className="w-3 h-3" /> :
                      source.status === "PROCESSING" ? <Clock className="w-3 h-3" /> :
                      source.status === "ERROR" ? <AlertCircle className="w-3 h-3" /> : undefined
                    }
                  >
                    {source.status}
                  </Chip>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function SetupStep({
  completed,
  title,
  description,
  href,
}: {
  completed: boolean;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
        completed
          ? "bg-green-50 dark:bg-green-900/20"
          : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          completed ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        {completed ? (
          <CheckCircle2 className="w-5 h-5 text-white" />
        ) : (
          <span className="text-white font-bold text-sm">!</span>
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      {!completed && <ArrowRight className="w-5 h-5 text-gray-400" />}
    </Link>
  );
}

function calculateBrainCompleteness(brand: Brand): number {
  let score = 0;
  const weights = {
    hasContextSources: 30,
    hasVoiceTone: 15,
    hasWritingStyle: 15,
    hasTargetAudience: 10,
    hasContentPillars: 15,
    hasKeyTopics: 15,
  };

  if (brand.contextSources.length > 0) score += weights.hasContextSources;
  if (brand.brain?.voiceTone) score += weights.hasVoiceTone;
  if (brand.brain?.writingStyle) score += weights.hasWritingStyle;
  if (brand.brain?.targetAudience) score += weights.hasTargetAudience;
  if (brand.brain?.contentPillars && brand.brain.contentPillars.length > 0) score += weights.hasContentPillars;
  if (brand.brain?.keyTopics && brand.brain.keyTopics.length > 0) score += weights.hasKeyTopics;

  return score;
}
