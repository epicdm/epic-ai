"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient, endpoints, queryKeys, unwrapArray } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Layout, Star } from "lucide-react";
import { useState } from "react";

interface Template {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category?: string;
  useCases?: string[];
  complexity?: string;
  channels?: string[];
  featured?: boolean;
}

export function TemplatesContent() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.templates.lists(),
    queryFn: async () => {
      const res = await apiClient.get<Template[] | { data: Template[] | null }>(
        endpoints.templates.list()
      );
      if (res.error) throw new Error(res.error.message);
      return unwrapArray<Template>(res.data);
    },
  });

  const templates = data ?? [];
  const filtered = templates.filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent Templates</h1>
        <p className="text-muted-foreground">
          Browse pre-built agent templates to get started quickly.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading templates...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Layout className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No templates found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.featured && (
                    <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {template.category && (
                    <Badge variant="secondary" className="capitalize">
                      {template.category.toLowerCase()}
                    </Badge>
                  )}
                  {template.complexity && (
                    <Badge
                      variant={
                        template.complexity === "BEGINNER"
                          ? "default"
                          : template.complexity === "ADVANCED"
                          ? "destructive"
                          : "outline"
                      }
                      className="capitalize"
                    >
                      {template.complexity.toLowerCase()}
                    </Badge>
                  )}
                  {template.channels?.map((ch) => (
                    <Badge key={ch} variant="outline" className="capitalize">
                      {ch.toLowerCase()}
                    </Badge>
                  ))}
                </div>
                {template.useCases && template.useCases.length > 0 && (
                  <ul className="mb-4 space-y-1 text-sm text-muted-foreground">
                    {template.useCases.slice(0, 4).map((uc) => (
                      <li key={uc} className="flex items-center gap-1.5">
                        <span className="inline-block h-1 w-1 rounded-full bg-primary shrink-0" />
                        {uc}
                      </li>
                    ))}
                    {template.useCases.length > 4 && (
                      <li className="text-xs">+{template.useCases.length - 4} more</li>
                    )}
                  </ul>
                )}
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/dashboard/agents/new?template=${template.slug}`}>
                    Use Template
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
