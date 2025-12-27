"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Progress,
  Chip,
  Input,
  Textarea,
  Select,
  SelectItem,
  Slider,
  Switch,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
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
} from "lucide-react";

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
  const audienceModal = useDisclosure();
  const pillarModal = useDisclosure();
  const competitorModal = useDisclosure();

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
        audienceModal.onClose();
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
        pillarModal.onClose();
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
        competitorModal.onClose();
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
              <Chip
                color={message.type === "success" ? "success" : "danger"}
                variant="flat"
                startContent={message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              >
                {message.text}
              </Chip>
            )}
            <TemplatePickerButton brandId={brandId} onTemplateApplied={refetchBrain} />
            <Button
              color="primary"
              startContent={<Save className="w-4 h-4" />}
              onPress={handleSave}
              isLoading={saving}
            >
              Save Changes
            </Button>
          </div>
        }
      />

      {/* Completeness Progress */}
      <Card>
        <CardBody className="p-4">
          <div className="flex items-center gap-4">
            <Brain className="w-8 h-8 text-purple-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Brain Training Progress</span>
                <span className="text-sm text-gray-500">{completeness}%</span>
              </div>
              <Progress
                value={completeness}
                color={completeness >= 80 ? "success" : completeness >= 50 ? "warning" : "danger"}
                size="sm"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        color="primary"
        variant="underlined"
      >
        <Tab
          key="profile"
          title={
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span>Profile</span>
            </div>
          }
        >
          <Card className="mt-4">
            <CardBody className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Company Name"
                  value={profile.companyName}
                  onValueChange={(v) => setProfile({ ...profile, companyName: v })}
                />
                <Input
                  label="Industry"
                  value={profile.industry}
                  onValueChange={(v) => setProfile({ ...profile, industry: v })}
                />
              </div>

              <Textarea
                label="Description"
                placeholder="What does your company do?"
                value={profile.description}
                onValueChange={(v) => setProfile({ ...profile, description: v })}
                minRows={3}
              />

              <Textarea
                label="Mission Statement"
                placeholder="What is your company's mission?"
                value={profile.mission}
                onValueChange={(v) => setProfile({ ...profile, mission: v })}
                minRows={2}
              />

              <Textarea
                label="Target Market"
                placeholder="Who are your ideal customers?"
                value={profile.targetMarket}
                onValueChange={(v) => setProfile({ ...profile, targetMarket: v })}
                minRows={2}
              />

              {/* Values */}
              <div>
                <label className="text-sm font-medium mb-2 block">Core Values</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add a value..."
                    value={newValue}
                    onValueChange={setNewValue}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addToArray(newValue, (v) => setProfile({ ...profile, values: typeof v === "function" ? v(profile.values) : v }), setNewValue);
                      }
                    }}
                  />
                  <Button
                    isIconOnly
                    onPress={() => addToArray(newValue, (v) => setProfile({ ...profile, values: typeof v === "function" ? v(profile.values) : v }), setNewValue)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.values.map((value, i) => (
                    <Chip
                      key={i}
                      onClose={() => setProfile({ ...profile, values: profile.values.filter((_, idx) => idx !== i) })}
                    >
                      {value}
                    </Chip>
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
                    onValueChange={setNewUSP}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addToArray(newUSP, (v) => setProfile({ ...profile, uniqueSellingPoints: typeof v === "function" ? v(profile.uniqueSellingPoints) : v }), setNewUSP);
                      }
                    }}
                  />
                  <Button
                    isIconOnly
                    onPress={() => addToArray(newUSP, (v) => setProfile({ ...profile, uniqueSellingPoints: typeof v === "function" ? v(profile.uniqueSellingPoints) : v }), setNewUSP)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.uniqueSellingPoints.map((usp, i) => (
                    <Chip
                      key={i}
                      onClose={() => setProfile({ ...profile, uniqueSellingPoints: profile.uniqueSellingPoints.filter((_, idx) => idx !== i) })}
                    >
                      {usp}
                    </Chip>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </Tab>

        <Tab
          key="voice"
          title={
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              <span>Voice & Tone</span>
            </div>
          }
        >
          <Card className="mt-4">
            <CardBody className="space-y-6">
              <Select
                label="Voice Tone"
                selectedKeys={[voice.voiceTone]}
                onSelectionChange={(keys) => setVoice({ ...voice, voiceTone: Array.from(keys)[0] as string })}
              >
                {VOICE_TONES.map((tone) => (
                  <SelectItem key={tone.key} textValue={tone.label}>
                    <div>
                      <p className="font-medium">{tone.label}</p>
                      <p className="text-xs text-gray-500">{tone.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </Select>

              <Input
                label="Custom Voice Description (Optional)"
                placeholder="Additional details about your brand voice..."
                value={voice.voiceToneCustom || ""}
                onValueChange={(v) => setVoice({ ...voice, voiceToneCustom: v })}
              />

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Formality Level: {voice.formalityLevel}/5
                </label>
                <Slider
                  step={1}
                  minValue={1}
                  maxValue={5}
                  value={voice.formalityLevel}
                  onChange={(v) => setVoice({ ...voice, formalityLevel: v as number })}
                  marks={[
                    { value: 1, label: "Very Casual" },
                    { value: 3, label: "Balanced" },
                    { value: 5, label: "Very Formal" },
                  ]}
                  className="max-w-md"
                />
              </div>

              <Textarea
                label="Writing Style Guidelines"
                placeholder="Describe how content should be written..."
                value={voice.writingStyle || ""}
                onValueChange={(v) => setVoice({ ...voice, writingStyle: v })}
                minRows={3}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Switch
                    isSelected={voice.useEmojis}
                    onValueChange={(v) => setVoice({ ...voice, useEmojis: v })}
                  >
                    Use Emojis
                  </Switch>
                  {voice.useEmojis && (
                    <Select
                      label="Emoji Frequency"
                      selectedKeys={[voice.emojiFrequency]}
                      onSelectionChange={(keys) => setVoice({ ...voice, emojiFrequency: Array.from(keys)[0] as string })}
                    >
                      {EMOJI_FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.key}>{freq.label}</SelectItem>
                      ))}
                    </Select>
                  )}
                </div>

                <div className="space-y-4">
                  <Switch
                    isSelected={voice.useHashtags}
                    onValueChange={(v) => setVoice({ ...voice, useHashtags: v })}
                  >
                    Use Hashtags
                  </Switch>
                  {voice.useHashtags && (
                    <Select
                      label="Hashtag Style"
                      selectedKeys={[voice.hashtagStyle]}
                      onSelectionChange={(keys) => setVoice({ ...voice, hashtagStyle: Array.from(keys)[0] as string })}
                    >
                      {HASHTAG_STYLES.map((style) => (
                        <SelectItem key={style.key}>{style.label}</SelectItem>
                      ))}
                    </Select>
                  )}
                </div>
              </div>

              <Select
                label="Call-to-Action Style"
                selectedKeys={[voice.ctaStyle]}
                onSelectionChange={(keys) => setVoice({ ...voice, ctaStyle: Array.from(keys)[0] as string })}
              >
                {CTA_STYLES.map((style) => (
                  <SelectItem key={style.key}>{style.label}</SelectItem>
                ))}
              </Select>

              {/* Must Mention */}
              <div>
                <label className="text-sm font-medium mb-2 block">Key Messages (Must Mention)</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add a key message..."
                    value={newMustMention}
                    onValueChange={setNewMustMention}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addToArray(newMustMention, (v) => setVoice({ ...voice, mustMention: typeof v === "function" ? v(voice.mustMention) : v }), setNewMustMention);
                      }
                    }}
                  />
                  <Button
                    isIconOnly
                    onPress={() => addToArray(newMustMention, (v) => setVoice({ ...voice, mustMention: typeof v === "function" ? v(voice.mustMention) : v }), setNewMustMention)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {voice.mustMention.map((item, i) => (
                    <Chip
                      key={i}
                      color="success"
                      variant="flat"
                      onClose={() => setVoice({ ...voice, mustMention: voice.mustMention.filter((_, idx) => idx !== i) })}
                    >
                      {item}
                    </Chip>
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
                    onValueChange={setNewDoNotMention}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addToArray(newDoNotMention, (v) => setVoice({ ...voice, doNotMention: typeof v === "function" ? v(voice.doNotMention) : v }), setNewDoNotMention);
                      }
                    }}
                  />
                  <Button
                    isIconOnly
                    onPress={() => addToArray(newDoNotMention, (v) => setVoice({ ...voice, doNotMention: typeof v === "function" ? v(voice.doNotMention) : v }), setNewDoNotMention)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {voice.doNotMention.map((item, i) => (
                    <Chip
                      key={i}
                      color="danger"
                      variant="flat"
                      onClose={() => setVoice({ ...voice, doNotMention: voice.doNotMention.filter((_, idx) => idx !== i) })}
                    >
                      {item}
                    </Chip>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </Tab>

        <Tab
          key="audiences"
          title={
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Audiences</span>
            </div>
          }
        >
          <Card className="mt-4">
            <CardHeader className="flex justify-between items-center">
              <h3 className="font-semibold">Target Audiences</h3>
              <Button
                color="primary"
                size="sm"
                startContent={<Plus className="w-4 h-4" />}
                onPress={() => {
                  setEditingAudience({ name: "", description: "", interests: [], painPoints: [], goals: [] });
                  audienceModal.onOpen();
                }}
              >
                Add Audience
              </Button>
            </CardHeader>
            <CardBody>
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
                            <Chip size="sm" color="primary" variant="flat">Primary</Chip>
                          )}
                        </div>
                        {audience.description && (
                          <p className="text-sm text-gray-500 mt-1">{audience.description}</p>
                        )}
                        {audience.painPoints.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {audience.painPoints.slice(0, 3).map((point, i) => (
                              <Chip key={i} size="sm" variant="bordered">{point}</Chip>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => {
                            setEditingAudience(audience);
                            audienceModal.onOpen();
                          }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleDeleteAudience(audience.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Tab>

        <Tab
          key="pillars"
          title={
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span>Content Pillars</span>
            </div>
          }
        >
          <Card className="mt-4">
            <CardHeader className="flex justify-between items-center">
              <h3 className="font-semibold">Content Pillars</h3>
              <Button
                color="primary"
                size="sm"
                startContent={<Plus className="w-4 h-4" />}
                onPress={() => {
                  setEditingPillar({ name: "", description: "", topics: [], frequency: 20 });
                  pillarModal.onOpen();
                }}
              >
                Add Pillar
              </Button>
            </CardHeader>
            <CardBody>
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
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => {
                              setEditingPillar(pillar);
                              pillarModal.onOpen();
                            }}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() => handleDeletePillar(pillar.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Chip size="sm" variant="flat">{pillar.frequency}% of content</Chip>
                        {!pillar.isActive && (
                          <Chip size="sm" color="warning" variant="flat">Inactive</Chip>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Tab>

        <Tab
          key="competitors"
          title={
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4" />
              <span>Competitors</span>
            </div>
          }
        >
          <Card className="mt-4">
            <CardHeader className="flex justify-between items-center">
              <h3 className="font-semibold">Competitors</h3>
              <Button
                color="primary"
                size="sm"
                startContent={<Plus className="w-4 h-4" />}
                onPress={() => {
                  setEditingCompetitor({ name: "", website: "", strengths: [], weaknesses: [], differentiators: [] });
                  competitorModal.onOpen();
                }}
              >
                Add Competitor
              </Button>
            </CardHeader>
            <CardBody>
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
                                <Chip key={i} size="sm" color="success" variant="flat">{diff}</Chip>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => {
                            setEditingCompetitor(competitor);
                            competitorModal.onOpen();
                          }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => handleDeleteCompetitor(competitor.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Tab>

        <Tab
          key="summary"
          title={
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>AI Summary</span>
            </div>
          }
        >
          <Card className="mt-4">
            <CardHeader className="flex justify-between items-center">
              <h3 className="font-semibold">AI-Generated Brand Summary</h3>
              <Button
                color="primary"
                startContent={<Sparkles className="w-4 h-4" />}
                onPress={handleGenerateSummary}
                isLoading={generating}
              >
                Generate Summary
              </Button>
            </CardHeader>
            <CardBody>
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
                    color="primary"
                    startContent={<Sparkles className="w-4 h-4" />}
                    onPress={handleGenerateSummary}
                    isLoading={generating}
                  >
                    Generate Summary
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </Tab>
      </Tabs>

      {/* Audience Modal */}
      <Modal isOpen={audienceModal.isOpen} onClose={audienceModal.onClose} size="2xl">
        <ModalContent>
          <ModalHeader>{editingAudience?.id ? "Edit Audience" : "Add Audience"}</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Audience Name"
              placeholder="e.g., Small Business Owners"
              value={editingAudience?.name || ""}
              onValueChange={(v) => setEditingAudience({ ...editingAudience, name: v })}
              isRequired
            />
            <Textarea
              label="Description"
              placeholder="Describe this audience segment..."
              value={editingAudience?.description || ""}
              onValueChange={(v) => setEditingAudience({ ...editingAudience, description: v })}
            />
            <Switch
              isSelected={editingAudience?.isPrimary || false}
              onValueChange={(v) => setEditingAudience({ ...editingAudience, isPrimary: v })}
            >
              Primary Audience
            </Switch>
            <Input
              label="Age Range"
              placeholder="e.g., 25-45"
              value={editingAudience?.ageRange || ""}
              onValueChange={(v) => setEditingAudience({ ...editingAudience, ageRange: v })}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={audienceModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleSaveAudience}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Pillar Modal */}
      <Modal isOpen={pillarModal.isOpen} onClose={pillarModal.onClose} size="2xl">
        <ModalContent>
          <ModalHeader>{editingPillar?.id ? "Edit Content Pillar" : "Add Content Pillar"}</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Pillar Name"
              placeholder="e.g., Product Updates"
              value={editingPillar?.name || ""}
              onValueChange={(v) => setEditingPillar({ ...editingPillar, name: v })}
              isRequired
            />
            <Textarea
              label="Description"
              placeholder="What content falls under this pillar?"
              value={editingPillar?.description || ""}
              onValueChange={(v) => setEditingPillar({ ...editingPillar, description: v })}
            />
            <Input
              label="Color"
              type="color"
              value={editingPillar?.color || "#7C3AED"}
              onValueChange={(v) => setEditingPillar({ ...editingPillar, color: v })}
            />
            <div>
              <label className="text-sm font-medium mb-2 block">
                Content Frequency: {editingPillar?.frequency || 20}%
              </label>
              <Slider
                step={5}
                minValue={0}
                maxValue={100}
                value={editingPillar?.frequency || 20}
                onChange={(v) => setEditingPillar({ ...editingPillar, frequency: v as number })}
                className="max-w-md"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={pillarModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleSavePillar}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Competitor Modal */}
      <Modal isOpen={competitorModal.isOpen} onClose={competitorModal.onClose} size="2xl">
        <ModalContent>
          <ModalHeader>{editingCompetitor?.id ? "Edit Competitor" : "Add Competitor"}</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Competitor Name"
              placeholder="e.g., Acme Corp"
              value={editingCompetitor?.name || ""}
              onValueChange={(v) => setEditingCompetitor({ ...editingCompetitor, name: v })}
              isRequired
            />
            <Input
              label="Website"
              placeholder="https://competitor.com"
              value={editingCompetitor?.website || ""}
              onValueChange={(v) => setEditingCompetitor({ ...editingCompetitor, website: v })}
            />
            <Textarea
              label="Description"
              placeholder="Brief description of this competitor..."
              value={editingCompetitor?.description || ""}
              onValueChange={(v) => setEditingCompetitor({ ...editingCompetitor, description: v })}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={competitorModal.onClose}>Cancel</Button>
            <Button color="primary" onPress={handleSaveCompetitor}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
