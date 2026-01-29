import Link from "next/link";
import {
  ArrowRight,
  ArrowRightCircle,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  Phone,
  Play,
  Sparkles,
  Target,
} from "lucide-react";
import { getPublicHref } from "@/lib/routes/public";

type WelcomeSetupScreenProps = {
  name?: string;
  cta?: {
    title: string;
    description: string;
    buttonLabel: string;
    buttonHref: string;
  };
};

export default function WelcomeSetupScreen({
  name = "there",
  cta,
}: WelcomeSetupScreenProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(132deg,_#faf5ff_0%,_#eff6ff_100%)] text-slate-900">
      <div className="bg-gradient-to-r from-[#9810fa] to-[#155dfc] px-6 pb-14 pt-12 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="h-10 w-10" />
          </div>
          <h1 className="mt-6 text-4xl font-semibold sm:text-5xl">
            Welcome to Epic AI, {name}! 🎉
          </h1>
          <p className="mt-4 text-xl text-purple-100">
            You just experienced the future of sales automation.
          </p>
          <p className="mt-2 text-lg text-purple-200/80">
            Now let&apos;s build your own AI sales agent in the next 60 seconds.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="-mt-16 rounded-3xl bg-white p-8 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#ad46ff_0%,_#155dfc_100%)] text-white">
              <Play className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900">
                What You Just Experienced
              </div>
              <div className="text-sm text-slate-500">
                Sarah&apos;s complete qualification workflow
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                title: "Instant Call Answering",
                body: "Answers every call in <2 seconds",
                stat: "99.9% uptime",
                icon: Phone,
              },
              {
                title: "BANT Qualification",
                body: "5 strategic questions to qualify leads",
                stat: "85% accuracy",
                icon: Target,
              },
              {
                title: "Auto Demo Booking",
                body: "Books meetings directly to your calendar",
                stat: "3x more demos",
                icon: CalendarCheck,
              },
              {
                title: "Smart Lead Scoring",
                body: "Scores prospects 0-100 in real-time",
                stat: "70+ = high intent",
                icon: BadgeCheck,
              },
            ].map(({ title, body, stat, icon: Icon }) => (
              <div
                key={title}
                className="rounded-2xl bg-[linear-gradient(168deg,_#faf5ff_0%,_#eff6ff_100%)] p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{body}</div>
                    <div className="mt-2 text-xs font-semibold text-purple-600">
                      {stat}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border-2 border-emerald-100 bg-gradient-to-r from-emerald-50 to-emerald-100/50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-6 w-6 text-emerald-500" />
              <div>
                <div className="text-sm font-semibold text-emerald-900">
                  This exact workflow is now yours
                </div>
                <div className="mt-2 text-xs text-emerald-700">
                  Sarah qualified you, booked your demo, and sent confirmations—all
                  automatically. You can deploy this same agent for your business in
                  under 60 seconds.
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-emerald-700">
                  {[
                    "Qualification Logic",
                    "Booking Integration",
                    "SMS/Email Confirmations",
                    "CRM Sync",
                  ].map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-emerald-100 px-3 py-1"
                    >
                      ✓ {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">
            Choose Your Setup Path
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Both options are quick, but you decide the level of control
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Link
            href={getPublicHref("/sign-up/welcome/clone")}
            className="group relative rounded-2xl border-4 border-[#ad46ff] bg-[#faf5ff] p-6 shadow-[0_20px_40px_-20px_rgba(168,85,247,0.4)] transition hover:-translate-y-1"
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow">
              ⚡ RECOMMENDED
            </span>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#ad46ff_0%,_#e60076_100%)] text-white shadow-lg">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <div className="text-xl font-semibold text-slate-900">
                  Clone Sarah
                </div>
                <div className="text-sm font-semibold text-purple-600">
                  30 seconds setup
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Deploy Sarah&apos;s exact workflow for your business. We&apos;ll just
              swap in your company details and you&apos;re live.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-600">
              {[
                "Pre-built qualification questions",
                "Automatic booking & confirmations",
                "Ready to test immediately",
                "Customize later if needed",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-purple-600">
              Get live in 30 seconds
              <ArrowRightCircle className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href={getPublicHref("/sign-up/welcome/custom")}
            className="group rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.2)] transition hover:-translate-y-1"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#2b7fff_0%,_#9810fa_100%)] text-white shadow-lg">
                <ArrowRight className="h-7 w-7" />
              </div>
              <div>
                <div className="text-xl font-semibold text-slate-900">
                  Custom Setup
                </div>
                <div className="text-sm font-semibold text-blue-600">
                  60 seconds setup
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Build your agent from scratch with our guided wizard. Full control over
              personality, questions, and workflows.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-600">
              {[
                "Choose your use case (sales, support, etc.)",
                "Customize agent personality & voice",
                "Write your own qualification questions",
                "Design custom workflows",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
              Full customization
              <ArrowRightCircle className="h-4 w-4" />
            </div>
          </Link>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-[0_20px_40px_-20px_rgba(15,23,42,0.2)]">
          <h3 className="text-2xl font-semibold text-slate-900">
            {cta?.title || "Perfect! Let's clone Sarah for your business"}
          </h3>
          <p className="mt-3 text-sm text-slate-600">
            {cta?.description ||
              "Get Sarah's exact qualification workflow running for your company in under 60 seconds."}
          </p>
          <Link
            href={cta?.buttonHref || getPublicHref("/sign-up/welcome/clone")}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,_#ad46ff_0%,_#155dfc_100%)] px-8 py-4 text-base font-semibold text-white shadow-[0_12px_30px_-18px_rgba(79,70,229,0.8)] transition hover:shadow-[0_16px_40px_-12px_rgba(79,70,229,0.6)]"
          >
            {cta?.buttonLabel || "Clone Sarah Now"}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            No credit card required
          </span>
          <span className="hidden h-4 w-px bg-slate-200 sm:inline-flex" />
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Edit everything later
          </span>
          <span className="hidden h-4 w-px bg-slate-200 sm:inline-flex" />
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Cancel anytime
          </span>
        </div>
      </div>
    </div>
  );
}
