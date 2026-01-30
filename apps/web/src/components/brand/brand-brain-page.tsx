"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { TemplatePickerButton } from "@/components/brand/template-picker";
import {
  Brain,
  Building,
  Mic,
  Users,
  Target,
  Swords,
  Sparkles,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Wand2,
} from "lucide-react";
import { AIBrandSetup } from "@/components/brand/ai-brand-setup";

interface BrandBrain {
  id: string;
  companyName: string | null;
  description: string | null;
  mission: string | null;
  values: string[];
  uniqueSellingPoints: string[];
  industry: string | null;
  targetMarket: string | null;
  voiceTone: string;
  voiceToneCustom: string | null;
  formalityLevel: number;
  writingStyle: string | null;
  doNotMention: string[];
  mustMention: string[];
  useEmojis: boolean;
  emojiFrequency: string;
  useHashtags: boolean;
  hashtagStyle: string;
  preferredHashtags: string[];
  bannedHashtags: string[];
  ctaStyle: string;
  brandSummary: string | null;
  setupComplete: boolean;
  setupStep: number;
  audiences: Audience[];
  pillars: Pillar[];
  brandCompetitors: Competitor[];
}

interface Audience {
  id: string;
  name: string;
  description: string | null;
  isPrimary: boolean;
  ageRange: string | null;
  interests: string[];
  painPoints: string[];
  goals: string[];
}

interface Pillar {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  topics: string[];
  frequency: number;
  isActive: boolean;
}

interface Competitor {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
  strengths: string[];
  weaknesses: string[];
  differentiators: string[];
}

interface BrandBrainPageProps {
  brandId: string;
  brandName: string;
  initialBrain: BrandBrain | null;
}

const VOICE_TONES = [
  { key: "PROFESSIONAL", label: "Professional", description: "Formal and business-like" },
  { key: "CASUAL", label: "Casual", description: "Friendly and relaxed" },
  { key: "ENTHUSIASTIC", label: "Enthusiastic", description: "Energetic and passionate" },
  { key: "EDUCATIONAL", label: "Educational", description: "Informative and helpful" },
  { key: "WITTY", label: "Witty", description: "Clever and humorous" },
  { key: "INSPIRATIONAL", label: "Inspirational", description: "Motivating and uplifting" },
  { key: "EMPATHETIC", label: "Empathetic", description: "Understanding and supportive" },
  { key: "BOLD", label: "Bold", description: "Confident and assertive" },
];

const EMOJI_FREQUENCIES = [
  { key: "NONE", label: "None" },
  { key: "MINIMAL", label: "Minimal" },
  { key: "MODERATE", label: "Moderate" },
  { key: "FREQUENT", label: "Frequent" },
];

const HASHTAG_STYLES = [
  { key: "NONE", label: "None" },
  { key: "MINIMAL", label: "Minimal (1-2)" },
  { key: "MODERATE", label: "Moderate (3-5)" },
  { key: "MIXED", label: "Mixed" },
  { key: "COMPREHENSIVE", label: "Comprehensive (5+)" },
];

const CTA_STYLES = [
  { key: "none", label: "No CTA" },
  { key: "soft", label: "Soft (subtle suggestions)" },
  { key: "direct", label: "Direct (clear asks)" },
  { key: "urgent", label: "Urgent (time-sensitive)" },
];

export function BrandBrainPage({ brandId, brandName, initialBrain }: BrandBrainPageProps) {
  const [brain, setBrain] = useState<BrandBrain | null>(initialBrain);
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [profile, setProfile] = useState({
    companyName: brain?.companyName || brandName,
    description: brain?.description || "",
    mission: brain?.mission || "",
    values: brain?.values || [],
    uniqueSellingPoints: brain?.uniqueSellingPoints || [],
    industry: brain?.industry || "",
    targetMarket: brain?.targetMarket || "",
  });

  const [voice, setVoice] = useState({
    voiceTone: brain?.voiceTone || "PROFESSIONAL",
    voiceToneCustom: brain?.voiceToneCustom || "",
    formalityLevel: brain?.formalityLevel || 3,
    writingStyle: brain?.writingStyle || "",
    doNotMention: brain?.doNotMention || [],
    mustMention: brain?.mustMention || [],
    useEmojis: brain?.useEmojis ?? true,
    emojiFrequency: brain?.emojiFrequency || "MODERATE",
    useHashtags: brain?.useHashtags ?? true,
    hashtagStyle: brain?.hashtagStyle || "MIXED",
    preferredHashtags: brain?.preferredHashtags || [],
    bannedHashtags: brain?.bannedHashtags || [],
    ctaStyle: brain?.ctaStyle || "soft",
  });

  const [audiences, setAudiences] = useState<Audience[]>(brain?.audiences || []);
  const [pillars, setPillars] = useState<Pillar[]>(brain?.pillars || []);

  // Refetch brain data (used after template apply)
  const refetchBrain = async () => {
    try {
      const res = await fetch(`/api/brand-brain?brandId=${brandId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.brain) {
          setBrain(data.brain);
          setProfile({
            companyName: data.brain.companyName || brandName,
            description: data.brain.description || "",
            mission: data.brain.mission || "",
            values: data.brain.values || [],
            uniqueSellingPoints: data.brain.uniqueSellingPoints || [],
            industry: data.brain.industry || "",
            targetMarket: data.brain.targetMarket || "",
          });
          setVoice({
            voiceTone: data.brain.voiceTone || "PROFESSIONAL",
            voiceToneCustom: data.brain.voiceToneCustom || "",
            formalityLevel: data.brain.formalityLevel || 3,
            writingStyle: data.brain.writingStyle || "",
            doNotMention: data.brain.doNotMention || [],
            mustMention: data.brain.mustMention || [],
            useEmojis: data.brain.useEmojis ?? true,
            emojiFrequency: data.brain.emojiFrequency || "MODERATE",
            useHashtags: data.brain.useHashtags ?? true,
            hashtagStyle: data.brain.hashtagStyle || "MIXED",
            preferredHashtags: data.brain.preferredHashtags || [],
            bannedHashtags: data.brain.bannedHashtags || [],
            ctaStyle: data.brain.ctaStyle || "soft",
          });
          setAudiences(data.brain.audiences || []);
          setPillars(data.brain.pillars || []);
          setMessage({ type: "success", text: "Template applied successfully!" });
          setTimeout(() => setMessage(null), 3000);
        }
      }
    } catch (error) {
      console.error("Error refetching brain:", error);
    }
  };
  const [competitors, setCompetitors] = useState<Competitor[]>(brain?.brandCompetitors || []);

  // New item inputs
  const [newValue, setNewValue] = useState("");
  const [newUSP, setNewUSP] = useState("");
  const [newMustMention, setNewMustMention] = useState("");
  const [newDoNotMention, setNewDoNotMention] = useState("");
  const [newHashtag, setNewHashtag] = useState("");
  const [newBannedHashtag, setNewBannedHashtag] = useState("");

  // Modal states
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [pillarModalOpen, setPillarModalOpen] = useState(false);
  const [competitorModalOpen, setCompetitorModalOpen] = useState(false);
  const [aiSetupModalOpen, setAiSetupModalOpen] = useState(false);

  const [editingAudience, setEditingAudience] = useState<Partial<Audience> | null>(null);
  const [editingPillar, setEditingPillar] = useState<Partial<Pillar> | null>(null);
  const [editingCompetitor, setEditingCompetitor] = useState<Partial<Competitor> | null>(null);

  // Save current tab data
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const data = {
        ...profile,
        ...voice,
      };

      const res = await fetch(`/api/brand-brain?brandId=${brandId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        setBrain(result.brain);
        setMessage({ type: "success", text: "Saved successfully!" });
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Generate AI Summary
  const handleGenerateSummary = async () => {
    setGenerating(true);
    setMessage(null);

    try {
      const res = await fetch("/api/brand-brain/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });

      if (res.ok) {
        const result = await res.json();
        setBrain(result.brain);
        setMessage({ type: "success", text: "Brand summary generated!" });
      } else {
        throw new Error("Failed to generate");
      }
    } catch {
      setMessage({ type: "error", text: "Failed to generate summary. Please try again." });
    } finally {
      setGenerating(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Audience CRUD
  const handleSaveAudience = async () => {
    if (!editingAudience?.name) return;

    try {
      const brainId = brain?.id;
      if (!brainId) {
        // Initialize brain first
        await handleSave();
      }

      const url = editingAudience.id
        ? `/api/brand-brain/audience/${editingAudience.id}`
        : `/api/brand-brain/audience`;

      const res = await fetch(url, {
        method: editingAudience.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingAudience,
          brainId: brain?.id,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (editingAudience.id) {
          setAudiences(audiences.map(a => a.id === result.audience.id ? result.audience : a));
        } else {
          setAudiences([...audiences, result.audience]);
        }
        setAudienceModalOpen(false);
        setEditingAudience(null);
      }
    } catch (error) {
      console.error("Failed to save audience:", error);
    }
  };

  const handleDeleteAudience = async (id: string) => {
    try {
      await fetch(`/api/brand-brain/audience/${id}`, { method: "DELETE" });
      setAudiences(audiences.filter(a => a.id !== id));
    } catch (error) {
      console.error("Failed to delete audience:", error);
    }
  };

  // Pillar CRUD
  const handleSavePillar = async () => {
    if (!editingPillar?.name) return;

    try {
      const url = editingPillar.id
        ? `/api/brand-brain/pillars/${editingPillar.id}`
        : `/api/brand-brain/pillars`;

      const res = await fetch(url, {
        method: editingPillar.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingPillar,
          brainId: brain?.id,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (editingPillar.id) {
          setPillars(pillars.map(p => p.id === result.pillar.id ? result.pillar : p));
        } else {
          setPillars([...pillars, result.pillar]);
        }
        setPillarModalOpen(false);
        setEditingPillar(null);
      }
    } catch (error) {
      console.error("Failed to save pillar:", error);
    }
  };

  const handleDeletePillar = async (id: string) => {
    try {
      await fetch(`/api/brand-brain/pillars/${id}`, { method: "DELETE" });
      setPillars(pillars.filter(p => p.id !== id));
    } catch (error) {
      console.error("Failed to delete pillar:", error);
    }
  };

  // Competitor CRUD
  const handleSaveCompetitor = async () => {
    if (!editingCompetitor?.name) return;

    try {
      const url = "/api/brand-brain/competitors";
      const method = editingCompetitor.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingCompetitor,
          brainId: brain?.id,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (editingCompetitor.id) {
          setCompetitors(competitors.map(c => c.id === result.competitor.id ? result.competitor : c));
        } else {
          setCompetitors([...competitors, result.competitor]);
        }
        setCompetitorModalOpen(false);
        setEditingCompetitor(null);
      }
    } catch (error) {
      console.error("Failed to save competitor:", error);
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    try {
      await fetch(`/api/brand-brain/competitors?id=${id}`, { method: "DELETE" });
      setCompetitors(competitors.filter(c => c.id !== id));
    } catch (error) {
      console.error("Failed to delete competitor:", error);
    }
  };

  // Helper to add items to arrays
  const addToArray = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    inputSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (value.trim()) {
      setter(prev => [...prev, value.trim()]);
      inputSetter("");
    }
  };

  const completeness = calculateCompleteness();

  function calculateCompleteness(): number {
    let score = 0;
    if (profile.companyName) score += 10;
    if (profile.description) score += 10;
    if (profile.values.length > 0) score += 10;
    if (voice.voiceTone) score += 15;
    if (voice.writingStyle) score += 10;
    if (audiences.length > 0) score += 20;
    if (pillars.length > 0) score += 15;
    if (brain?.brandSummary) score += 10;
    return Math.min(100, score);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand Brain"
        description={`Configure AI understanding for ${brandName}`}
        actions={
          <div className="flex items-center gap-2">
            {message && (
              <Badge variant={message.type === "success" ? "default" : "destructive"} className={message.type === "success" ? "bg-green-100 text-green-800" : ""}>
                {message.type === "success" ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <AlertCircle className="w-4 h-4 mr-1" />}
                {message.text}
              </Badge>
            )}
            <Button
              variant="secondary"
              onClick={() => setAiSetupModalOpen(true)}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              AI Auto-Setup
            </Button>
            <TemplatePickerButton brandId={brandId} onTemplateApplied={refetchBrain} />
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        }
      />

      {/* Completeness Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Brain className="w-8 h-8 text-purple-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Brain Training Progress</span>
                <span className="text-sm text-gray-500">{completeness}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${completeness >= 80 ? "bg-green-500" : completeness >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">
            <Building className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="voice">
            <Mic className="w-4 h-4 mr-2" />
            Voice & Tone
          </TabsTrigger>
          <TabsTrigger value="audiences">
            <Users className="w-4 h-4 mr-2" />
            Audiences
          </TabsTrigger>
          <TabsTrigger value="pillars">
            <Target className="w-4 h-4 mr-2" />
            Content Pillars
          </TabsTrigger>
          <TabsTrigger value="competitors">
            <Swords className="w-4 h-4 mr-2" />
            Competitors
          </TabsTrigger>
          <TabsTrigger value="summary">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="mt-4">
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={profile.companyName}
                    onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input
                    value={profile.industry}
                    onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="What does your company do?"
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Mission Statement</Label>
                <Textarea
                  placeholder="What is your company's mission?"
                  value={profile.mission}
                  onChange={(e) => setProfile({ ...profile, mission: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Target Market</Label>
                <Textarea
                  placeholder="Who are your ideal customers?"
                  value={profile.targetMarket}
                  onChange={(e) => setProfile({ ...profile, targetMarket: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Values */}
              <div>
                <label className="text-sm font-medium mb-2 block">Core Values</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add a value..."
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addToArray(newValue, (v) => setProfile({ ...profile, values: typeof v === "function" ? v(profile.values) : v }), setNewValue);
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={() => addToArray(newValue, (v) => setProfile({ ...profile, values: typeof v === "function" ? v(profile.values) : v }), setNewValue)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.values.map((value, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {value}
                      <button onClick={() => setProfile({ ...profile, values: profile.values.filter((_, idx) => idx !== i) })} className="ml-1 hover:text-destructive">&times;</button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* USPs */}
              <div>
                <label className="text-sm font-medium mb-2 block">Unique Selling Points</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add a USP..."
                    value={newUSP}
                    onChange={(e) => setNewUSP(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addToArray(newUSP, (v) => setProfile({ ...profile, uniqueSellingPoints: typeof v === "function" ? v(profile.uniqueSellingPoints) : v }), setNewUSP);
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={() => addToArray(newUSP, (v) => setProfile({ ...profile, uniqueSellingPoints: typeof v === "function" ? v(profile.uniqueSellingPoints) : v }), setNewUSP)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.uniqueSellingPoints.map((usp, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {usp}
                      <button onClick={() => setProfile({ ...profile, uniqueSellingPoints: profile.uniqueSellingPoints.filter((_, idx) => idx !== i) })} className="ml-1 hover:text-destructive">&times;</button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice">
          <Card className="mt-4">
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label>Voice Tone</Label>
                <Select value={voice.voiceTone} onValueChange={(v) => setVoice({ ...voice, voiceTone: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_TONES.map((tone) => (
                      <SelectItem key={tone.key} value={tone.key}>
                        {tone.label} - {tone.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Custom Voice Description (Optional)</Label>
                <Input
                  placeholder="Additional details about your brand voice..."
                  value={voice.voiceToneCustom || ""}
                  onChange={(e) => setVoice({ ...voice, voiceToneCustom: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Formality Level: {voice.formalityLevel}/5
                </label>
                <div className="flex items-center gap-4 max-w-md">
                  <span className="text-xs text-gray-500">Casual</span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={voice.formalityLevel}
                    onChange={(e) => setVoice({ ...voice, formalityLevel: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500">Formal</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Writing Style Guidelines</Label>
                <Textarea
                  placeholder="Describe how content should be written..."
                  value={voice.writingStyle || ""}
                  onChange={(e) => setVoice({ ...voice, writingStyle: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={voice.useEmojis}
                      onCheckedChange={(v) => setVoice({ ...voice, useEmojis: v })}
                    />
                    <Label>Use Emojis</Label>
                  </div>
                  {voice.useEmojis && (
                    <div className="space-y-2">
                      <Label>Emoji Frequency</Label>
                      <Select value={voice.emojiFrequency} onValueChange={(v) => setVoice({ ...voice, emojiFrequency: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EMOJI_FREQUENCIES.map((freq) => (
                            <SelectItem key={freq.key} value={freq.key}>{freq.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={voice.useHashtags}
                      onCheckedChange={(v) => setVoice({ ...voice, useHashtags: v })}
                    />
                    <Label>Use Hashtags</Label>
                  </div>
                  {voice.useHashtags && (
                    <div className="space-y-2">
                      <Label>Hashtag Style</Label>
                      <Select value={voice.hashtagStyle} onValueChange={(v) => setVoice({ ...voice, hashtagStyle: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HASHTAG_STYLES.map((style) => (
                            <SelectItem key={style.key} value={style.key}>{style.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Call-to-Action Style</Label>
                <Select value={voice.ctaStyle} onValueChange={(v) => setVoice({ ...voice, ctaStyle: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CTA_STYLES.map((style) => (
                      <SelectItem key={style.key} value={style.key}>{style.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Must Mention */}
              <div>
                <label className="text-sm font-medium mb-2 block">Key Messages (Must Mention)</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add a key message..."
                    value={newMustMention}
                    onChange={(e) => setNewMustMention(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addToArray(newMustMention, (v) => setVoice({ ...voice, mustMention: typeof v === "function" ? v(voice.mustMention) : v }), setNewMustMention);
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={() => addToArray(newMustMention, (v) => setVoice({ ...voice, mustMention: typeof v === "function" ? v(voice.mustMention) : v }), setNewMustMention)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {voice.mustMention.map((item, i) => (
                    <Badge
                      key={i}
                      className="bg-green-600 hover:bg-green-700 text-white gap-1"
                    >
                      {item}
                      <button onClick={() => setVoice({ ...voice, mustMention: voice.mustMention.filter((_, idx) => idx !== i) })} className="ml-1">&times;</button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Do Not Mention */}
              <div>
                <label className="text-sm font-medium mb-2 block">Topics to Avoid</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add topic to avoid..."
                    value={newDoNotMention}
                    onChange={(e) => setNewDoNotMention(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addToArray(newDoNotMention, (v) => setVoice({ ...voice, doNotMention: typeof v === "function" ? v(voice.doNotMention) : v }), setNewDoNotMention);
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={() => addToArray(newDoNotMention, (v) => setVoice({ ...voice, doNotMention: typeof v === "function" ? v(voice.doNotMention) : v }), setNewDoNotMention)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {voice.doNotMention.map((item, i) => (
                    <Badge
                      key={i}
                      variant="destructive"
                      className="gap-1"
                    >
                      {item}
                      <button onClick={() => setVoice({ ...voice, doNotMention: voice.doNotMention.filter((_, idx) => idx !== i) })} className="ml-1">&times;</button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audiences">
          <Card className="mt-4">
            <CardHeader className="flex justify-between items-center">
              <h3 className="font-semibold">Target Audiences</h3>
              <Button
                size="sm"
                onClick={() => {
                  setEditingAudience({ name: "", description: "", interests: [], painPoints: [], goals: [] });
                  setAudienceModalOpen(true);
                }}
              >
                Add Audience
              </Button>
            </CardHeader>
            <CardContent>
              {audiences.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No audiences defined yet. Add your target audiences to improve content relevance.
                </p>
              ) : (
                <div className="space-y-3">
                  {audiences.map((audience) => (
                    <div
                      key={audience.id}
                      className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{audience.name}</p>
                          {audience.isPrimary && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                        </div>
                        {audience.description && (
                          <p className="text-sm text-gray-500 mt-1">{audience.description}</p>
                        )}
                        {audience.painPoints.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {audience.painPoints.slice(0, 3).map((point, i) => (
                              <Badge key={i} variant="outline">{point}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingAudience(audience);
                            setAudienceModalOpen(true);
                          }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteAudience(audience.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pillars">
          <Card className="mt-4">
            <CardHeader className="flex justify-between items-center">
              <h3 className="font-semibold">Content Pillars</h3>
              <Button
                size="sm"
                onClick={() => {
                  setEditingPillar({ name: "", description: "", topics: [], frequency: 20 });
                  setPillarModalOpen(true);
                }}
              >
                Add Pillar
              </Button>
            </CardHeader>
            <CardContent>
              {pillars.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No content pillars defined yet. Add pillars to guide your content strategy.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pillars.map((pillar) => (
                    <div
                      key={pillar.id}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                      style={{ borderLeftColor: pillar.color || "#7C3AED", borderLeftWidth: 4 }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{pillar.name}</p>
                          {pillar.description && (
                            <p className="text-sm text-gray-500 mt-1">{pillar.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingPillar(pillar);
                              setPillarModalOpen(true);
                            }}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDeletePillar(pillar.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="secondary">{pillar.frequency}% of content</Badge>
                        {!pillar.isActive && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors">
          <Card className="mt-4">
            <CardHeader className="flex justify-between items-center">
              <h3 className="font-semibold">Competitors</h3>
              <Button
                size="sm"
                onClick={() => {
                  setEditingCompetitor({ name: "", website: "", strengths: [], weaknesses: [], differentiators: [] });
                  setCompetitorModalOpen(true);
                }}
              >
                Add Competitor
              </Button>
            </CardHeader>
            <CardContent>
              {competitors.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No competitors defined yet. Add competitors for differentiation insights.
                </p>
              ) : (
                <div className="space-y-3">
                  {competitors.map((competitor) => (
                    <div
                      key={competitor.id}
                      className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <Swords className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{competitor.name}</p>
                        {competitor.website && (
                          <p className="text-sm text-gray-500">{competitor.website}</p>
                        )}
                        {competitor.differentiators.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">How we differ:</p>
                            <div className="flex flex-wrap gap-1">
                              {competitor.differentiators.map((diff, i) => (
                                <Badge key={i} className="bg-green-600 hover:bg-green-700 text-white">{diff}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingCompetitor(competitor);
                            setCompetitorModalOpen(true);
                          }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteCompetitor(competitor.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card className="mt-4">
            <CardHeader className="flex justify-between items-center">
              <h3 className="font-semibold">AI-Generated Brand Summary</h3>
              <Button
                onClick={handleGenerateSummary}
                disabled={generating}
              >
                {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Summary
              </Button>
            </CardHeader>
            <CardContent>
              {brain?.brandSummary ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm">{brain.brandSummary}</div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Summary Yet</h3>
                  <p className="text-gray-500 mb-4">
                    Generate an AI summary based on your brand profile, voice settings, audiences, and pillars.
                  </p>
                  <Button
                    onClick={handleGenerateSummary}
                    disabled={generating}
                  >
                    {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Generate Summary
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Audience Modal */}
      <Dialog open={audienceModalOpen} onOpenChange={setAudienceModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingAudience?.id ? "Edit Audience" : "Add Audience"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Audience Name</Label>
              <Input
                placeholder="e.g., Small Business Owners"
                value={editingAudience?.name || ""}
                onChange={(e) => setEditingAudience({ ...editingAudience, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe this audience segment..."
                value={editingAudience?.description || ""}
                onChange={(e) => setEditingAudience({ ...editingAudience, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editingAudience?.isPrimary || false}
                onCheckedChange={(v) => setEditingAudience({ ...editingAudience, isPrimary: v })}
              />
              <Label>Primary Audience</Label>
            </div>
            <div className="space-y-2">
              <Label>Age Range</Label>
              <Input
                placeholder="e.g., 25-45"
                value={editingAudience?.ageRange || ""}
                onChange={(e) => setEditingAudience({ ...editingAudience, ageRange: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAudienceModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAudience}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pillar Modal */}
      <Dialog open={pillarModalOpen} onOpenChange={setPillarModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPillar?.id ? "Edit Content Pillar" : "Add Content Pillar"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pillar Name</Label>
              <Input
                placeholder="e.g., Product Updates"
                value={editingPillar?.name || ""}
                onChange={(e) => setEditingPillar({ ...editingPillar, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What content falls under this pillar?"
                value={editingPillar?.description || ""}
                onChange={(e) => setEditingPillar({ ...editingPillar, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={editingPillar?.color || "#7C3AED"}
                onChange={(e) => setEditingPillar({ ...editingPillar, color: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Content Frequency: {editingPillar?.frequency || 20}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={editingPillar?.frequency || 20}
                onChange={(e) => setEditingPillar({ ...editingPillar, frequency: parseInt(e.target.value) })}
                className="w-full max-w-md"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPillarModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePillar}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Competitor Modal */}
      <Dialog open={competitorModalOpen} onOpenChange={setCompetitorModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCompetitor?.id ? "Edit Competitor" : "Add Competitor"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Competitor Name</Label>
              <Input
                placeholder="e.g., Acme Corp"
                value={editingCompetitor?.name || ""}
                onChange={(e) => setEditingCompetitor({ ...editingCompetitor, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                placeholder="https://competitor.com"
                value={editingCompetitor?.website || ""}
                onChange={(e) => setEditingCompetitor({ ...editingCompetitor, website: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this competitor..."
                value={editingCompetitor?.description || ""}
                onChange={(e) => setEditingCompetitor({ ...editingCompetitor, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCompetitorModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCompetitor}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Auto-Setup Modal */}
      <Dialog open={aiSetupModalOpen} onOpenChange={setAiSetupModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-500" />
            AI Auto-Setup
          </DialogTitle></DialogHeader>
          <div className="py-4">
            <AIBrandSetup
              brandId={brandId}
              onComplete={() => {
                setAiSetupModalOpen(false);
                refetchBrain();
              }}
              onSkip={() => setAiSetupModalOpen(false)}
              showSkip={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
