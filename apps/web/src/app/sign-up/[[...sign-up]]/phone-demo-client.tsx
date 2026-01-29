"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  CheckCircle2,
  MessageSquare,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { getPublicHref } from "@/lib/routes/public";

type PhoneDemoClientProps = {
  initialStep: string;
};

type TranscriptEvent = {
  speaker: "SYSTEM" | "SARAH" | "YOU" | "AI INSIGHT";
  text: string;
  time: string;
  tone: string;
  updates?: Partial<{
    name: string;
    company: string;
    challenge: string;
    teamSize: string;
    timeline: string;
    score: number;
  }>;
  status?: "active" | "qualifying" | "complete";
};

const transcriptEvents: TranscriptEvent[] = [
  {
    speaker: "SYSTEM",
    text: "Initiating outbound call via Twilio...",
    time: "3:46:50 PM",
    tone: "bg-slate-100 text-slate-700",
    status: "active",
  },
  {
    speaker: "SYSTEM",
    text: "Dialing (555) 555-1234...",
    time: "3:46:51 PM",
    tone: "bg-slate-100 text-slate-700",
    status: "active",
  },
  {
    speaker: "SYSTEM",
    text: "Call connected! Sarah is speaking...",
    time: "3:46:53 PM",
    tone: "bg-slate-100 text-slate-700",
    status: "active",
  },
  {
    speaker: "SARAH",
    text: "Hi! I'm Sarah, an AI agent from Epic AI. Thanks for requesting a demo!",
    time: "3:46:54 PM",
    tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
  },
  {
    speaker: "SARAH",
    text: "I'll ask you a few quick questions to understand your needs. Sound good?",
    time: "3:46:57 PM",
    tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
  },
  {
    speaker: "YOU",
    text: "Sure, sounds good!",
    time: "3:47:00 PM",
    tone: "bg-blue-100 text-blue-900",
  },
  {
    speaker: "AI INSIGHT",
    text: "✓ Positive sentiment detected",
    time: "3:47:00 PM",
    tone: "bg-emerald-50 border border-emerald-200 text-emerald-800",
  },
  {
    speaker: "SARAH",
    text: "Great! First, can I get your name?",
    time: "3:47:02 PM",
    tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
    status: "qualifying",
  },
  {
    speaker: "YOU",
    text: "John Smith",
    time: "3:47:05 PM",
    tone: "bg-blue-100 text-blue-900",
    updates: { name: "John Smith" },
  },
  {
    speaker: "AI INSIGHT",
    text: "✓ Name captured: John Smith",
    time: "3:47:05 PM",
    tone: "bg-emerald-50 border border-emerald-200 text-emerald-800",
  },
  {
    speaker: "SARAH",
    text: "Nice to meet you, John! What company are you with?",
    time: "3:47:07 PM",
    tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
  },
  {
    speaker: "YOU",
    text: "TechStart Inc",
    time: "3:47:10 PM",
    tone: "bg-blue-100 text-blue-900",
    updates: { company: "TechStart Inc" },
  },
  {
    speaker: "AI INSIGHT",
    text: "✓ Company captured: TechStart Inc",
    time: "3:47:10 PM",
    tone: "bg-emerald-50 border border-emerald-200 text-emerald-800",
  },
  {
    speaker: "SARAH",
    text: "Perfect! So John, what's your biggest sales challenge right now?",
    time: "3:47:12 PM",
    tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
  },
  {
    speaker: "YOU",
    text: "We miss about 60% of our inbound calls and it's killing our conversion rate",
    time: "3:47:16 PM",
    tone: "bg-blue-100 text-blue-900",
    updates: { challenge: "Missing inbound calls" },
  },
  {
    speaker: "AI INSIGHT",
    text: "✓ Pain point identified: Missed calls",
    time: "3:47:16 PM",
    tone: "bg-emerald-50 border border-emerald-200 text-emerald-800",
  },
  {
    speaker: "AI INSIGHT",
    text: "🎯 High-intent keyword detected: \"conversion rate\"",
    time: "3:47:16 PM",
    tone: "bg-emerald-50 border border-emerald-200 text-emerald-800",
  },
  {
    speaker: "SARAH",
    text: "That's exactly what Epic AI solves! We can answer every call instantly. How big is your sales team?",
    time: "3:47:18 PM",
    tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
  },
  {
    speaker: "YOU",
    text: "Just me and 5 reps",
    time: "3:47:21 PM",
    tone: "bg-blue-100 text-blue-900",
    updates: { teamSize: "6 people" },
  },
  {
    speaker: "AI INSIGHT",
    text: "✓ Team size: 6 people",
    time: "3:47:21 PM",
    tone: "bg-emerald-50 border border-emerald-200 text-emerald-800",
  },
  {
    speaker: "SARAH",
    text: "Perfect size for Epic AI! Companies your size typically see 3x more demos booked. How soon are you looking to implement?",
    time: "3:47:23 PM",
    tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
  },
  {
    speaker: "YOU",
    text: "Immediately - this is costing us deals every day",
    time: "3:47:26 PM",
    tone: "bg-blue-100 text-blue-900",
    updates: { timeline: "Immediate" },
  },
  {
    speaker: "AI INSIGHT",
    text: "✓ Timeline: Immediate",
    time: "3:47:26 PM",
    tone: "bg-emerald-50 border border-emerald-200 text-emerald-800",
  },
  {
    speaker: "AI INSIGHT",
    text: "🔥 Urgency detected: \"costing us deals every day\"",
    time: "3:47:26 PM",
    tone: "bg-emerald-50 border border-emerald-200 text-emerald-800",
  },
  {
    speaker: "AI INSIGHT",
    text: "🎯 Qualification Score: 85/100 (High Intent)",
    time: "3:47:28 PM",
    tone: "bg-emerald-50 border border-emerald-200 text-emerald-800",
    updates: { score: 85 },
  },
  {
    speaker: "AI INSIGHT",
    text: "✅ Routing to: Book Demo",
    time: "3:47:28 PM",
    tone: "bg-emerald-50 border border-emerald-200 text-emerald-800",
  },
  {
    speaker: "SARAH",
    text: "Perfect! Based on what you've shared, I think Epic AI is a great fit for TechStart Inc.",
    time: "3:47:30 PM",
    tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
  },
  {
    speaker: "SARAH",
    text: "I'd love to get you on a 15-minute demo with our team. Would tomorrow at 2pm Pacific or Thursday at 10am work better?",
    time: "3:47:32 PM",
    tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
  },
  {
    speaker: "YOU",
    text: "Tomorrow at 2pm works perfectly",
    time: "3:47:35 PM",
    tone: "bg-blue-100 text-blue-900",
  },
  {
    speaker: "SARAH",
    text: "Excellent! You'll get a confirmation text and email in the next 30 seconds with the Zoom link.",
    time: "3:47:37 PM",
    tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
  },
  {
    speaker: "SARAH",
    text: "I'm excited for you to see what Epic AI can do, John. Talk soon!",
    time: "3:47:39 PM",
    tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
    status: "complete",
  },
  {
    speaker: "SYSTEM",
    text: "Call ended. Duration: 0:00",
    time: "3:47:41 PM",
    tone: "bg-slate-100 text-slate-700",
  },
];

export default function PhoneDemoClient({ initialStep }: PhoneDemoClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"start" | "live" | "complete">(
    initialStep === "live" ? "live" : "start"
  );
  const [phone, setPhone] = useState(
    initialStep === "live" ? "(555) 555-1234" : ""
  );
  const [seconds, setSeconds] = useState(0);
  const [eventIndex, setEventIndex] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEvent[]>([]);
  const [qualData, setQualData] = useState({
    name: "",
    company: "",
    challenge: "",
    teamSize: "",
    timeline: "",
  });
  const [score, setScore] = useState(0);
  const [statusLabel, setStatusLabel] = useState("Call Active");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startCall = () => {
    if (!phone.trim()) return;
    setPhase("live");
  };

  useEffect(() => {
    if (phase !== "live") return;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "live") return;
    if (eventIndex >= transcriptEvents.length) return;

    const timeout = setTimeout(() => {
      const next = transcriptEvents[eventIndex];
      setTranscript((prev) => [...prev, next]);

      if (next.updates) {
        setQualData((prev) => ({ ...prev, ...next.updates }));
        if (next.updates.score) {
          setScore(next.updates.score);
        }
      }

      if (next.status === "qualifying") {
        setStatusLabel("Qualifying Lead");
      }
      if (next.status === "complete") {
        setStatusLabel("Call Complete");
        setPhase("complete");
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setTimeout(() => {
          router.push(getPublicHref("/sign-up?demo=phone&step=confirm"));
        }, 1200);
      }

      setEventIndex((prev) => prev + 1);
    }, 650);

    return () => clearTimeout(timeout);
  }, [eventIndex, phase, router]);

  const callDuration = useMemo(() => {
    const secondsFormatted = String(seconds).padStart(2, "0");
    return `0:${secondsFormatted}`;
  }, [seconds]);

  if (phase === "start") {
    return (
      <div className="min-h-screen w-full bg-[linear-gradient(145deg,_#faf5ff_0%,_#eff6ff_100%)] px-6 py-10 text-slate-900">
        <div className="mx-auto w-full max-w-2xl">
          <Link href={getPublicHref("/sign-up")} className="text-sm text-slate-600">
            ← Back to demo options
          </Link>

          <div className="mt-6 rounded-3xl bg-white p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#ad46ff_0%,_#e60076_100%)] text-white shadow-xl">
              <PhoneCall className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-center text-3xl font-semibold text-slate-900">
              Sarah will call you in 30 seconds
            </h1>
            <p className="mt-3 text-center text-base text-slate-600">
              Experience a real AI voice agent qualifying you over the phone
            </p>

            <div className="mt-8 space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Your Phone Number
              </label>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 px-6 py-4 text-lg text-slate-900 outline-none"
              />
              <p className="text-sm text-slate-500">
                We&apos;ll call this number immediately. Standard rates may apply.
              </p>
            </div>

            <div className="mt-8 rounded-2xl bg-[linear-gradient(152deg,_#faf5ff_0%,_#eff6ff_100%)] p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles className="h-4 w-4 text-purple-500" />
                What to expect:
              </div>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                {[
                  {
                    title: "Instant callback",
                    description: "Sarah calls you in ~30 seconds",
                  },
                  {
                    title: "Natural conversation",
                    description: "She'll ask 5 quick qualification questions",
                  },
                  {
                    title: "Demo booked",
                    description: "If qualified, Sarah books your demo automatically",
                  },
                  {
                    title: "Call lasts ~2 minutes",
                    description: "Quick, natural, and impressive",
                  },
                ].map((item, index) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-600">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {item.title}
                      </div>
                      <div>{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={startCall}
              disabled={!phone.trim()}
              className={`mt-8 flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-semibold transition ${
                phone.trim()
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "cursor-not-allowed bg-slate-200 text-slate-500"
              }`}
            >
              <PhoneCall className="h-5 w-5" />
              Call Me Now
            </button>

            <p className="mt-4 text-center text-xs text-slate-500">
              🔒 Your number is secure and won&apos;t be shared. You can unsubscribe
              anytime.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(145deg,_#faf5ff_0%,_#eff6ff_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-[1104px]">
        <div className="border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Live AI Call</h1>
          <p className="text-sm text-slate-600">Watch Sarah in action</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-semibold text-slate-900">
                    Sarah (AI Agent)
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-blue-500/80" />
                    {statusLabel}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Calling: {phone || "(555) 555-1234"}
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 text-emerald-500">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                <PhoneCall className="mt-0.5 h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-semibold">
                    {phase === "complete" ? "Call complete!" : "Call in progress"}
                  </div>
                  {phase === "complete"
                    ? "Sarah successfully qualified you and booked your demo. Redirecting to confirmation..."
                    : statusLabel === "Qualifying Lead"
                    ? "Sarah is qualifying your needs..."
                    : "Sarah is introducing herself..."}
                </div>
              </div>
              <div className="mt-4 text-xs text-slate-500">
                {callDuration} Call duration
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                Live Transcript
              </div>
              <div className="mt-4 space-y-3 text-sm">
                {transcript.map((item, index) => (
                  <div
                    key={`${item.speaker}-${index}`}
                    className={`rounded-xl px-3 py-3 ${item.tone}`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>{item.speaker}</span>
                      <span className="text-slate-500">{item.time}</span>
                    </div>
                    <div className="mt-1 text-sm">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
              <div className="text-sm font-semibold text-slate-900">
                Qualification Data
              </div>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                {[
                  ["Name", qualData.name],
                  ["Company", qualData.company],
                  ["Challenge", qualData.challenge],
                  ["Team Size", qualData.teamSize],
                  ["Timeline", qualData.timeline],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start gap-3">
                    {value ? (
                      <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-500" />
                    ) : (
                      <span className="mt-1 h-4 w-4 rounded-full border-2 border-slate-300" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-700">{label}</div>
                      <div className="text-xs text-slate-500">
                        {value || "Pending"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-purple-500 to-blue-600 p-6 text-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
              <div className="text-sm font-semibold">Qualification Score</div>
              <div className="mt-2 text-3xl font-semibold">
                {score || 0}/100
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/30">
                <div
                  className="h-2 rounded-full bg-white"
                  style={{ width: `${Math.min(score, 100)}%` }}
                />
              </div>
              <div className="mt-3 text-sm">🔥 High Intent - Book Demo</div>
            </div>

            <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles className="h-4 w-4 text-purple-500" />
                This Is What&apos;s Happening
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>• AI is analyzing your voice tone and sentiment</li>
                <li>• Extracting key data points in real-time</li>
                <li>• Scoring your responses using BANT framework</li>
                <li>• Dynamically adapting conversation flow</li>
                <li>• Integrating with calendar API to book demo</li>
              </ul>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-semibold">📱 Demo Mode</div>
              <p className="mt-2 text-sm text-amber-700">
                This is a simulated call for demo purposes. In production, this
                uses Twilio + LiveKit for real phone calls.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
