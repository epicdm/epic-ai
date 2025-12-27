"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import { Target, Users, Compass, TrendingUp } from "lucide-react";

interface Audience {
  id: string;
  name: string;
  description: string | null;
  isPrimary: boolean;
  ageRange: string | null;
}

interface Pillar {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  topics: string[];
  isActive: boolean;
}

interface BrandBrain {
  id: string;
  mission: string | null;
  values: string[];
  industry: string | null;
  targetMarket: string | null;
  uniqueSellingPoints: string[];
  audiences: Audience[];
  pillars: Pillar[];
}

export default function BrandStrategyPage() {
  const [brandBrain, setBrandBrain] = useState<BrandBrain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/brand-brain/current");
        if (!res.ok) {
          throw new Error("Failed to fetch brand brain");
        }
        const data = await res.json();
        setBrandBrain(data.brain);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !brandBrain) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <Card>
          <CardBody>
            <p className="text-center text-gray-500">
              {error || "No brand brain found. Please set up your brand first."}
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Brand Strategy</h1>
        <p className="text-gray-500 mt-2">
          Your brand&apos;s strategic positioning and market approach
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Mission & Values */}
        <Card>
          <CardHeader className="flex gap-2">
            <Compass className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Mission & Values</h3>
              <p className="text-sm text-gray-500">
                Core purpose and guiding principles
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mission</label>
              <p className="text-gray-500 text-sm">
                {brandBrain.mission || "No mission statement defined."}
              </p>
            </div>
            {brandBrain.values && brandBrain.values.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Core Values</label>
                <div className="flex flex-wrap gap-2">
                  {brandBrain.values.map((value: string, i: number) => (
                    <Chip key={i} color="secondary" variant="flat" size="sm">
                      {value}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Market Position */}
        <Card>
          <CardHeader className="flex gap-2">
            <TrendingUp className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Market Position</h3>
              <p className="text-sm text-gray-500">
                Industry and target market focus
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Industry</label>
              <Chip variant="bordered">{brandBrain.industry || "Not specified"}</Chip>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Market</label>
              <p className="text-gray-500 text-sm">
                {brandBrain.targetMarket || "No target market defined."}
              </p>
            </div>
            {brandBrain.uniqueSellingPoints && brandBrain.uniqueSellingPoints.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Unique Selling Points</label>
                <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
                  {brandBrain.uniqueSellingPoints.map((usp: string, i: number) => (
                    <li key={i}>{usp}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Target Audiences */}
        <Card className="md:col-span-2">
          <CardHeader className="flex gap-2">
            <Users className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Target Audiences</h3>
              <p className="text-sm text-gray-500">
                Key personas and segments you&apos;re targeting
              </p>
            </div>
          </CardHeader>
          <CardBody>
            {(!brandBrain.audiences || brandBrain.audiences.length === 0) ? (
              <p className="text-gray-500 text-sm">No audiences defined yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {brandBrain.audiences.map((audience) => (
                  <div
                    key={audience.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{audience.name}</h4>
                      {audience.isPrimary && (
                        <Chip color="primary" variant="flat" size="sm">Primary</Chip>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {audience.description || "No description"}
                    </p>
                    {audience.ageRange && (
                      <p className="text-xs text-gray-500">
                        Age: {audience.ageRange}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Content Pillars */}
        <Card className="md:col-span-2">
          <CardHeader className="flex gap-2">
            <Target className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Content Pillars</h3>
              <p className="text-sm text-gray-500">
                Core themes and topics for your content strategy
              </p>
            </div>
          </CardHeader>
          <CardBody>
            {(!brandBrain.pillars || brandBrain.pillars.length === 0) ? (
              <p className="text-gray-500 text-sm">No content pillars defined yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {brandBrain.pillars.map((pillar) => (
                  <div
                    key={pillar.id}
                    className="p-4 border rounded-lg space-y-2"
                    style={{ borderLeftColor: pillar.color || "#888", borderLeftWidth: "4px" }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{pillar.name}</h4>
                      <Chip color={pillar.isActive ? "success" : "default"} variant="flat" size="sm">
                        {pillar.isActive ? "Active" : "Inactive"}
                      </Chip>
                    </div>
                    <p className="text-sm text-gray-500">
                      {pillar.description || "No description"}
                    </p>
                    {pillar.topics && pillar.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {pillar.topics.slice(0, 3).map((topic: string, i: number) => (
                          <Chip key={i} variant="bordered" size="sm">
                            {topic}
                          </Chip>
                        ))}
                        {pillar.topics.length > 3 && (
                          <Chip variant="bordered" size="sm">
                            +{pillar.topics.length - 3} more
                          </Chip>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
