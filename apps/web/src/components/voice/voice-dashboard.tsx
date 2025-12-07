"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, Button, Chip, Spinner } from "@heroui/react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Phone, Plus, Bot, Clock, TrendingUp } from "lucide-react";

interface VoiceAgent {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDeployed: boolean;
  brand: { id: string; name: string };
  phoneNumbers: { id: string; number: string }[];
  _count: { calls: number };
}

export function VoiceDashboard() {
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch("/api/voice/agents");
        if (!response.ok) throw new Error("Failed to fetch agents");
        const data = await response.json();
        setAgents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Voice AI"
        description="Manage your AI voice agents for automated phone calls."
        actions={
          <Button
            as={Link}
            href="/dashboard/voice/agents/new"
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
          >
            Create Agent
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {agents.length}
                </p>
                <p className="text-sm text-gray-500">Active Agents</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {agents.reduce((acc, a) => acc + a._count.calls, 0)}
                </p>
                <p className="text-sm text-gray-500">Total Calls</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  0m
                </p>
                <p className="text-sm text-gray-500">Call Minutes</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  0%
                </p>
                <p className="text-sm text-gray-500">Success Rate</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Agents List */}
      {error ? (
        <Card>
          <CardBody className="p-6 text-center">
            <p className="text-red-500">{error}</p>
          </CardBody>
        </Card>
      ) : agents.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Create Your First Voice Agent
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Voice agents can handle inbound and outbound calls, qualify leads,
              book appointments, and more.
            </p>
            <Button
              as={Link}
              href="/dashboard/voice/agents/new"
              color="primary"
              size="lg"
            >
              Create Agent
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Agents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link key={agent.id} href={`/dashboard/voice/agents/${agent.id}`}>
                <Card isPressable className="h-full hover:shadow-md transition-shadow">
                  <CardBody className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex gap-2">
                        {agent.isDeployed && (
                          <Chip size="sm" color="success" variant="flat">
                            Live
                          </Chip>
                        )}
                        <Chip
                          size="sm"
                          color={agent.isActive ? "primary" : "default"}
                          variant="flat"
                        >
                          {agent.isActive ? "Active" : "Inactive"}
                        </Chip>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {agent.description || "No description"}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{agent._count.calls} calls</span>
                      <span>{agent.phoneNumbers.length} numbers</span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/voice/calls">
          <Card isPressable className="hover:shadow-md transition-shadow">
            <CardBody className="p-6 text-center">
              <Phone className="w-8 h-8 mx-auto mb-3 text-gray-400" />
              <h3 className="font-medium text-gray-900 dark:text-white">
                Call History
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                View all call logs and recordings
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/voice/numbers">
          <Card isPressable className="hover:shadow-md transition-shadow">
            <CardBody className="p-6 text-center">
              <span className="text-3xl block mb-3">📞</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Phone Numbers
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Manage your phone numbers
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/voice/test">
          <Card isPressable className="hover:shadow-md transition-shadow">
            <CardBody className="p-6 text-center">
              <span className="text-3xl block mb-3">🧪</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Test Console
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Test agents in your browser
              </p>
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  );
}
