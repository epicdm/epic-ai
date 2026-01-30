"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, endpoints, queryKeys } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import {
  Users,
  Plus,
  Search,
  TrendingUp,
  DollarSign,
  UserPlus,
  Magnet,
} from "lucide-react";

interface Lead {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  source: string;
  estimatedValue: number | null;
  createdAt: string;
  brand: { id: string; name: string } | null;
  _count: { activities: number; calls: number };
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
}

interface Stats {
  total: number;
  thisWeek: number;
  converted: number;
  conversionRate: number;
  totalValue: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

const STATUS_OPTIONS = [
  { key: "all", label: "All Statuses" },
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "PROPOSAL", label: "Proposal" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "CONVERTED", label: "Converted" },
  { key: "LOST", label: "Lost" },
];

const SOURCE_OPTIONS = [
  { key: "all", label: "All Sources" },
  { key: "MANUAL", label: "Manual" },
  { key: "WEB_FORM", label: "Web Form" },
  { key: "SOCIAL_MEDIA", label: "Social Media" },
  { key: "VOICE_CALL", label: "Voice Call" },
  { key: "REFERRAL", label: "Referral" },
  { key: "ADVERTISEMENT", label: "Advertisement" },
  { key: "OTHER", label: "Other" },
];

const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    NEW: "default",
    CONTACTED: "secondary",
    QUALIFIED: "outline",
    PROPOSAL: "outline",
    NEGOTIATION: "outline",
    CONVERTED: "default",
    LOST: "destructive",
  };
  return variants[status] || "secondary";
};

export function LeadsDashboard() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const filters = { search, status: statusFilter, source: sourceFilter, page };

  const { data: leadsData, isLoading } = useQuery({
    queryKey: queryKeys.leads.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number | boolean | undefined> = {
        limit,
        offset: (page - 1) * limit,
      };
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (sourceFilter !== "all") params.source = sourceFilter;

      const res = await apiClient.get<LeadsResponse>(endpoints.leads.list(), {
        params,
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: queryKeys.leads.stats(),
    queryFn: async () => {
      const res = await apiClient.get<Stats>(endpoints.leads.stats());
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });

  const leads = leadsData?.leads ?? [];
  const total = leadsData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leads"
        description="Manage and track your sales leads."
        actions={
          <Button asChild>
            <Link href="/dashboard/leads/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.total || 0}
                </p>
                <p className="text-sm text-gray-500">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.thisWeek || 0}
                </p>
                <p className="text-sm text-gray-500">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.conversionRate || 0}%
                </p>
                <p className="text-sm text-gray-500">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${(stats?.totalValue || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Pipeline Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative md:max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sourceFilter}
              onValueChange={(val) => {
                setSourceFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : leads.length === 0 ? (
        search || statusFilter !== "all" || sourceFilter !== "all" ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No leads match your filters
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Magnet className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Leads Yet - Let&apos;s Change That
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Connect your forms, chatbots, or voice agents to start capturing
                leads automatically.
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 mb-6 space-y-1">
                <li>Website contact forms</li>
                <li>Facebook Lead Ads</li>
                <li>Voice AI conversations</li>
                <li>Landing page signups</li>
              </ul>
              <div className="flex items-center justify-center gap-3">
                <Button asChild>
                  <Link href="/dashboard/leads/new">Add Lead Manually</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/settings">Learn More</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {lead.firstName} {lead.lastName || ""}
                      </p>
                      {lead.brand && (
                        <p className="text-xs text-gray-500">
                          {lead.brand.name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {lead.email && <p>{lead.email}</p>}
                      {lead.phone && (
                        <p className="text-gray-500">{lead.phone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{lead.company || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(lead.status)}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {lead.source.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {lead.estimatedValue
                      ? `$${lead.estimatedValue.toLocaleString()}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
