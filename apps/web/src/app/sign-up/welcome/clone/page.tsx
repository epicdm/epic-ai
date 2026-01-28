import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  ArrowRight,
  Mail,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { getPublicHref } from "@/lib/routes/public";

export default async function WelcomeClonePage() {
  let name = "there";
  let email = "";
  try {
    const user = await currentUser();
    name =
      user?.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : user?.fullName ||
          user?.username ||
          user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
          "there";
    email = user?.primaryEmailAddress?.emailAddress || "";
  } catch {
    // In UAT bypass mode, currentUser() may throw because clerkMiddleware was skipped
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(138deg,_#faf5ff_0%,_#eff6ff_100%)] px-6 py-12 text-slate-900">
      <div className="mx-auto flex w-full max-w-[672px] flex-col items-center gap-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#ad46ff_0%,_#e60076_100%)] text-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold text-slate-900">
            Almost there! Just 3 quick details...
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            We&apos;ll use this info to customize Sarah for your business
          </p>
        </div>

        <div className="w-full rounded-3xl bg-white p-8 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)]">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Quick Setup Progress</span>
            <span className="font-semibold text-purple-600">Step 1 of 1</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-purple-600 to-blue-600" />
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserRound className="h-4 w-4 text-purple-500" />
                Company Name
              </label>
              <input
                type="text"
                placeholder="Your company"
                className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
              <p className="mt-2 text-xs text-slate-500">
                Sarah will introduce herself as representing your company
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Mail className="h-4 w-4 text-purple-500" />
                Contact Email
              </label>
              <input
                type="email"
                defaultValue={email}
                placeholder="you@company.com"
                className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
              <p className="mt-2 text-xs text-slate-500">
                Where demo confirmations and updates will be sent
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Phone className="h-4 w-4 text-purple-500" />
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                className="mt-2 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
              <p className="mt-2 text-xs text-slate-500">
                For SMS confirmations and important notifications
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-[linear-gradient(161deg,_#faf5ff_0%,_#eff6ff_100%)] p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-purple-500" />
              What happens after you click &quot;Create Agent&quot;
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-600">
              {[
                "We clone Sarah's workflow with your company details",
                "You get a phone number for your agent (or use your own)",
                "Test it immediately with a demo call",
                "Go live and start capturing every lead",
              ].map((item, index) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[11px] font-semibold text-purple-700">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href={getPublicHref("/sign-up/welcome/clone/overview")}
            className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,_#9810fa_0%,_#155dfc_100%)] px-6 py-4 text-sm font-semibold text-white shadow-[0_20px_25px_-12px_rgba(15,23,42,0.35)]"
          >
            <Sparkles className="h-5 w-5" />
            Create My AI Agent
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="mt-3 text-center text-xs text-slate-500">
            ⚡ Takes ~30 seconds • You can customize everything later
          </p>
        </div>

        <div className="w-full rounded-2xl border-2 border-purple-200 bg-white/70 p-6 text-center">
          <h3 className="text-sm font-semibold text-slate-900">
            Preview: What Your Agent Will Say
          </h3>
          <div className="mt-4 rounded-2xl bg-[linear-gradient(170deg,_#ad46ff_0%,_#155dfc_100%)] px-5 py-4 text-left text-xs text-white shadow-[0_15px_30px_-20px_rgba(59,7,100,0.7)]">
            <p>
              “Hi! I&apos;m Sarah, an AI agent from <strong>{name}</strong>.
              Thanks for calling!”
            </p>
            <p className="mt-2">
              “I&apos;ll ask you a few quick questions to understand your needs,
              then book you a time with our team. Sound good?”
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
