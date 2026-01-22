import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CheckCircle,
  CreditCard,
  Headphones,
  Monitor,
  Phone,
  PhoneCall,
  Sparkles,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";

type SignUpPageProps = {
  searchParams?: {
    demo?: string;
    step?: string;
  };
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const demo = (await searchParams)?.demo;
  const step = (await searchParams)?.step;

  if (demo === "phone") {
    if (step === "live") {
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
                        Call Complete
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Calling: (155) 555-5555
                      </div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 text-emerald-500">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                    <PhoneCall className="mt-0.5 h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-semibold">Call complete!</div>
                      Sarah successfully qualified you and booked your demo.
                      Redirecting to confirmation...
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                    Live Transcript
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    {[
                      {
                        speaker: "SYSTEM",
                        text: "Initiating outbound call via Twilio...",
                        time: "1:38:37 AM",
                        tone: "bg-slate-100 text-slate-700",
                      },
                      {
                        speaker: "SYSTEM",
                        text: "Dialing (155) 555-5555...",
                        time: "1:38:39 AM",
                        tone: "bg-slate-100 text-slate-700",
                      },
                      {
                        speaker: "SYSTEM",
                        text: "Call connected! Sarah is speaking...",
                        time: "1:38:41 AM",
                        tone: "bg-slate-100 text-slate-700",
                      },
                      {
                        speaker: "SARAH",
                        text: "Hi! I'm Sarah, an AI agent from Epic AI. Thanks for requesting a demo!",
                        time: "1:38:42 AM",
                        tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
                      },
                      {
                        speaker: "SARAH",
                        text: "I'll ask you a few quick questions to understand your needs. Sound good?",
                        time: "1:38:45 AM",
                        tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
                      },
                      {
                        speaker: "YOU",
                        text: "Sure, sounds good!",
                        time: "1:38:48 AM",
                        tone: "bg-blue-100 text-blue-900",
                      },
                      {
                        speaker: "AI INSIGHT",
                        text: "Detecting high intent based on tone and pace.",
                        time: "1:38:52 AM",
                        tone: "bg-emerald-50 border border-emerald-200 text-emerald-800",
                      },
                      {
                        speaker: "SARAH",
                        text: "Great! What type of business do you run?",
                        time: "1:38:55 AM",
                        tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
                      },
                      {
                        speaker: "YOU",
                        text: "We run a small home services company.",
                        time: "1:39:02 AM",
                        tone: "bg-blue-100 text-blue-900",
                      },
                      {
                        speaker: "AI INSIGHT",
                        text: "Captured company type and updated CRM lead card.",
                        time: "1:39:08 AM",
                        tone: "bg-emerald-50 border border-emerald-200 text-emerald-800",
                      },
                      {
                        speaker: "SARAH",
                        text: "Are you looking to add more inbound calls or automate follow-ups?",
                        time: "1:39:14 AM",
                        tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
                      },
                      {
                        speaker: "YOU",
                        text: "Yes, we miss a lot of calls after hours.",
                        time: "1:39:18 AM",
                        tone: "bg-blue-100 text-blue-900",
                      },
                      {
                        speaker: "SARAH",
                        text: "Perfect, I can help. Let's get a demo scheduled.",
                        time: "1:39:21 AM",
                        tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
                      },
                      {
                        speaker: "SARAH",
                        text: "Excellent! You'll get a confirmation text and email in the next 30 seconds with the Zoom link.",
                        time: "1:39:25 AM",
                        tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
                      },
                      {
                        speaker: "SARAH",
                        text: "I'm excited for you to see what Epic AI can do, John. Talk soon!",
                        time: "1:39:27 AM",
                        tone: "bg-gradient-to-r from-purple-500 to-blue-600 text-white",
                      },
                      {
                        speaker: "SYSTEM",
                        text: "Call ended. Duration: 0:00",
                        time: "1:39:28 AM",
                        tone: "bg-slate-100 text-slate-700",
                      },
                    ].map((item) => (
                      <div
                        key={`${item.speaker}-${item.time}`}
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
                      ["Name", "John Smith"],
                      ["Company", "TechStart Inc"],
                      ["Challenge", "Missing inbound calls"],
                      ["Team Size", "6 people"],
                      ["Timeline", "Immediate"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start gap-3">
                        <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-500" />
                        <div>
                          <div className="font-semibold text-slate-700">{label}</div>
                          <div className="text-xs text-slate-500">{value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-r from-purple-500 to-blue-600 p-6 text-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <div className="text-sm font-semibold">Qualification Score</div>
                  <div className="mt-2 text-3xl font-semibold">85/100</div>
                  <div className="mt-3 h-2 w-full rounded-full bg-white/30">
                    <div className="h-2 w-5/6 rounded-full bg-white" />
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
                    This is a simulated call for demo purposes. In production,
                    this uses Twilio + LiveKit for real phone calls.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full bg-[linear-gradient(145deg,_#faf5ff_0%,_#eff6ff_100%)] px-6 py-10 text-slate-900">
        <div className="mx-auto w-full max-w-2xl">
          <Link href="/sign-up" className="text-sm text-slate-600">
            ← Back to demo options
          </Link>

          <div className="mt-6 rounded-3xl bg-white p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#ad46ff_0%,_#e60076_100%)] text-white shadow-xl">
              <Phone className="h-8 w-8" />
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
                    description: "She&apos;ll ask 5 quick qualification questions",
                  },
                  {
                    title: "Demo booked",
                    description:
                      "If qualified, Sarah books your demo automatically",
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

            <Link
              href="/sign-up?demo=phone&step=live"
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-200 px-6 py-4 text-base font-semibold text-slate-500 transition hover:bg-slate-300"
            >
              <Phone className="h-5 w-5" />
              Call Me Now
              <ArrowRight className="h-4 w-4" />
            </Link>

            <p className="mt-4 text-center text-xs text-slate-500">
              🔒 Your number is secure and won&apos;t be shared. You can unsubscribe
              anytime.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const showAuth = Boolean(demo);

  return (
    <div className="min-h-screen w-full bg-[linear-gradient(145deg,_#9810fa_0%,_#155dfc_50%,_#8200db_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
          <Sparkles className="h-4 w-4" />
          Choose Your Demo Experience
        </div>

        <h1 className="mt-6 text-center text-4xl font-semibold leading-tight sm:text-5xl">
          How would you like to experience Sarah?
        </h1>
        <p className="mt-3 text-center text-lg text-purple-100">
          Pick the demo style that works best for you
        </p>

        <div className="mt-10 grid w-full gap-6 md:grid-cols-2">
          <Link
            href="/sign-up?demo=phone"
            className="group relative rounded-3xl bg-white p-8 text-slate-900 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] transition hover:-translate-y-1"
          >
            <span className="absolute right-6 top-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow">
              🔥 MOST IMPRESSIVE
            </span>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#ad46ff_0%,_#e60076_100%)] text-white shadow-lg">
              <Phone className="h-6 w-6" />
            </div>
            <div className="mt-6 flex items-center gap-2 text-2xl font-semibold">
              Sarah Calls You
              <span aria-hidden>⚡</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Get a real phone call from our AI agent in 30 seconds. Experience the
              full power of voice AI on your actual phone.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span>
                  <span className="font-semibold text-slate-700">Real phone experience</span>{" "}
                  – Sounds amazing
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span>
                  <span className="font-semibold text-slate-700">Natural interruptions</span>{" "}
                  – Talk over Sarah
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span>
                  <span className="font-semibold text-slate-700">Ultra-realistic</span>{" "}
                  – Customers won&apos;t know it&apos;s AI
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span>
                  <span className="font-semibold text-slate-700">Instant callback</span>{" "}
                  – Calls you in 30 seconds
                </span>
              </li>
            </ul>
            <div className="mt-8 inline-flex items-center gap-2 font-semibold text-purple-600">
              Get a call from Sarah
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/sign-up?demo=web"
            className="group rounded-3xl bg-white p-8 text-slate-900 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)] transition hover:-translate-y-1"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#2b7fff_0%,_#9810fa_100%)] text-white shadow-lg">
              <Monitor className="h-6 w-6" />
            </div>
            <div className="mt-6 text-2xl font-semibold">Web-Based Demo</div>
            <p className="mt-3 text-sm text-slate-600">
              Try the conversation flow in your browser. Perfect if you&apos;re in a
              meeting or can&apos;t take a call right now.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                <span>
                  <span className="font-semibold text-slate-700">Instant start</span>{" "}
                  – No phone needed
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                <span>
                  <span className="font-semibold text-slate-700">Visual transcript</span>{" "}
                  – See the conversation
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                <span>
                  <span className="font-semibold text-slate-700">Behind-the-scenes</span>{" "}
                  – Watch AI reasoning
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                <span>
                  <span className="font-semibold text-slate-700">Quick responses</span>{" "}
                  – Click to answer
                </span>
              </li>
            </ul>
            <div className="mt-8 inline-flex items-center gap-2 font-semibold text-blue-600">
              Start web demo
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        <div className="mt-8 w-full rounded-2xl border border-white/20 bg-white/10 p-6 text-sm text-purple-100">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-white">
                <Headphones className="h-4 w-4" />
                <span className="font-semibold">Phone Demo Best For:</span>
              </div>
              <ul className="mt-3 space-y-2">
                <li>• Experiencing realistic voice quality</li>
                <li>• Testing natural conversation flow</li>
                <li>• Seeing how customers will experience it</li>
                <li>• Impressing your team with a demo</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 text-white">
                <Monitor className="h-4 w-4" />
                <span className="font-semibold">Web Demo Best For:</span>
              </div>
              <ul className="mt-3 space-y-2">
                <li>• Quick exploration (30 seconds)</li>
                <li>• Silent environments</li>
                <li>• Learning the qualification flow</li>
                <li>• Seeing the workflow logic</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-white/80">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Your info stays private
          </span>
          <span className="hidden h-4 w-px bg-white/30 sm:inline-flex" />
          <span className="inline-flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-300" />
            No credit card required
          </span>
          <span className="hidden h-4 w-px bg-white/30 sm:inline-flex" />
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            Unsubscribe anytime
          </span>
        </div>

        <Link href="/" className="mt-6 text-sm text-white/80">
          ← Back to homepage
        </Link>
      </div>

      {showAuth ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 text-center text-lg font-semibold text-slate-900">
              Create your account
            </div>
            <SignUp
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "shadow-none border-0",
                },
              }}
            />
            <div className="mt-4 text-center text-sm text-slate-500">
              <Link href="/sign-up" className="font-semibold text-slate-700">
                Close
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
