"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore, type WizardStep } from "@/stores/agent-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { apiClient, endpoints, unwrapArray } from "@/lib/api";
import {
  Building2,
  Wand2,
  Settings2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

const STEPS: { id: WizardStep; label: string; icon: typeof Building2; description: string }[] = [
  { id: "company", label: "Company", icon: Building2, description: "Select or create company" },
  { id: "template", label: "Template", icon: Wand2, description: "Choose agent template" },
  { id: "configure", label: "Configure", icon: Settings2, description: "Name and channels" },
  { id: "auto-fill", label: "Auto-fill", icon: Sparkles, description: "AI configures modules" },
  { id: "review", label: "Review", icon: CheckCircle2, description: "Review and deploy" },
];

export function WizardContent() {
  const router = useRouter();
  const {
    wizardStep,
    setWizardStep,
    selectedCompanyId,
    setSelectedCompany,
    selectedTemplateSlug,
    setSelectedTemplate,
    resetWizard,
  } = useAgentStore();

  const [agentName, setAgentName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const currentIdx = STEPS.findIndex((s) => s.id === wizardStep);
  const canNext = () => {
    switch (wizardStep) {
      case "company":
        return !!selectedCompanyId;
      case "template":
        return !!selectedTemplateSlug;
      case "configure":
        return agentName.trim().length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentIdx < STEPS.length - 1) {
      setWizardStep(STEPS[currentIdx + 1].id);
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setWizardStep(STEPS[currentIdx - 1].id);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await apiClient.post<{ id: string }>(endpoints.agents.assemble(), {
        name: agentName,
        companyId: selectedCompanyId,
        templateSlug: selectedTemplateSlug,
      });
      if (res.data) {
        resetWizard();
        router.push(`/dashboard/agents/${res.data.id}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Progress steps */}
      <nav className="flex items-center justify-center gap-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = wizardStep === step.id;
          const isPast = idx < currentIdx;
          return (
            <div key={step.id} className="flex items-center gap-2">
              {idx > 0 && (
                <div className={`h-px w-8 ${isPast ? "bg-primary" : "bg-border"}`} />
              )}
              <button
                onClick={() => isPast && setWizardStep(step.id)}
                disabled={!isPast}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isPast
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentIdx].label}</CardTitle>
          <CardDescription>{STEPS[currentIdx].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {wizardStep === "company" && (
            <CompanyStep
              selectedId={selectedCompanyId}
              onSelect={setSelectedCompany}
            />
          )}
          {wizardStep === "template" && (
            <TemplateStep
              selectedSlug={selectedTemplateSlug}
              onSelect={setSelectedTemplate}
            />
          )}
          {wizardStep === "configure" && (
            <ConfigureStep name={agentName} onNameChange={setAgentName} />
          )}
          {wizardStep === "auto-fill" && <AutoFillStep />}
          {wizardStep === "review" && (
            <ReviewStep
              name={agentName}
              templateSlug={selectedTemplateSlug}
              isCreating={isCreating}
              onCreate={handleCreate}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentIdx === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {wizardStep === "review" ? (
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create & Deploy
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canNext()}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// --- Step components ---

type Company = { id: string; name: string; industry?: string };

function CompanyStep({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { data } = useCompanies();
  const companies = data ?? [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select an existing company or create a new one.
      </p>
      {companies.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">No companies yet</p>
          <Button variant="outline" size="sm" onClick={() => onSelect("new")}>
            Create Company
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                selectedId === c.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted"
              }`}
            >
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{c.name}</p>
                {c.industry && (
                  <p className="text-xs text-muted-foreground">{c.industry}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useCompanies() {
  return useQuery({
    queryKey: ["companies", "list"],
    queryFn: async () => {
      const res = await apiClient.get<Company[] | { data: Company[] | null }>(
        endpoints.companies.list()
      );
      if (res.error) throw new Error(res.error.message);
      return unwrapArray<Company>(res.data);
    },
  });
}

function TemplateStep({
  selectedSlug,
  onSelect,
}: {
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choose a template to pre-configure your agent. AI will recommend the best
        match based on your company.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { slug: "sales-sdr", name: "Sales SDR", desc: "Qualify leads, book meetings" },
          { slug: "customer-support", name: "Customer Support", desc: "Answer questions, resolve issues" },
          { slug: "receptionist", name: "Receptionist", desc: "Route calls, take messages" },
          { slug: "appointment-setter", name: "Appointment Setter", desc: "Schedule and confirm appointments" },
        ].map((t) => (
          <button
            key={t.slug}
            onClick={() => onSelect(t.slug)}
            className={`rounded-lg border p-4 text-left transition-colors ${
              selectedSlug === t.slug
                ? "border-primary bg-primary/5"
                : "hover:bg-muted"
            }`}
          >
            <p className="font-medium">{t.name}</p>
            <p className="text-sm text-muted-foreground">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfigureStep({
  name,
  onNameChange,
}: {
  name: string;
  onNameChange: (name: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="agent-name">Agent Name</Label>
        <Input
          id="agent-name"
          placeholder="e.g. Sarah - Sales SDR"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Deployment Channels</Label>
        <div className="flex gap-2">
          <Badge variant="default">Voice (Phone)</Badge>
          <Badge variant="outline">Chat (Coming Soon)</Badge>
          <Badge variant="outline">Email (Coming Soon)</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Voice is the first supported channel. More channels coming soon.
        </p>
      </div>
    </div>
  );
}

function AutoFillStep() {
  return (
    <div className="space-y-4 py-4 text-center">
      <Sparkles className="mx-auto h-12 w-12 text-primary" />
      <div>
        <p className="font-medium">AI Auto-Fill</p>
        <p className="text-sm text-muted-foreground">
          After creation, AI will automatically configure all 9 agent modules
          based on your company data and selected template.
        </p>
      </div>
    </div>
  );
}

function ReviewStep({
  name,
  templateSlug,
  isCreating,
  onCreate,
}: {
  name: string;
  templateSlug: string | null;
  isCreating: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Agent Name</span>
          <span className="font-medium">{name || "Not set"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Template</span>
          <span className="font-medium">{templateSlug || "None"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Channel</span>
          <Badge variant="default">Voice</Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        This will create the agent, run AI auto-fill on all modules, and deploy
        to voice. You can edit any configuration afterwards.
      </p>
    </div>
  );
}
