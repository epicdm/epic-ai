"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import { getPublicHref } from "@/lib/routes/public";
import {
  Zap as BoltIcon,
  CheckCircle as CheckCircleIcon,
  ChevronDown as ChevronDownIcon,
  Phone as PhoneIcon,
  Rocket as RocketLaunchIcon,
  Sparkles as SparklesIcon,
  Users as UserGroupIcon,
} from "lucide-react";

export function LandingHero() {
  const trustedLogos = [
    "TechCorp",
    "GrowthScale",
    "SalesHub",
    "CloudNine",
    "FastTrack",
    "LeadGen Pro",
  ];

  const featureCards = [
    {
      title: "Never Miss a Lead",
      badge: "99.9% uptime",
      description:
        "AI answers every call instantly. No voicemail, no hold times, no missed opportunities.",
      icon: PhoneIcon,
    },
    {
      title: "Auto-Book Demos",
      badge: "3x more demos",
      description:
        "AI qualifies leads and books meetings directly into your calendar while you sleep.",
      icon: BoltIcon,
    },
    {
      title: "Natural Conversations",
      badge: "4.8/5 rating",
      description:
        "Advanced voice AI that sounds human, handles interruptions, and adapts to any scenario.",
      icon: SparklesIcon,
    },
    {
      title: "Deploy in 60 Seconds",
      badge: "60 sec setup",
      description:
        "Pre-built workflows for sales, support, and booking. Copy, customize, launch.",
      icon: RocketLaunchIcon,
    },
  ];

  const useCases = [
    {
      title: "Sales Qualification",
      description: "Qualify leads, book demos, and update CRM automatically.",
    },
    {
      title: "Inbound Routing",
      description: "Route calls to the right rep based on intent and priority.",
    },
    {
      title: "Customer Support",
      description: "Resolve FAQs instantly and escalate only when needed.",
    },
    {
      title: "Appointment Reminders",
      description: "Confirm, reschedule, and reduce no-shows at scale.",
    },
  ];

  const setupSteps = [
    {
      title: "Choose an Agent",
      description: "Pick a sales, receptionist, or survey agent template.",
    },
    {
      title: "AI Configures",
      description: "AI writes scripts, routing, and default behaviors.",
    },
    {
      title: "Launch & Scale",
      description: "Go live, monitor results, and optimize instantly.",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Mitchell",
      role: "VP Sales, TechStart",
      quote:
        "We doubled demo bookings in two weeks. The AI handles every inbound call flawlessly.",
    },
    {
      name: "Marcus Chen",
      role: "Founder, GrowthScale",
      quote:
        "Setup took minutes. The agent sounds natural and books meetings 24/7.",
    },
    {
      name: "Jessica Park",
      role: "Head of Revenue, CloudNine",
      quote:
        "We stopped missing leads overnight. The AI routes hot prospects instantly.",
    },
  ];

  const pricing = [
    {
      name: "Starter",
      price: "$99/mo",
      description: "Perfect for new teams testing AI voice.",
      features: ["1 AI agent", "500 minutes", "Basic analytics", "Email support"],
      cta: "Start Free",
    },
    {
      name: "Growth",
      price: "$299/mo",
      description: "Scale bookings with automation.",
      features: [
        "5 AI agents",
        "5,000 minutes",
        "CRM + Calendar",
        "Priority support",
      ],
      cta: "Go Growth",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Advanced workflows and compliance.",
      features: [
        "Unlimited agents",
        "Custom routing",
        "Security reviews",
        "Dedicated success",
      ],
      cta: "Contact Sales",
    },
  ];

  return (
    <main className="bg-white text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-10 -top-10 h-72 w-72 rounded-full bg-purple-300 blur-3xl" />
          <div className="absolute right-10 top-0 h-72 w-72 rounded-full bg-blue-300 blur-3xl" />
          <div className="absolute bottom-10 left-10 h-64 w-64 rounded-full bg-pink-300 blur-3xl" />
        </div>
        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <span className="text-2xl font-bold text-white">Epic AI</span>
          <div className="flex items-center gap-3">
            <Button
              as={Link}
              href={getPublicHref("/sign-in")}
              variant="light"
              className="text-white"
            >
              Sign In
            </Button>
            <Button
              as={Link}
              href={getPublicHref("/sign-up")}
              color="primary"
              className="bg-white text-purple-700"
            >
              Get Started
            </Button>
          </div>
        </nav>
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-10 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/90">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300/70" />
              <span>1,284 calls handled today</span>
            </div>
            <span className="hidden h-4 w-px bg-white/40 sm:inline-block" />
            <div className="flex items-center gap-2">
              <UserGroupIcon className="h-4 w-4 text-white/90" />
              <span>2,847+ businesses using Epic AI</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm text-white">
            <SparklesIcon className="h-4 w-4 text-yellow-200" />
            Built by AI • Powered by Voice • Trusted by 1000s
          </div>
          <h1 className="mt-10 text-4xl font-bold text-white sm:text-6xl">
            Build AI Voice Agents
            <span className="block bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
              in 60 Seconds
            </span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-purple-100 sm:text-xl">
            Stop losing leads to voicemail. Let AI answer every call, qualify prospects, and
            book demos while you sleep.
          </p>
          <p className="mt-2 text-lg font-semibold text-white">No coding required.</p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button
              as={Link}
              href={getPublicHref("/sign-up")}
              size="lg"
              className="bg-white text-purple-700 shadow-xl"
            >
              Talk to Our AI Sales Agent
            </Button>
            <Button
              as={Link}
              href={getPublicHref("/demo")}
              size="lg"
              variant="bordered"
              className="border-white/40 text-white"
            >
              Watch 60-Second Demo
            </Button>
          </div>
          <p className="mt-6 text-sm text-purple-100">
            🎁 First 100 signups get lifetime 50% discount • No credit card required
          </p>
          <div className="mt-10 grid w-full max-w-4xl grid-cols-2 gap-4 rounded-2xl border border-white/20 bg-white/10 p-6 text-left text-white sm:grid-cols-4">
            {[
              { name: "Sarah M.", company: "TechStart Inc", time: "2m ago" },
              { name: "Mike Chen", company: "GrowthLabs", time: "5m ago" },
              { name: "Jessica P.", company: "CloudScale", time: "8m ago" },
              { name: "David K.", company: "SalesForce Pro", time: "12m ago" },
            ].map((entry) => (
              <div key={entry.name} className="rounded-xl bg-white/10 p-3">
                <p className="text-sm font-semibold">{entry.name}</p>
                <p className="text-xs text-purple-100">{entry.company}</p>
                <p className="text-xs text-purple-200">{entry.time}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center justify-center text-white/70">
            <ChevronDownIcon className="h-6 w-6" />
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Trusted by fast-growing companies
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 text-xl font-semibold text-slate-400">
            {trustedLogos.map((logo) => (
              <span key={logo}>{logo}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">
            <SparklesIcon className="h-4 w-4" />
            Powerful Features
          </div>
          <h2 className="mt-6 text-4xl font-bold text-slate-900">
            Everything you need to scale sales
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Pre-built workflows that work out of the box. No complex setup, no steep learning curve.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {feature.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-600">{feature.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-gradient-to-br from-slate-50 to-purple-50 py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-4xl font-bold text-slate-900">One platform, infinite use cases</h2>
          <p className="mt-4 text-lg text-slate-600">Start with templates, customize in seconds</p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 h-2 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-400" />
                <h3 className="text-lg font-semibold text-slate-900">{useCase.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-4xl font-bold text-slate-900">From zero to AI agent in 60 seconds</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {setupSteps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
        <Button
          as={Link}
          href={getPublicHref("/sign-up")}
          color="primary"
          size="lg"
          className="mt-10"
        >
          Try in 60 Seconds
        </Button>
      </section>

      <section className="bg-purple-700 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-4xl font-bold">Loved by businesses worldwide</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="rounded-2xl bg-white/10 p-6 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <UserGroupIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-purple-100">{testimonial.role}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-purple-50">“{testimonial.quote}”</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-slate-900">Simple, transparent pricing</h2>
          <p className="mt-4 text-lg text-slate-600">Pick a plan that grows with you.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {pricing.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 shadow-sm ${
                plan.highlighted
                  ? "border-purple-500 bg-purple-600 text-white"
                  : "border-slate-200 bg-white"
              }`}
            >
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold">{plan.price}</p>
              <p className={`mt-2 text-sm ${plan.highlighted ? "text-purple-100" : "text-slate-600"}`}>
                {plan.description}
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircleIcon
                      className={`h-4 w-4 ${plan.highlighted ? "text-white" : "text-emerald-500"}`}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                as={Link}
                href={getPublicHref("/sign-up")}
                color="primary"
                className={`mt-6 w-full ${
                  plan.highlighted ? "bg-white text-purple-700" : ""
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-purple-600 to-blue-600 py-20 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 text-center">
          <h2 className="text-4xl font-bold">Ready to 10x your sales with AI?</h2>
          <p className="mt-4 text-lg text-purple-100">
            Start in minutes. Talk to our AI sales agent and see the difference.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button
              as={Link}
              href={getPublicHref("/sign-up")}
              color="primary"
              className="bg-white text-purple-700"
            >
              Talk to AI Agent
            </Button>
            <Button
              as={Link}
              href={getPublicHref("/sign-up")}
              variant="bordered"
              className="border-white/40 text-white"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 py-12 text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 md:flex-row md:justify-between">
          <div>
            <p className="text-xl font-semibold text-white">Epic AI</p>
            <p className="mt-2 text-sm text-slate-400">
              Build AI voice agents that close deals while you sleep.
            </p>
          </div>
          <div className="grid gap-6 text-sm sm:grid-cols-3">
            <div className="space-y-2">
              <p className="font-semibold text-white">Product</p>
              <p>Agents</p>
              <p>Pricing</p>
              <p>Security</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-white">Company</p>
              <p>About</p>
              <p>Careers</p>
              <p>Contact</p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-white">Legal</p>
              <p>Privacy</p>
              <p>Terms</p>
              <p>Security</p>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-slate-800 px-6 pt-6 text-center text-xs">
          © 2026 Epic AI. All rights reserved. Built with AI for businesses that move fast.
        </div>
      </footer>
    </main>
  );
}
