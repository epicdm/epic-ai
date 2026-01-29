import { SignIn, SignUp } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Headphones,
  Link2,
  Monitor,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import WebDemoClient from "./web-demo-client";
import PhoneDemoClient from "./phone-demo-client";
import WelcomeSetupScreen from "../welcome-setup";
import { getPublicHref } from "@/lib/routes/public";

type SignUpPageProps = {
  searchParams?: {
    demo?: string;
    step?: string;
    mode?: string;
  };
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const demo = (await searchParams)?.demo;
  const step = (await searchParams)?.step;
  const mode = (await searchParams)?.mode;

  if (demo === "phone") {


    if (step === "confirm") {
      return (
        <div className="min-h-screen w-full bg-[linear-gradient(125deg,_#faf5ff_0%,_#eff6ff_100%)] px-6 py-12 text-slate-900">
          <div className="mx-auto w-full max-w-[1104px]">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#00c950_0%,_#009966_100%)] text-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h1 className="mt-6 text-4xl font-semibold text-slate-900">
                Demo Booked! 🎉
              </h1>
              <p className="mt-3 text-lg text-slate-600">
                Hi John Smith! We&apos;re excited to show you Epic AI.
              </p>
              <p className="mt-1 text-base text-slate-500">
                Check your phone and email for confirmations
              </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="rounded-2xl border-2 border-purple-100 bg-white p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Your Demo Details
                  </h2>
                  <div className="mt-6 space-y-4 text-sm text-slate-700">
                    <div className="rounded-xl bg-purple-50 p-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="mt-1 h-5 w-5 text-purple-500" />
                        <div>
                          <div className="font-semibold text-slate-900">When</div>
                          <div>Thursday, January 22, 2026</div>
                          <div>2:00 PM UTC</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <Link2 className="mt-1 h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">Zoom Link</div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 rounded border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
                              https://zoom.us/j/123456789
                            </div>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-4">
                      <div className="flex items-start gap-3">
                        <Clock className="mt-1 h-5 w-5 text-emerald-500" />
                        <div>
                          <div className="font-semibold text-slate-900">Duration</div>
                          <div>15 minutes</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-6">
                    <Link
                      href="https://calendar.google.com"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white"
                    >
                      <Calendar className="h-4 w-4" />
                      Add to Calendar
                    </Link>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Confirmations Sent
                  </h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    {[
                      ["SMS Confirmation", "Sent to your phone"],
                      ["Email Confirmation", "Sent with demo details"],
                      ["Calendar Invite", ".ics file attached"],
                    ].map(([label, detail]) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{label}</div>
                          <div className="text-xs text-slate-500">{detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl bg-white p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <h3 className="text-lg font-semibold text-slate-900">
                    What Happens Next
                  </h3>
                  <div className="mt-6 space-y-6 text-sm text-slate-600">
                    {[
                      {
                        label: "Now",
                        title: "Confirmations Sent",
                        subtitle: "Check your email and phone",
                        active: true,
                      },
                      {
                        label: "24 hours before",
                        title: "Reminder #1",
                        subtitle: "SMS + Email with prep materials",
                      },
                      {
                        label: "1 hour before",
                        title: "Reminder #2",
                        subtitle: "SMS with Zoom link",
                      },
                      {
                        label: "15 min before",
                        title: "Final Reminder",
                        subtitle: "Last call to join",
                      },
                      {
                        label: "Thu, Jan 22, 2:00 PM",
                        title: "Demo Call",
                        subtitle: "15-minute live demo",
                      },
                    ].map((item, index) => (
                      <div key={item.title} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              item.active
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-200 text-slate-400"
                            }`}
                          >
                            {item.active ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-slate-400" />
                            )}
                          </div>
                          {index < 4 && <div className="h-10 w-px bg-slate-200" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold uppercase text-purple-600">
                            {item.label}
                          </div>
                          <div className="text-sm font-semibold text-slate-900">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 p-8 text-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Sparkles className="h-5 w-5" />
                    Want to see what just happened?
                  </div>
                  <p className="mt-3 text-sm text-purple-100">
                    The AI agent that just qualified you and booked this meeting is
                    available as a pre-built template. You can deploy the EXACT same
                    workflow for your business in 60 seconds.
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-purple-50">
                    <div>• Qualified you using BANT framework</div>
                    <div>• Scored your intent: 85/100</div>
                    <div>• Booked meeting automatically</div>
                    <div>• Sent confirmations via SMS + Email</div>
                    <div>• Scheduled automated reminders</div>
                  </div>
                  <button
                    type="button"
                    className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-purple-600"
                  >
                    View the Workflow That Sold You →
                  </button>
                  <Link
                    href={getPublicHref("/sign-up?demo=clone")}
                    className="mt-3 block w-full rounded-xl border-2 border-white/80 px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    Clone This for My Business
                  </Link>
                </div>

                <div className="rounded-2xl bg-white p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Before the Demo
                  </h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    {[
                      "Think about your top 3 sales bottlenecks",
                      "Have your calendar handy for implementation timeline",
                      "Bring questions - we'll customize the demo to your needs",
                    ].map((item, index) => (
                      <div key={item} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-600">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-8 text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                This was pretty cool, right?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Share your experience with your network
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Share on LinkedIn
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Share on X
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }



    return <PhoneDemoClient initialStep={step ?? "start"} />;
  }

  if (demo === "web") {
    if (step === "confirm") {
      return (
        <div className="min-h-screen w-full bg-[linear-gradient(125deg,_#faf5ff_0%,_#eff6ff_100%)] px-6 py-12 text-slate-900">
          <div className="mx-auto w-full max-w-[1104px]">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#00c950_0%,_#009966_100%)] text-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h1 className="mt-6 text-4xl font-semibold text-slate-900">
                Demo Booked! 🎉
              </h1>
              <p className="mt-3 text-lg text-slate-600">
                Hi Sarah Johnson! We&apos;re excited to show you Epic AI.
              </p>
              <p className="mt-1 text-base text-slate-500">
                Check your phone and email for confirmations
              </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <div className="rounded-2xl border-2 border-purple-100 bg-white p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Your Demo Details
                  </h2>
                  <div className="mt-6 space-y-4 text-sm text-slate-700">
                    <div className="rounded-xl bg-purple-50 p-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="mt-1 h-5 w-5 text-purple-500" />
                        <div>
                          <div className="font-semibold text-slate-900">When</div>
                          <div>Thursday, January 22, 2026</div>
                          <div>2:00 PM UTC</div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <Link2 className="mt-1 h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">Zoom Link</div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 rounded border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
                              https://zoom.us/j/123456789
                            </div>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-4">
                      <div className="flex items-start gap-3">
                        <Clock className="mt-1 h-5 w-5 text-emerald-500" />
                        <div>
                          <div className="font-semibold text-slate-900">Duration</div>
                          <div>15 minutes</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 border-t border-slate-200 pt-6">
                    <Link
                      href="https://calendar.google.com"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white"
                    >
                      <Calendar className="h-4 w-4" />
                      Add to Calendar
                    </Link>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Confirmations Sent
                  </h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    {[
                      ["SMS Confirmation", "Sent to your phone"],
                      ["Email Confirmation", "Sent with demo details"],
                      ["Calendar Invite", ".ics file attached"],
                    ].map(([label, detail]) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{label}</div>
                          <div className="text-xs text-slate-500">{detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl bg-white p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <h3 className="text-lg font-semibold text-slate-900">
                    What Happens Next
                  </h3>
                  <div className="mt-6 space-y-6 text-sm text-slate-600">
                    {[
                      {
                        label: "Now",
                        title: "Confirmations Sent",
                        subtitle: "Check your email and phone",
                        active: true,
                      },
                      {
                        label: "24 hours before",
                        title: "Reminder #1",
                        subtitle: "SMS + Email with prep materials",
                      },
                      {
                        label: "1 hour before",
                        title: "Reminder #2",
                        subtitle: "SMS with Zoom link",
                      },
                      {
                        label: "15 min before",
                        title: "Final Reminder",
                        subtitle: "Last call to join",
                      },
                      {
                        label: "Thu, Jan 22, 2:00 PM",
                        title: "Demo Call",
                        subtitle: "15-minute live demo",
                      },
                    ].map((item, index) => (
                      <div key={item.title} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              item.active
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-200 text-slate-400"
                            }`}
                          >
                            {item.active ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-slate-400" />
                            )}
                          </div>
                          {index < 4 && <div className="h-10 w-px bg-slate-200" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold uppercase text-purple-600">
                            {item.label}
                          </div>
                          <div className="text-sm font-semibold text-slate-900">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500">{item.subtitle}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-[linear-gradient(135deg,_#ad46ff_0%,_#155dfc_100%)] p-8 text-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Sparkles className="h-5 w-5" />
                    Want to see what just happened?
                  </div>
                  <p className="mt-3 text-sm text-purple-100">
                    The AI agent that just qualified you and booked this meeting is
                    available as a pre-built template. You can deploy the EXACT same
                    workflow for your business in 60 seconds.
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-purple-50">
                    <div>• Qualified you using BANT framework</div>
                    <div>• Scored your intent: 70/100</div>
                    <div>• Booked meeting automatically</div>
                    <div>• Sent confirmations via SMS + Email</div>
                    <div>• Scheduled automated reminders</div>
                  </div>
                  <button
                    type="button"
                    className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-purple-600"
                  >
                    View the Workflow That Sold You
                  </button>
                  <Link
                    href={getPublicHref("/sign-up?demo=clone")}
                    className="mt-3 block w-full rounded-xl border-2 border-white/80 px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    Clone This for My Business
                  </Link>
                </div>

                <div className="rounded-2xl bg-white p-8 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Before the Demo
                  </h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    {[
                      "Think about your top 3 sales bottlenecks",
                      "Have your calendar handy for implementation timeline",
                      "Bring questions - we'll customize the demo to your needs",
                    ].map((item, index) => (
                      <div key={item} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-600">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-8 text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                This was pretty cool, right?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Share your experience with your network
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Share on LinkedIn
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Share on X
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return <WebDemoClient />;

  }

  if (step === "welcome") {
    const user = await currentUser();
    const name =
      user?.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : user?.fullName ||
          user?.username ||
          user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
          "there";
    return <WelcomeSetupScreen name={name} />;
  }

  if (demo === "clone") {

    if (mode === "login") {
      return (
        <div className="min-h-screen bg-[linear-gradient(144deg,_#faf5ff_0%,_#eff6ff_100%)] px-6 py-12 text-slate-900">
          <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-2 lg:items-center">
            <div className="hidden lg:block">
              <div className="rounded-[32px] bg-[linear-gradient(120deg,_#9810fa_0%,_#155dfc_100%)] p-10 text-white shadow-[0_30px_60px_-30px_rgba(79,70,229,0.6)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h1 className="mt-6 text-4xl font-semibold leading-tight">
                  You&apos;re moments away from deploying your AI agent
                </h1>
                <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-lg font-semibold">
                  🚀 Sign up to clone Sarah&apos;s workflow for your business
                </div>
                <p className="mt-6 text-lg text-purple-100">
                  Start your free trial and get instant access to:
                </p>
                <div className="mt-6 space-y-4 text-sm">
                  {[
                    ["Clone Sarah's Workflow", "Deploy the exact AI that qualified you"],
                    ["Unlimited Test Calls", "Perfect your agent before going live"],
                    ["Visual Workflow Builder", "Drag-and-drop agent orchestration"],
                    ["100 Free Minutes", "Enough to qualify ~30 leads"],
                    ["CRM & Calendar Integration", "Connect to your existing tools"],
                    ["Analytics Dashboard", "Track performance in real-time"],
                  ].map(([title, description]) => (
                    <div key={title} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-200" />
                      <div>
                        <div className="text-base font-semibold">{title}</div>
                        <div className="text-purple-200">{description}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 px-5 py-4">
                  <div className="text-xs uppercase tracking-wide text-purple-200">
                    Special offer
                  </div>
                  <div className="mt-2 text-xl font-semibold">
                    First 100 signups get 50% off forever
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] bg-white p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.45)] sm:p-10">
              <div className="mx-auto flex max-w-md flex-col">
                <div className="mb-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#ad46ff_0%,_#155dfc_100%)] text-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold text-slate-900">
                    Welcome back!
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Log in to access your agents
                  </p>
                </div>

                <SignIn
                  appearance={{
                    elements: {
                      rootBox: "mx-auto w-full",
                      card: "shadow-none border-0",
                      footerAction: "text-sm font-semibold text-purple-600",
                      footerActionLink: "text-purple-600 hover:text-purple-700",
                      footerActionText: "text-slate-500",
                      footer: "mt-6",
                      socialButtonsBlockButton:
                        "border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50",
                      socialButtonsProviderIcon: "text-slate-700",
                    },
                  }}
                />

                <Link
                  href={getPublicHref("/sign-up?demo=clone")}
                  className="mt-6 text-center text-sm font-semibold text-purple-600"
                >
                  Don&apos;t have an account? Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,_#f8f4ff_0%,_#eef2ff_45%,_#f0f7ff_100%)] px-6 py-12 text-slate-900">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-2 lg:items-center">
          <div className="hidden lg:block">
            <div className="rounded-[32px] bg-[linear-gradient(135deg,_#6d28d9_0%,_#2563eb_100%)] p-10 text-white shadow-[0_30px_60px_-30px_rgba(79,70,229,0.6)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                <Sparkles className="h-7 w-7" />
              </div>
              <h1 className="mt-6 text-4xl font-semibold leading-tight">
                You&apos;re moments away from deploying your AI agent
              </h1>
              <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-lg font-semibold">
                Clone Sarah&apos;s exact workflow, then customize it for your business.
              </div>
              <p className="mt-6 text-lg text-purple-100">
                Start your free trial and get instant access to:
              </p>
              <div className="mt-6 space-y-4 text-sm">
                {[
                  ["Clone Sarah's Workflow", "Deploy the exact AI that qualified you"],
                  ["Unlimited Test Calls", "Perfect your agent before going live"],
                  ["Visual Workflow Builder", "Drag-and-drop agent orchestration"],
                  ["100 Free Minutes", "Enough to qualify ~30 leads"],
                  ["CRM & Calendar Integration", "Connect to your existing tools"],
                  ["Analytics Dashboard", "Track performance in real-time"],
                ].map(([title, description]) => (
                  <div key={title} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-200" />
                    <div>
                      <div className="text-base font-semibold">{title}</div>
                      <div className="text-purple-200">{description}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 px-5 py-4">
                <div className="text-xs uppercase tracking-wide text-purple-200">
                  Special offer
                </div>
                <div className="mt-2 text-xl font-semibold">
                  First 100 signups get 50% off forever
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.45)] sm:p-10">
            <div className="mx-auto flex max-w-md flex-col">
              <div className="mb-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#7c3aed_0%,_#2563eb_100%)] text-white">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-slate-900">
                  Start your free trial
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  No credit card required • 100 free minutes
                </p>
              </div>

              <SignUp
                forceRedirectUrl="/sign-up/welcome"
                appearance={{
                  elements: {
                    rootBox: "mx-auto w-full",
                    card: "shadow-none border-0",
                    footerAction: "text-sm font-semibold text-purple-600",
                    footerActionLink: "text-purple-600 hover:text-purple-700",
                    footerActionText: "text-slate-500",
                    footer: "mt-6",
                    socialButtonsBlockButton:
                      "border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50",
                    socialButtonsProviderIcon: "text-slate-700",
                  },
                }}
              />

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  No credit card
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  100 free minutes
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Cancel anytime
                </span>
              </div>
              <Link
                href={getPublicHref("/sign-up?demo=clone&mode=login")}
                className="mt-6 text-center text-sm font-semibold text-purple-600"
              >
                Already have an account? Log in
              </Link>

              <Link
                href={getPublicHref("/sign-up")}
                className="mt-6 text-center text-sm font-semibold text-slate-500"
              >
                ← Back to demo options
              </Link>
            </div>
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
            href={getPublicHref("/sign-up?demo=phone")}
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
            href={getPublicHref("/sign-up?demo=web")}
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
              forceRedirectUrl="/sign-up/welcome"
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "shadow-none border-0",
                  footerAction: "text-sm font-semibold text-purple-600",
                  footerActionLink: "text-purple-600 hover:text-purple-700",
                  footerActionText: "text-slate-500",
                  footer: "mt-4",
                  socialButtonsBlockButton:
                    "border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50",
                  socialButtonsProviderIcon: "text-slate-700",
                },
              }}
            />
            <div className="mt-4 text-center text-sm text-slate-500">
              <Link
                href={getPublicHref("/sign-up")}
                className="font-semibold text-slate-700"
              >
                Close
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
