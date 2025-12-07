"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
} from "@heroui/react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import {
  Users,
  Plus,
  Search,
  TrendingUp,
  DollarSign,
  UserPlus,
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

const getStatusColor = (
  status: string
): "default" | "primary" | "secondary" | "success" | "warning" | "danger" => {
  const colors: Record<
    string,
    "default" | "primary" | "secondary" | "success" | "warning" | "danger"
  > = {
    NEW: "primary",
    CONTACTED: "secondary",
    QUALIFIED: "warning",
    PROPOSAL: "warning",
    NEGOTIATION: "warning",
    CONVERTED: "success",
    LOST: "danger",
  };
  return colors[status] || "default";
};

export function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [search, statusFilter, sourceFilter, page]);

  async function fetchLeads() {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);

      const response = await fetch(`/api/leads?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setLeads(data.leads);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch("/api/leads/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leads"
        description="Manage and track your sales leads."
        actions={
          <Button
            as={Link}
            href="/dashboard/leads/new"
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
          >
            Add Lead
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardBody className="p-6">
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
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
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
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
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
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
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
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startContent={<Search className="w-4 h-4 text-gray-400" />}
              className="md:max-w-xs"
            />
            <Select
              placeholder="Status"
              selectedKeys={[statusFilter]}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="md:max-w-[180px]"
            >
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.key}>{option.label}</SelectItem>
              ))}
            </Select>
            <Select
              placeholder="Source"
              selectedKeys={[sourceFilter]}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="md:max-w-[180px]"
            >
              {SOURCE_OPTIONS.map((option) => (
                <SelectItem key={option.key}>{option.label}</SelectItem>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Leads Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Spinner size="lg" />
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {search || statusFilter !== "all" || sourceFilter !== "all"
                ? "No leads match your filters"
                : "No leads yet"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {search || statusFilter !== "all" || sourceFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Add your first lead to get started"}
            </p>
            {!search && statusFilter === "all" && sourceFilter === "all" && (
              <Button as={Link} href="/dashboard/leads/new" color="primary">
                Add Lead
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <Table aria-label="Leads table">
              <TableHeader>
                <TableColumn>Name</TableColumn>
                <TableColumn>Contact</TableColumn>
                <TableColumn>Company</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Source</TableColumn>
                <TableColumn>Value</TableColumn>
                <TableColumn>Created</TableColumn>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() =>
                      (window.location.href = `/dashboard/leads/${lead.id}`)
                    }
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
                      <Chip
                        size="sm"
                        color={getStatusColor(lead.status)}
                        variant="flat"
                      >
                        {lead.status}
                      </Chip>
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
          </CardBody>
          {totalPages > 1 && (
            <div className="flex justify-center p-4 border-t border-gray-200 dark:border-gray-800">
              <Pagination total={totalPages} page={page} onChange={setPage} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
