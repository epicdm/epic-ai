import Link from "next/link";
import {
  ArrowRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ComputerDesktopIcon,
  PhoneIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import { getPublicHref } from "@/lib/routes/public";

const phoneDemoBenefits = [
  {
    title: "Real phone experience",
    detail: "Sounds amazing",
  },
  {
    title: "Natural interruptions",
    detail: "Talk over Sarah",
  },
  {
    title: "Ultra-realistic",
    detail: "Customers won’t know it’s AI",
  },
  {
    title: "Instant callback",
    detail: "Calls you in 30 seconds",
  },
];

const webDemoBenefits = [
  {
    title: "Instant start",
    detail: "No phone needed",
  },
  {
    title: "Visual transcript",
    detail: "See the conversation",
  },
  {
    title: "Behind-the-scenes",
    detail: "Watch AI reasoning",
  },
  {
    title: "Quick responses",
    detail: "Click to answer",
  },
];

const phoneDemoBestFor = [
  "Experiencing realistic voice quality",
  "Testing natural conversation flow",
  "Seeing how customers will experience it",
  "Impressing your team with a demo",
];

const webDemoBestFor = [
  "Quick exploration (30 seconds)",
  "Silent environments",
  "Learning the qualification flow",
  "Seeing the workflow logic",
];

export default function DemoExperiencePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 px-6 py-16 text-white">
      <div className="w-full max-w-5xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
            <SparklesIcon className="h-4 w-4 text-white/90" />
            Choose Your Demo Experience
          </div>
          <h1 className="mt-6 text-4xl font-bold sm:text-5xl">
            How would you like to experience Sarah?
          </h1>
          <p className="mt-4 text-lg text-purple-100">
            Pick the demo style that works best for you
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="relative rounded-3xl bg-white p-8 text-slate-900 shadow-2xl">
            <div className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 text-xs font-semibold text-white">
              🔥 MOST IMPRESSIVE
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
              <PhoneIcon className="h-8 w-8" />
            </div>
            <div className="mt-6 flex items-center gap-2 text-2xl font-semibold">
              Sarah Calls You
              <span className="text-yellow-400">⚡</span>
            </div>
            <p className="mt-3 text-base text-slate-600">
              Get a real phone call from our AI agent in 30 seconds. Experience
              the full power of voice AI on your actual phone.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {phoneDemoBenefits.map((benefit) => (
                <li key={benefit.title} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="font-semibold">{benefit.title}</span>
                  <span className="text-slate-500">- {benefit.detail}</span>
                </li>
              ))}
            </ul>
            <Link
              href={getPublicHref("/sign-up?demo=phone")}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-purple-600"
            >
              Get a call from Sarah
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-8 text-slate-900 shadow-xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg">
              <ComputerDesktopIcon className="h-8 w-8" />
            </div>
            <div className="mt-6 text-2xl font-semibold">Web-Based Demo</div>
            <p className="mt-3 text-base text-slate-600">
              Try the conversation flow in your browser. Perfect if you’re in a
              meeting or can’t take a call right now.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {webDemoBenefits.map((benefit) => (
                <li key={benefit.title} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                  <span className="font-semibold">{benefit.title}</span>
                  <span className="text-slate-500">- {benefit.detail}</span>
                </li>
              ))}
            </ul>
            <Link
              href={getPublicHref("/sign-up?demo=web")}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
            >
              Start web demo
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 px-6 py-6 text-sm text-purple-100">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase">
                <PhoneIcon className="h-4 w-4" />
                Phone Demo Best For:
              </div>
              <ul className="mt-3 space-y-2">
                {phoneDemoBestFor.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase">
                <ComputerDesktopIcon className="h-4 w-4" />
                Web Demo Best For:
              </div>
              <ul className="mt-3 space-y-2">
                {webDemoBestFor.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-white/80">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Your info stays private
          </div>
          <div className="hidden h-4 w-px bg-white/30 sm:inline-block" />
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            No credit card required
          </div>
          <div className="hidden h-4 w-px bg-white/30 sm:inline-block" />
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Unsubscribe anytime
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            ← Back to homepage
          </Link>
        </div>
        <div className="mt-6 flex justify-center text-white/40">
          <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />
        </div>
      </div>
    </main>
  );
}
