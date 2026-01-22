"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  CheckCircle2,
  Cpu,
  ListChecks,
  Mic,
  PhoneOff,
  Sparkles,
  Volume2,
} from "lucide-react";
import { getPublicHref } from "@/lib/routes/public";

type DemoStep = {
  id: string;
  field: "name" | "company" | "challenge" | "teamSize" | "timeline" | "booking";
  question: string;
  options: string[];
  final?: boolean;
};

type Responses = Partial<Record<DemoStep["field"], string>>;

type TranscriptItem = {
  speaker: "Sarah" | "You";
  text: string;
  time: string;
  tone: string;
  confidence?: string;
};

const demoSteps: DemoStep[] = [
  {
    id: "name",
    field: "name",
    question:
      "Hi! I'm Sarah, an AI agent built on Epic AI. I help business owners like you automate their sales. Thanks for trying our live demo! Can I get your name?",
    options: ["John Smith", "Sarah Johnson", "Mike Chen"],
  },
  {
    id: "company",
    field: "company",
    question: "Nice to meet you, {name}! What company are you with?",
    options: ["TechStart Inc", "GrowthLabs", "SalesPro"],
  },
  {
    id: "challenge",
    field: "challenge",
    question:
      "Great! So {name}, what's your biggest sales challenge right now?",
    options: [
      "We miss 60% of inbound calls",
      "Response time is too slow",
      "Can't scale our team",
    ],
  },
  {
    id: "team",
    field: "teamSize",
    question: "That's exactly what Epic AI solves! How big is your sales team?",
    options: ["Just me", "2 reps", "5 people", "10+ team"],
  },
  {
    id: "timeline",
    field: "timeline",
    question:
      "Perfect. Companies your size typically see 3x more demos booked in the first month. How soon are you looking to implement a solution like this?",
    options: ["Immediately", "This month", "Next quarter", "Just researching"],
  },
  {
    id: "booking",
    field: "booking",
    question:
      "Great! I think Epic AI could really help with that. Let me send you a case study of how a company like yours got 250% more qualified leads. Can I get your email?",
    options: [
      "Tomorrow at 2pm works",
      "Thursday at 10am is better",
      "Send me your email",
    ],
    final: true,
  },
];

const timestamps = [
  "10:04:12 AM",
  "10:04:18 AM",
  "10:04:25 AM",
  "10:04:31 AM",
  "10:04:37 AM",
  "10:04:44 AM",
  "10:04:53 AM",
  "10:05:02 AM",
  "10:05:09 AM",
  "10:05:17 AM",
  "10:05:25 AM",
  "10:05:32 AM",
];

const workflowSteps = [
  "Greet caller",
  "Collect name",
  "Collect company",
  "Identify challenge",
  "Assess team size",
  "Determine timeline",
  "Calculate score",
  "Route decision",
];

function formatQuestion(text: string, responses: Responses) {
  return text.replace("{name}", responses.name ?? "there");
}

function getScore(stepIndex: number) {
  if (stepIndex >= 4) return 70;
  if (stepIndex >= 3) return 50;
  return 20;
}

export default function WebDemoClient() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [responses, setResponses] = useState<Responses>({});
  const [pending, setPending] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([
    {
      speaker: "Sarah",
      text: demoSteps[0].question,
      time: timestamps[0],
      tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
      confidence: "(95% confident)",
    },
  ]);

  const currentStep = demoSteps[stepIndex];
  const statusLabel = stepIndex >= 4 ? "Booking Demo" : "Qualifying";
  const score = getScore(stepIndex);
  const activeWorkflowIndex = Math.min(stepIndex + 1, workflowSteps.length - 1);

  const handleSelect = (value: string) => {
    const step = demoSteps[stepIndex];
    if (!step || pending) return;

    setResponses((prev) => ({ ...prev, [step.field]: value }));
    setTranscript((prev) => {
      const time = timestamps[Math.min(prev.length, timestamps.length - 1)];
      return [
        ...prev,
        {
          speaker: "You",
          text: value,
          time,
          tone: "bg-slate-100 text-slate-800",
        },
      ];
    });

    setPending(true);

    if (step.final) {
      setTimeout(() => {
        router.push(getPublicHref("/sign-up?demo=web&step=confirm"));
      }, 600);
      return;
    }

    setTimeout(() => {
      setStepIndex((prev) => {
        const nextIndex = Math.min(prev + 1, demoSteps.length - 1);
        const nextStep = demoSteps[nextIndex];

        setTranscript((prevTranscript) => {
          const time = timestamps[Math.min(prevTranscript.length, timestamps.length - 1)];
          return [
            ...prevTranscript,
            {
              speaker: "Sarah",
              text: formatQuestion(nextStep.question, {
                ...responses,
                [step.field]: value,
              }),
              time,
              tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
              confidence: "(92% confident)",
            },
          ];
        });

        return nextIndex;
      });
      setPending(false);
    }, 700);
  };

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(127deg,_#faf5ff_0%,_#eff6ff_100%)] text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xl font-semibold">Live Voice Demo</div>
            <div className="text-sm text-slate-500">Experience Epic AI in action</div>
          </div>
          <Link
            href={getPublicHref("/sign-up")}
            className="rounded-xl px-4 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            Exit Demo
          </Link>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),_0_4px_6px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckCircle className="h-7 w-7" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-emerald-500/80" />
                </div>
                <div>
                  <div className="text-lg font-semibold">Sarah (AI Sales Agent)</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500/85" />
                    {statusLabel}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <Volume2 className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-500 text-white"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-2 text-sm text-purple-700">
                <Sparkles className="h-4 w-4" />
                Powered by Epic AI
              </div>
              <span className="mx-2 text-sm text-slate-400">•</span>
              <span className="text-sm text-slate-500">
                This entire conversation is handled by AI
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),_0_4px_6px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Live Transcript</div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                Qualification Score:
                <span className="rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 px-3 py-1 text-xs font-semibold text-white">
                  {score}/100
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {transcript.map((item, index) => (
                <div key={`${item.speaker}-${index}`} className={`rounded-2xl px-4 py-3 ${item.tone}`}>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span>{item.speaker}</span>
                    {item.confidence && (
                      <span className="text-purple-100">{item.confidence}</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm">{item.text}</div>
                  <div className="mt-2 text-xs text-purple-100">{item.time}</div>
                </div>
              ))}
              {pending && (
                <div className="rounded-2xl bg-gradient-to-r from-purple-500 to-blue-600 px-4 py-3 text-white">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span>Sarah</span>
                    <span className="text-purple-100">(typing…)</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white/60" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white/40" />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {currentStep?.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  disabled={pending}
                  className={`rounded-full px-4 py-2 text-sm text-purple-700 ${
                    pending
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "bg-purple-50 hover:bg-purple-100"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-400">
                  In production, this would use LiveKit voice...
                </div>
                <button
                  type="button"
                  className="rounded-xl bg-slate-300 px-5 py-3 text-sm text-slate-500"
                >
                  <Mic className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">
                💡 For this demo, use the quick response buttons above
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-l border-slate-200 bg-white px-6 py-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Cpu className="h-4 w-4 text-blue-500" />
            Behind the Scenes
          </div>

          <div className="mt-6 space-y-4">
            <div className="text-sm font-semibold text-slate-700">Qualification Progress</div>
            {[
              ["Name", responses.name],
              ["Company", responses.company],
              ["Challenge", responses.challenge],
              ["Team Size", responses.teamSize],
              ["Timeline", responses.timeline],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 text-sm text-slate-600">
                {value ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                ) : (
                  <span className="mt-1 h-4 w-4 rounded-full border-2 border-slate-300" />
                )}
                <div>
                  <div className="font-semibold text-slate-700">{label}</div>
                  <div className="text-xs text-slate-500">
                    {value ?? "Pending"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <div className="font-semibold">AI Reasoning</div>
            <div className="mt-1 text-xs">
              {stepIndex >= 4
                ? "High intent detected! Proceeding to book demo..."
                : "Gathering qualification data using BANT methodology..."}
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="text-sm font-semibold text-slate-700">Workflow Execution</div>
            {workflowSteps.map((label, index) => {
              const done = index < activeWorkflowIndex;
              const active = index === activeWorkflowIndex && !demoSteps[stepIndex]?.final;

              return (
                <div key={label} className="flex items-center gap-2 text-xs">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : active ? (
                    <ListChecks className="h-4 w-4 text-blue-500" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border-2 border-slate-300" />
                  )}
                  <span
                    className={
                      active
                        ? "text-blue-600"
                        : done
                        ? "text-slate-900"
                        : "text-slate-400"
                    }
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
