"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Bot,
  Globe,
  Settings,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  LayoutTemplate,
  Star,
  Sparkles,
  Zap,
} from "lucide-react";
import { AutoFillFastButton, NextStepPanel } from "@/components/agent-os";

type WizardStep = "company" | "enrich" | "template" | "agent" | "configure";

interface TemplateRecommendation {
  template: {
    id: string;
    slug: string;
    name: string;
    description: string;
    category: string;
    useCases: string[];
    channels: string[];
    complexity: string;
  };
  matchScore: number;
  reasons: string[];
}

interface ApiResponse<T> {
  data: T | null;
  error?: { code: string; message: string };
  confidence?: Record<string, number>;
  gaps?: Array<{ field: string; reason: string; suggestion?: string }>;
  warnings?: Array<{ code: string; message: string; severity: string }>;
}

function WizardContentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStep = (searchParams.get("step") as WizardStep) || "company";

  const [currentStep, setCurrentStep] = useState<WizardStep>(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [companyForm, setCompanyForm] = useState({
    name: "",
    website: "",
    industry: "",
    description: "",
  });

  const [enrichForm, setEnrichForm] = useState({
    website_url: "",
    hours_of_operation: "",
    service_area: "",
    pricing_model: "",
  });

  const [agentForm, setAgentForm] = useState({
    name: "",
    slug: "",
    description: "",
    templateId: "",
  });

  const [configForm, setConfigForm] = useState({
    agentId: "",
    roleCardName: "",
    roleCardDescription: "",
    primaryObjective: "",
    personalityTone: "professional",
  });

  // Existing data
  const [existingCompany, setExistingCompany] = useState<Record<string, unknown> | null>(null);
  const [existingAgents, setExistingAgents] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [lastResult, setLastResult] = useState<ApiResponse<unknown> | null>(null);

  // Enrichment result and template recommendations
  const [enrichmentResult, setEnrichmentResult] = useState<{
    company_profile?: Record<string, unknown>;
    brand_voice_profile?: Record<string, unknown>;
    gaps?: Array<{ gap_type: string; field_path: string; severity: string; impact: string; recommended_fix: string }>;
    evidence?: Array<{ source_type: string; field_path: string; confidence: number; source_url?: string; extracted_text?: string }>;
    confidence?: Record<string, number>;
  } | null>(null);
  const [templateRecommendations, setTemplateRecommendations] = useState<TemplateRecommendation[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    loadExistingData();
  }, []);

  async function loadExistingData() {
    try {
      const [companyRes, agentsRes] = await Promise.all([
        fetch("/api/agent-os/companies"),
        fetch("/api/agent-os/agents"),
      ]);
      if (companyRes.ok) {
        const data = await companyRes.json();
        if (data.data) {
          setExistingCompany(data.data);
          setCompanyForm({
            name: data.data.name || "",
            website: data.data.website || "",
            industry: data.data.industry || "",
            description: data.data.description || "",
          });
          setEnrichForm((prev) => ({
            ...prev,
            website_url: data.data.website || "",
          }));
        }
      }
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setExistingAgents(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load existing data:", err);
    }
  }

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function fetchTemplateRecommendations(companyProfile: Record<string, unknown>) {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/agent-os/templates/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_profile: companyProfile }),
      });

      if (res.ok) {
        const result = await res.json();
        setTemplateRecommendations(result.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch template recommendations:", err);
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/agent-os/companies", {
        method: existingCompany ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm),
      });

      const result = await res.json();
      setLastResult(result);

      if (!res.ok) {
        setError(result.error?.message || "Failed to save company");
      } else {
        setSuccess("Company profile saved!");
        setExistingCompany(result.data);
        setTimeout(() => setCurrentStep("enrich"), 1000);
      }
    } catch (err) {
      setError("Network error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnrichSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const res = await fetch("/api/agent-os/companies/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: enrichForm.website_url,
          manual_answers: {
            hours_of_operation: enrichForm.hours_of_operation || undefined,
            service_area: enrichForm.service_area || undefined,
            pricing_model: enrichForm.pricing_model || undefined,
          },
        }),
      });

      const result = await res.json();
      setLastResult(result);

      if (!res.ok) {
        setError(result.error?.message || "Failed to enrich");
      } else {
        setSuccess("Company enriched from website!");
        // Store enrichment result
        if (result.data) {
          setEnrichmentResult(result.data);
          // Fetch template recommendations based on enriched company profile
          if (result.data.company_profile) {
            fetchTemplateRecommendations(result.data.company_profile);
          }
        }
        setTimeout(() => setCurrentStep("template"), 1000);
      }
    } catch (err) {
      setError("Network error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);
    setAgentForm((prev) => ({ ...prev, templateId }));
  }

  function handleTemplateContinue() {
    clearMessages();
    if (!selectedTemplateId) {
      setError("Please select a template");
      return;
    }
    setSuccess("Template selected!");
    setTimeout(() => setCurrentStep("agent"), 500);
  }

  async function handleAgentSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const slug = agentForm.slug || agentForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const res = await fetch("/api/agent-os/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentForm.name,
          slug,
          description: agentForm.description || undefined,
          templateId: agentForm.templateId || undefined,
        }),
      });

      const result = await res.json();
      setLastResult(result);

      if (!res.ok) {
        setError(result.error?.message || "Failed to create agent");
      } else {
        setSuccess("Agent created!");
        setConfigForm((prev) => ({ ...prev, agentId: result.data.id }));
        setExistingAgents((prev) => [...prev, result.data]);
        setTimeout(() => setCurrentStep("configure"), 1000);
      }
    } catch (err) {
      setError("Network error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfigSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    const agentId = configForm.agentId;
    if (!agentId) {
      setError("No agent selected");
      setLoading(false);
      return;
    }

    try {
      // Save role-card
      const roleCardRes = await fetch(`/api/agent-os/agents/${agentId}/role-card`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: configForm.roleCardName,
          title: configForm.roleCardName,
          company: companyForm.name || "Unknown",
          mission: configForm.roleCardDescription,
          context: configForm.primaryObjective,
        }),
      });

      if (!roleCardRes.ok) {
        const result = await roleCardRes.json();
        setError(result.error?.message || "Failed to save role-card");
        setLoading(false);
        return;
      }

      // Save personality
      const personalityRes = await fetch(`/api/agent-os/agents/${agentId}/personality`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_tone: configForm.personalityTone.toLowerCase(),
        }),
      });

      const result = await personalityRes.json();
      setLastResult(result);

      if (!personalityRes.ok) {
        setError(result.error?.message || "Failed to save personality");
      } else {
        setSuccess("Agent configured! Redirecting...");
        setTimeout(() => router.push("/dashboard/agent-os"), 1500);
      }
    } catch (err) {
      setError("Network error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const steps: { key: WizardStep; label: string; icon: React.ElementType }[] = [
    { key: "company", label: "Company", icon: Building2 },
    { key: "enrich", label: "Enrich", icon: Globe },
    { key: "template", label: "Template", icon: LayoutTemplate },
    { key: "agent", label: "Agent", icon: Bot },
    { key: "configure", label: "Configure", icon: Settings },
  ];

  const stepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/agent-os"
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Agent OS Wizard
        </h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        {steps.map((step, idx) => (
          <button
            key={step.key}
            type="button"
            onClick={() => setCurrentStep(step.key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              idx === stepIndex
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                : idx < stepIndex
                  ? "text-green-600 dark:text-green-400"
                  : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {idx < stepIndex ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <step.icon className="h-5 w-5" />
            )}
            {step.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 bg-green-50 text-green-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        {currentStep === "company" && (
          <form onSubmit={handleCompanySubmit} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Company Profile
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                className="w-full h-11 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Website
              </label>
              <input
                type="url"
                value={companyForm.website}
                onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                className="w-full h-11 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Industry
              </label>
              <input
                type="text"
                value={companyForm.industry}
                onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                className="w-full h-11 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Technology"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={companyForm.description}
                onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                className="w-full h-24 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                placeholder="Brief description of your company..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-purple-600 px-6 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {existingCompany ? "Update & Continue" : "Save & Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {currentStep === "enrich" && (
          <form onSubmit={handleEnrichSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Enrich from Website
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              We&apos;ll scrape your website to extract company info and brand voice.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Website URL *
              </label>
              <input
                type="url"
                required
                value={enrichForm.website_url}
                onChange={(e) => setEnrichForm({ ...enrichForm, website_url: e.target.value })}
                className="w-full h-11 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="https://example.com"
              />
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Optional Manual Answers (fills gaps)
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Hours of Operation
                  </label>
                  <input
                    type="text"
                    value={enrichForm.hours_of_operation}
                    onChange={(e) =>
                      setEnrichForm({ ...enrichForm, hours_of_operation: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    placeholder="Mon-Fri 9am-5pm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Service Area
                  </label>
                  <input
                    type="text"
                    value={enrichForm.service_area}
                    onChange={(e) =>
                      setEnrichForm({ ...enrichForm, service_area: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    placeholder="Greater Los Angeles Area"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Pricing Model
                  </label>
                  <select
                    value={enrichForm.pricing_model}
                    onChange={(e) =>
                      setEnrichForm({ ...enrichForm, pricing_model: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  >
                    <option value="">-- Select --</option>
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly</option>
                    <option value="subscription">Subscription</option>
                    <option value="custom">Custom Quote</option>
                    <option value="contact">Contact for Pricing</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep("company")}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep("agent")}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-purple-600 px-6 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Enrich & Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        )}

        {currentStep === "template" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Choose a Template
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Based on your company profile, we recommend these agent templates.
              </p>
            </div>

            {/* Show enrichment result summary */}
            {enrichmentResult?.company_profile && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Extracted Company Profile
                </h3>
                <div className="grid gap-2 text-sm">
                  {typeof enrichmentResult.company_profile.name === "string" && enrichmentResult.company_profile.name && (
                    <p><span className="text-slate-500">Name:</span> {enrichmentResult.company_profile.name}</p>
                  )}
                  {typeof enrichmentResult.company_profile.industry === "string" && enrichmentResult.company_profile.industry && (
                    <p><span className="text-slate-500">Industry:</span> {enrichmentResult.company_profile.industry}</p>
                  )}
                  {typeof enrichmentResult.company_profile.company_type === "string" && enrichmentResult.company_profile.company_type && (
                    <p><span className="text-slate-500">Type:</span> {enrichmentResult.company_profile.company_type}</p>
                  )}
                </div>
              </div>
            )}

            {/* Show gaps if any */}
            {enrichmentResult?.gaps && enrichmentResult.gaps.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Missing Information
                </h3>
                <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
                  {enrichmentResult.gaps.slice(0, 3).map((gap, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      <span>{gap.recommended_fix}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Template recommendations */}
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span className="ml-2 text-sm text-slate-500">Loading recommendations...</span>
              </div>
            ) : templateRecommendations.length > 0 ? (
              <div className="grid gap-4">
                {templateRecommendations.map((rec, idx) => (
                  <button
                    key={rec.template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(rec.template.id)}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                      selectedTemplateId === rec.template.id
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700"
                    }`}
                  >
                    {idx === 0 && (
                      <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-purple-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                        <Sparkles className="h-3 w-3" />
                        Best Match
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <LayoutTemplate className="h-5 w-5 text-purple-600" />
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {rec.template.name}
                          </h4>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {rec.template.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                            {rec.template.category}
                          </span>
                          {rec.template.channels.slice(0, 2).map((ch) => (
                            <span key={ch} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                              {ch}
                            </span>
                          ))}
                        </div>
                        {rec.reasons.length > 0 && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                            <span className="font-medium">Why: </span>
                            {rec.reasons.slice(0, 2).join(" • ")}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {Math.round(rec.matchScore * 100)}%
                          </span>
                        </div>
                        {selectedTemplateId === rec.template.id && (
                          <CheckCircle2 className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <LayoutTemplate className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No template recommendations available yet.</p>
                <p className="text-sm">Complete the enrichment step first.</p>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep("enrich")}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep("agent")}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleTemplateContinue}
                  disabled={!selectedTemplateId}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-purple-600 px-6 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === "agent" && (
          <form onSubmit={handleAgentSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Create Agent
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Agent Name *
              </label>
              <input
                type="text"
                required
                value={agentForm.name}
                onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                className="w-full h-11 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Sales Assistant"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Slug (auto-generated if empty)
              </label>
              <input
                type="text"
                value={agentForm.slug}
                onChange={(e) => setAgentForm({ ...agentForm, slug: e.target.value })}
                className="w-full h-11 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="sales-assistant"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={agentForm.description}
                onChange={(e) => setAgentForm({ ...agentForm, description: e.target.value })}
                className="w-full h-24 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                placeholder="What does this agent do?"
              />
            </div>
            <div className="flex justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep("template")}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-purple-600 px-6 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create & Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {currentStep === "configure" && (
          <form onSubmit={handleConfigSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Configure Agent
            </h2>
            {existingAgents.length > 0 && !configForm.agentId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Agent to Configure
                </label>
                <select
                  value={configForm.agentId}
                  onChange={(e) => setConfigForm({ ...configForm, agentId: e.target.value })}
                  className="w-full h-11 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">-- Select an agent --</option>
                  {existingAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {configForm.agentId && (
              <div className="mb-4 space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Configuring agent: <strong>{configForm.agentId}</strong>
                </p>

                {/* Wizard Brain Panel - AI-driven next step recommendations */}
                <div className="border border-blue-200 dark:border-blue-700 rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-2 border-b border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Wizard Brain
                      </span>
                    </div>
                  </div>
                  <NextStepPanel
                    agentId={configForm.agentId}
                    onDidAction={() => {
                      setSuccess("Configuration updated!");
                      loadExistingData();
                    }}
                  />
                </div>

                {/* Auto-Fill Fast Button - Quick setup fallback */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                      <Zap className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Quick Setup with AI
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Let AI configure your agent automatically based on company data.
                        Sets up template, tools, and conversation flow in one click.
                      </p>
                      <AutoFillFastButton
                        agentId={configForm.agentId}
                        onAfter={(snapshot, nextStep) => {
                          setSuccess("Agent auto-configured successfully!");
                          // Refresh the page or show updated config
                          if (nextStep) {
                            router.push(`/dashboard/agent-os/agents/${configForm.agentId}?step=${nextStep}`);
                          }
                        }}
                        variant="default"
                      />
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">
                      Or configure manually
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Role Card
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={configForm.roleCardName}
                    onChange={(e) => setConfigForm({ ...configForm, roleCardName: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    placeholder="Sales Representative"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Role Description
                  </label>
                  <textarea
                    value={configForm.roleCardDescription}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, roleCardDescription: e.target.value })
                    }
                    className="w-full h-20 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none"
                    placeholder="Describe the agent's role..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Primary Objective
                  </label>
                  <input
                    type="text"
                    value={configForm.primaryObjective}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, primaryObjective: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    placeholder="Qualify leads and book demos"
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Personality
              </h3>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Communication Tone
                </label>
                <select
                  value={configForm.personalityTone}
                  onChange={(e) => setConfigForm({ ...configForm, personalityTone: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
            </div>
            <div className="flex justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep("agent")}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !configForm.agentId}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-purple-600 px-6 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Configuration
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Last Result Debug (minimal) */}
      {lastResult && (lastResult.gaps?.length || lastResult.warnings?.length) ? (
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm">
          <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">
            API Response Details
          </h3>
          {lastResult.gaps && lastResult.gaps.length > 0 && (
            <div className="mb-3">
              <p className="text-slate-600 dark:text-slate-400 font-medium">Gaps:</p>
              <ul className="list-disc list-inside text-slate-500 dark:text-slate-400">
                {lastResult.gaps.map((gap, i) => (
                  <li key={i}>
                    {gap.field}: {gap.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {lastResult.warnings && lastResult.warnings.length > 0 && (
            <div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Warnings:</p>
              <ul className="list-disc list-inside text-slate-500 dark:text-slate-400">
                {lastResult.warnings.map((w, i) => (
                  <li key={i}>
                    [{w.severity}] {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function WizardContent() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <WizardContentInner />
    </Suspense>
  );
}
