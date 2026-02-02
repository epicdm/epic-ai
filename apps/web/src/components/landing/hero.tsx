"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import { useState } from "react";

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Self-host on your own infrastructure",
    features: [
      "Unlimited agents",
      "All channels (BYOK)",
      "Community skills",
      "Full source code",
      "Bring your own DIDs",
      "Local memory & data",
    ],
    cta: "Get Started",
    href: "/sign-up",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$97",
    period: "/month",
    description: "One managed agent, fully hosted",
    features: [
      "1 AI agent",
      "1 phone number included",
      "500 voice minutes/mo",
      "Voice + WhatsApp + Web",
      "10GB knowledge base",
      "Email support",
    ],
    cta: "Start Free Trial",
    href: "/sign-up",
    highlighted: false,
  },
  {
    name: "Business",
    price: "$497",
    period: "/month",
    description: "Multi-agent operations for growing teams",
    features: [
      "5 AI agents",
      "5 phone numbers included",
      "3,000 voice minutes/mo",
      "All channels",
      "100GB knowledge base",
      "Priority support",
      "CRM integrations",
      "Advanced analytics",
    ],
    cta: "Start Free Trial",
    href: "/sign-up",
    highlighted: true,
  },
  {
    name: "Agency",
    price: "$1,997",
    period: "/month",
    description: "White-label & resell to your clients",
    features: [
      "Unlimited agents",
      "25 phone numbers included",
      "15,000 voice minutes/mo",
      "Full white-label",
      "1TB knowledge base",
      "Dedicated CSM",
      "Custom integrations",
      "Sub-accounts",
    ],
    cta: "Contact Sales",
    href: "/sign-up",
    highlighted: false,
  },
];

const features = [
  {
    icon: "📞",
    title: "Voice Agents",
    description:
      "AI that answers your phone 24/7. Books appointments, qualifies leads, handles support — in any accent, any language.",
    gradient: "from-blue-500/10 to-cyan-500/10",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
  },
  {
    icon: "💬",
    title: "Multi-Channel",
    description:
      "One agent, every channel. Phone, WhatsApp, web chat, SMS, email. Your customers choose how they talk — your agent is always there.",
    gradient: "from-green-500/10 to-emerald-500/10",
    iconBg: "bg-green-500/10 dark:bg-green-500/20",
  },
  {
    icon: "🧩",
    title: "Skills Marketplace",
    description:
      "Install capabilities like apps. CRM sync, payment collection, appointment scheduling, lead qualification — plug and play.",
    gradient: "from-purple-500/10 to-violet-500/10",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
  },
  {
    icon: "🏗️",
    title: "Your Infrastructure",
    description:
      "Self-host or cloud. Open source core. You own your agents, your data, your customer relationships. No vendor lock-in.",
    gradient: "from-orange-500/10 to-amber-500/10",
    iconBg: "bg-orange-500/10 dark:bg-orange-500/20",
  },
];

const steps = [
  {
    number: "01",
    title: "Create an Agent",
    description:
      "Name it, give it a personality, set its voice, write instructions, attach a knowledge base. Five minutes to a working AI employee.",
    icon: "🤖",
  },
  {
    number: "02",
    title: "Connect Channels",
    description:
      "Assign a phone number, connect WhatsApp, embed a web widget. Your agent goes live on every channel simultaneously.",
    icon: "🔗",
  },
  {
    number: "03",
    title: "Let It Work",
    description:
      "Your agent handles calls, captures leads, books meetings, and escalates when needed. 24/7. No sick days. No hold music.",
    icon: "⚡",
  },
];

const stats = [
  { value: "24/7", label: "Always Available" },
  { value: "<2s", label: "Response Time" },
  { value: "90%+", label: "Cost Savings vs Twilio" },
  { value: "∞", label: "Simultaneous Calls" },
];

export function LandingHero() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  return (
    <main className="min-h-screen bg-gray-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐾</span>
              <span className="text-xl font-bold text-white">
                OpenClaw
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                Pricing
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Button
                as={Link}
                href="/sign-in"
                variant="light"
                className="text-gray-300 hover:text-white"
                size="sm"
              >
                Sign In
              </Button>
              <Button
                as={Link}
                href="/sign-up"
                className="bg-white text-gray-950 font-semibold hover:bg-gray-100"
                size="sm"
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-[120px]" />
          <div className="absolute top-20 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-40 bg-cyan-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Open Source AI Agent Platform
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Every Business{" "}
              <br className="hidden sm:block" />
              Deserves an{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                AI Team
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Build, deploy, and manage AI agents that answer phones, qualify leads, 
              book appointments, and close deals — across every channel, 24/7.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                as={Link}
                href="/sign-up"
                size="lg"
                className="bg-white text-gray-950 font-semibold hover:bg-gray-100 px-8 h-12 text-base"
              >
                Start Building Free
              </Button>
              <Button
                as={Link}
                href="#how-it-works"
                size="lg"
                variant="bordered"
                className="border-white/20 text-white hover:bg-white/5 px-8 h-12 text-base"
              >
                See How It Works
              </Button>
            </div>

            <p className="text-sm text-gray-500">
              No credit card required · Deploy in 5 minutes · Open source
            </p>
          </div>

          {/* Stats bar */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything your AI workforce needs
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From a single receptionist to an army of specialized agents — 
              OpenClaw scales with your business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`relative rounded-2xl border border-white/5 bg-gradient-to-br ${feature.gradient} p-8 hover:border-white/10 transition-all duration-300`}
              >
                <div
                  className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center mb-5`}
                >
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-32 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Three steps to your AI team
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From zero to a working AI agent in under five minutes. No coding required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl">{step.icon}</span>
                  <span className="text-5xl font-bold text-white/5">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Moat Section */}
      <section className="py-20 sm:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why OpenClaw wins on cost
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Most AI agent platforms rent their voice infrastructure from Twilio at $0.02–0.08/min. 
              OpenClaw is built on owned telecom infrastructure — SIP trunks, billing, 
              and a pool of 1,000 phone numbers. That cost advantage gets passed directly to you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-3xl font-bold text-red-400 mb-2 line-through">
                $0.08/min
              </div>
              <div className="text-sm text-gray-400">Typical AI Voice Platform</div>
              <div className="text-xs text-gray-500 mt-1">Twilio markup + margin</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <div className="text-3xl font-bold text-green-400 mb-2">
                $0.01/min
              </div>
              <div className="text-sm text-gray-300">OpenClaw Voice</div>
              <div className="text-xs text-gray-400 mt-1">Own infrastructure = real savings</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-3xl font-bold text-cyan-400 mb-2">
                $0.00/min
              </div>
              <div className="text-sm text-gray-400">Self-Hosted (BYOT)</div>
              <div className="text-xs text-gray-500 mt-1">Bring your own trunks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Packages */}
      <section className="py-20 sm:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Pre-built agent packages
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Start with a template, customize to your business. Each package includes 
              trained agents, skills, and channel integrations.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Receptionist",
                price: "$97/mo",
                icon: "📞",
                description: "Answer calls, book appointments, take messages",
                agents: "Voice + Concierge",
              },
              {
                name: "Sales",
                price: "$297/mo",
                icon: "💰",
                description: "Qualify leads, run campaigns, close deals",
                agents: "Sales + Funnel + Voice",
              },
              {
                name: "Operations",
                price: "$497/mo",
                icon: "📊",
                description: "Full AI ops — calls, CRM, alerts, reports",
                agents: "ACE + Voice + Concierge",
              },
              {
                name: "Marketing",
                price: "$497/mo",
                icon: "📣",
                description: "Content, social, lead gen, follow-up calls",
                agents: "Content + Marketing + Voice",
              },
            ].map((pkg) => (
              <div
                key={pkg.name}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-white/10 transition-all"
              >
                <span className="text-3xl mb-4 block">{pkg.icon}</span>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {pkg.name}
                </h3>
                <div className="text-sm text-cyan-400 font-medium mb-3">
                  {pkg.price}
                </div>
                <p className="text-sm text-gray-400 mb-4">{pkg.description}</p>
                <div className="text-xs text-gray-500 border-t border-white/5 pt-3">
                  {pkg.agents}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Start free. Scale when you&apos;re ready. No surprises.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 ${
                  tier.highlighted
                    ? "bg-gradient-to-b from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 relative"
                    : "bg-white/[0.02] border border-white/5"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-500 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white mb-1">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-white">
                    {tier.price}
                  </span>
                  <span className="text-sm text-gray-400">{tier.period}</span>
                </div>
                <p className="text-sm text-gray-400 mb-6">
                  {tier.description}
                </p>
                <Button
                  as={Link}
                  href={tier.href}
                  className={`w-full mb-6 ${
                    tier.highlighted
                      ? "bg-white text-gray-950 font-semibold"
                      : "bg-white/5 text-white border border-white/10"
                  }`}
                  size="sm"
                >
                  {tier.cta}
                </Button>
                <ul className="space-y-2.5">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to build your AI team?
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Open source. Caribbean built. Global ambition.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              as={Link}
              href="/sign-up"
              size="lg"
              className="bg-white text-gray-950 font-semibold hover:bg-gray-100 px-8 h-12 text-base"
            >
              Start Building Free
            </Button>
            <Button
              as="a"
              href="https://github.com/openclaw/openclaw"
              target="_blank"
              size="lg"
              variant="bordered"
              className="border-white/20 text-white hover:bg-white/5 px-8 h-12 text-base"
            >
              ⭐ Star on GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🐾</span>
                <span className="font-bold text-white">OpenClaw</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                AI agents that actually work. Built on owned telecom infrastructure 
                in the Caribbean, serving the world.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Skills Marketplace</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-3">Community</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://github.com/openclaw/openclaw" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="https://discord.com/invite/clawd" className="hover:text-white transition-colors">Discord</a></li>
                <li><a href="https://clawhub.com" className="hover:text-white transition-colors">ClawHub</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} EPIC Communications Inc. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
