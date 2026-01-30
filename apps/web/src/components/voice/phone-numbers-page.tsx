"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import {
  Phone,
  Plus,
  Search,
  RefreshCw,
  Globe,
  MapPin,
  DollarSign,
  Bot,
  Trash2,
  MoreVertical,
  ShoppingCart,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";

interface PhoneNumber {
  id: string;
  phoneNumber: string;
  countryCode: string | null;
  areaCode: string | null;
  isActive: boolean;
  isVerified: boolean;
  magnusStatus: string | null;
  magnusDidId: string | null;
  routingType: string | null;
  agent: { id: string; name: string } | null;
  sipConfig: { id: string; name: string; provider: string } | null;
  _count: { callLogs: number };
  createdAt: string;
}

interface AvailableDID {
  phoneNumber: string;
  countryCode: string;
  areaCode: string;
  city: string | null;
  state: string | null;
  monthlyCost: number;
  setupCost: number;
  features: string[];
  available: boolean;
}

interface VoiceAgent {
  id: string;
  name: string;
}

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States (+1)" },
  { value: "CA", label: "Canada (+1)" },
  { value: "GB", label: "United Kingdom (+44)" },
  { value: "AU", label: "Australia (+61)" },
];

const US_AREA_CODES = [
  { value: "", label: "Any Area Code" },
  { value: "212", label: "212 - New York" },
  { value: "213", label: "213 - Los Angeles" },
  { value: "312", label: "312 - Chicago" },
  { value: "305", label: "305 - Miami" },
  { value: "415", label: "415 - San Francisco" },
  { value: "512", label: "512 - Austin" },
  { value: "617", label: "617 - Boston" },
  { value: "702", label: "702 - Las Vegas" },
  { value: "713", label: "713 - Houston" },
  { value: "832", label: "832 - Houston" },
  { value: "818", label: "818 - Los Angeles" },
];

export function PhoneNumbersPage() {
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("owned");
  const [mounted, setMounted] = useState(false);

  // Owned numbers state
  const [ownedNumbers, setOwnedNumbers] = useState<PhoneNumber[]>([]);
  const [loadingOwned, setLoadingOwned] = useState(true);
  const [magnusConfigured, setMagnusConfigured] = useState(false);

  // Bulk selection state
  const [selectedNumberIds, setSelectedNumberIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Available numbers state
  const [availableNumbers, setAvailableNumbers] = useState<AvailableDID[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [searchCountry, setSearchCountry] = useState("US");
  const [searchAreaCode, setSearchAreaCode] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Purchase state
  const [selectedDID, setSelectedDID] = useState<AvailableDID | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  // Fetch owned phone numbers
  const fetchOwnedNumbers = useCallback(async () => {
    try {
      setLoadingOwned(true);
      console.log("[PhoneNumbers] Fetching owned numbers...");
      const response = await fetch("/api/voice/phone-numbers");
      console.log("[PhoneNumbers] Response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("[PhoneNumbers] Received data:", {
          count: data.phoneNumbers?.length || 0,
          magnusConfigured: data.magnusConfigured,
          _debug: data._debug,
          phoneNumbers: data.phoneNumbers?.map((p: PhoneNumber) => ({
            id: p.id,
            number: p.phoneNumber,
            agent: p.agent?.name,
          })),
        });
        setOwnedNumbers(data.phoneNumbers || []);
        setMagnusConfigured(data.magnusConfigured || false);
      } else {
        console.error("[PhoneNumbers] API error:", response.status, await response.text());
      }
    } catch (error) {
      console.error("[PhoneNumbers] Error fetching phone numbers:", error);
    } finally {
      setLoadingOwned(false);
    }
  }, []);

  // Fetch available DIDs from Magnus
  const fetchAvailableNumbers = useCallback(async () => {
    try {
      setLoadingAvailable(true);
      setHasSearched(true);
      const params = new URLSearchParams({
        country_code: searchCountry,
        limit: "20",
      });
      if (searchAreaCode) {
        params.set("area_code", searchAreaCode);
      }

      const response = await fetch(`/api/voice/phone-numbers/available?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableNumbers(data.availableNumbers || []);
      }
    } catch (error) {
      console.error("Error fetching available numbers:", error);
    } finally {
      setLoadingAvailable(false);
    }
  }, [searchCountry, searchAreaCode]);

  // Fetch agents for assignment
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch("/api/voice/agents");
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchOwnedNumbers();
    fetchAgents();
  }, [fetchOwnedNumbers, fetchAgents]);

  // Purchase DID
  const handlePurchase = async () => {
    if (!selectedDID) return;

    try {
      setPurchasing(true);
      const response = await fetch("/api/voice/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: selectedDID.phoneNumber,
          countryCode: selectedDID.countryCode,
          areaCode: selectedDID.areaCode,
          agentId: selectedAgentId || undefined,
        }),
      });

      if (response.ok) {
        setIsPurchaseOpen(false);
        setSelectedDID(null);
        setSelectedAgentId("");
        fetchOwnedNumbers();
        setAvailableNumbers((prev) =>
          prev.filter((d) => d.phoneNumber !== selectedDID.phoneNumber)
        );
      } else {
        const error = await response.json();
        alert(error.error || "Failed to purchase number");
      }
    } catch (error) {
      console.error("Error purchasing number:", error);
      alert("Failed to purchase number");
    } finally {
      setPurchasing(false);
    }
  };

  // Delete phone number
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to release this phone number?")) return;

    try {
      const response = await fetch(`/api/voice/phone-numbers/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchOwnedNumbers();
      }
    } catch (error) {
      console.error("Error deleting phone number:", error);
    }
  };

  // Assign to agent
  const handleAssign = async (phoneNumberId: string, agentId: string | null) => {
    try {
      const response = await fetch("/api/voice/phone-numbers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId,
          agentId,
        }),
      });
      if (response.ok) {
        fetchOwnedNumbers();
      }
    } catch (error) {
      console.error("Error assigning number:", error);
    }
  };

  // Bulk selection handlers
  const toggleNumberSelection = (id: string) => {
    setSelectedNumberIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAllNumbers = () => {
    if (selectedNumberIds.size === ownedNumbers.length) {
      setSelectedNumberIds(new Set());
    } else {
      setSelectedNumberIds(new Set(ownedNumbers.map((n) => n.id)));
    }
  };

  const clearNumberSelection = () => {
    setSelectedNumberIds(new Set());
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedNumberIds.size === 0) return;

    try {
      setBulkDeleting(true);
      const deletePromises = Array.from(selectedNumberIds).map((id) =>
        fetch(`/api/voice/phone-numbers/${id}`, { method: "DELETE" })
      );

      const results = await Promise.all(deletePromises);
      const failed = results.filter((r) => !r.ok).length;

      if (failed > 0) {
        console.error(`Failed to delete ${failed} phone numbers`);
      }

      setIsBulkDeleteOpen(false);
      clearNumberSelection();
      fetchOwnedNumbers();
    } catch (error) {
      console.error("Error bulk deleting phone numbers:", error);
    } finally {
      setBulkDeleting(false);
    }
  };

  // Get selected numbers for display
  const selectedNumbers = ownedNumbers.filter((n) => selectedNumberIds.has(n.id));
  const selectedWithAgents = selectedNumbers.filter((n) => n.agent !== null);

  const openPurchaseModal = (did: AvailableDID) => {
    setSelectedDID(did);
    setIsPurchaseOpen(true);
  };

  const formatPhoneNumber = (number: string) => {
    if (number.startsWith("+1") && number.length === 12) {
      const digits = number.slice(2);
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return number;
  };

  const getStatusBadgeClass = (status: string | null): string => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "failed":
        return "";
      default:
        return "";
    }
  };

  const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "active":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Phone Numbers"
          description="Manage phone numbers for your voice agents via Magnus Billing."
        />
        <Card>
          <CardContent>
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8" suppressHydrationWarning>
      <PageHeader
        title="Phone Numbers"
        description="Manage phone numbers for your voice agents via Magnus Billing."
        actions={
          <Button onClick={() => setActiveTab("available")}>
            <Plus className="w-4 h-4 mr-2" />
            Get New Number
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="owned" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>My Numbers</span>
            {ownedNumbers.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {ownedNumbers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="available" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span>Get Numbers</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "owned" && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <h3 className="text-lg font-semibold">Your Phone Numbers</h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={fetchOwnedNumbers}
              disabled={loadingOwned}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loadingOwned ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : ownedNumbers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Phone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Phone Numbers Yet</h3>
                <p className="text-gray-500 mb-4">
                  Get started by purchasing a phone number from Magnus Billing.
                </p>
                <Button onClick={() => setActiveTab("available")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Get Your First Number
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Bulk Action Bar */}
                {selectedNumberIds.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {selectedNumberIds.size} phone number{selectedNumberIds.size !== 1 ? "s" : ""} selected
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearNumberSelection}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setIsBulkDeleteOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </Button>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedNumberIds.size === ownedNumbers.length && ownedNumbers.length > 0}
                          onCheckedChange={toggleSelectAllNumbers}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>PHONE NUMBER</TableHead>
                      <TableHead>STATUS</TableHead>
                      <TableHead>ASSIGNED TO</TableHead>
                      <TableHead>CALLS</TableHead>
                      <TableHead>ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ownedNumbers.map((number) => (
                      <TableRow
                        key={number.id}
                        className={selectedNumberIds.has(number.id) ? "bg-blue-50 dark:bg-blue-900/10" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedNumberIds.has(number.id)}
                            onCheckedChange={() => toggleNumberSelection(number.id)}
                            aria-label={`Select ${number.phoneNumber}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {formatPhoneNumber(number.phoneNumber)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {number.areaCode && `Area: ${number.areaCode}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getStatusBadgeVariant(number.magnusStatus)}
                              className={`flex items-center gap-1 ${getStatusBadgeClass(number.magnusStatus)}`}
                            >
                              {number.magnusStatus === "active" ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : number.magnusStatus === "failed" ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              {number.magnusStatus || "Unknown"}
                            </Badge>
                            {number.isActive && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                Active
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {number.agent ? (
                            <div className="flex items-center gap-2">
                              <Bot className="w-4 h-4 text-primary" />
                              <span>{number.agent.name}</span>
                            </div>
                          ) : (
                            <Select
                              onValueChange={(value) => handleAssign(number.id, value || null)}
                            >
                              <SelectTrigger className="max-w-[180px]">
                                <SelectValue placeholder="Assign to agent" />
                              </SelectTrigger>
                              <SelectContent>
                                {agents.map((agent) => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    {agent.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {number._count.callLogs} calls
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                disabled={!number.agent}
                                onSelect={() => handleAssign(number.id, null)}
                              >
                                Unassign from agent
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => handleDelete(number.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Release Number
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "available" && (
        <div className="space-y-6">
          {/* Search Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="sm:max-w-[200px]">
                  <Label className="mb-2 block">Country</Label>
                  <Select value={searchCountry} onValueChange={setSearchCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:max-w-[200px]">
                  <Label className="mb-2 block">Area Code</Label>
                  <Select value={searchAreaCode} onValueChange={setSearchAreaCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Area Code" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_AREA_CODES.map((option) => (
                        <SelectItem key={option.value || "any"} value={option.value || "any"}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={fetchAvailableNumbers}
                  disabled={loadingAvailable}
                  className="sm:self-end"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search Numbers
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Available Numbers</h3>
            </CardHeader>
            <CardContent>
              {!hasSearched ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Search for Numbers</h3>
                  <p className="text-gray-500">
                    Select a country and area code, then click search to find available numbers.
                  </p>
                </div>
              ) : loadingAvailable ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : availableNumbers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Numbers Found</h3>
                  <p className="text-gray-500">
                    Try a different area code or check if Magnus Billing is configured.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableNumbers.map((did) => (
                    <Card
                      key={did.phoneNumber}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openPurchaseModal(did)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-lg">
                              {formatPhoneNumber(did.phoneNumber)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {did.city && did.state
                                ? `${did.city}, ${did.state}`
                                : `Area ${did.areaCode}`}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Available
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-sm">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">${did.monthlyCost}/mo</span>
                            {did.setupCost > 0 && (
                              <span className="text-gray-500">
                                + ${did.setupCost} setup
                              </span>
                            )}
                          </div>
                          <Button size="sm" variant="secondary">
                            Select
                          </Button>
                        </div>

                        {did.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {did.features.slice(0, 3).map((feature) => (
                              <Badge key={feature} variant="outline">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Purchase Modal */}
      <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
        <DialogContent>
          {selectedDID && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Purchase Phone Number</div>
                    <p className="text-sm text-gray-500">
                      {formatPhoneNumber(selectedDID.phoneNumber)}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Card className="bg-gray-50 dark:bg-gray-800/50">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Location</span>
                        <p className="font-medium">
                          {selectedDID.city && selectedDID.state
                            ? `${selectedDID.city}, ${selectedDID.state}`
                            : `Area ${selectedDID.areaCode}, ${selectedDID.countryCode}`}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Monthly Cost</span>
                        <p className="font-medium">${selectedDID.monthlyCost}/month</p>
                      </div>
                      {selectedDID.setupCost > 0 && (
                        <div>
                          <span className="text-gray-500">Setup Fee</span>
                          <p className="font-medium">${selectedDID.setupCost} (one-time)</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <Label className="mb-2 block">
                    Assign to Voice Agent (Optional)
                  </Label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    You can also assign this number to an agent later.
                  </p>
                </div>

                {selectedDID.features.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Features</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedDID.features.map((feature) => (
                        <Badge key={feature} variant="default">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsPurchaseOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePurchase}
                  disabled={purchasing}
                >
                  {purchasing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Purchase Number
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-lg font-semibold">Delete Phone Numbers</div>
                <p className="text-sm text-gray-500">
                  This action cannot be undone
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                You are about to delete <strong>{selectedNumberIds.size}</strong> phone number{selectedNumberIds.size !== 1 ? "s" : ""}.
                This will:
              </p>
              <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 mt-2 space-y-1">
                <li>Release the phone numbers from Magnus</li>
                <li>Delete associated LiveKit trunks and dispatch rules</li>
                <li>Remove all configuration and call routing</li>
              </ul>
            </div>

            {selectedWithAgents.length > 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
                  <Bot className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {selectedWithAgents.length} number{selectedWithAgents.length !== 1 ? "s" : ""} assigned to agents
                  </span>
                </div>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  The following numbers are currently assigned to voice agents:
                </p>
                <ul className="text-sm text-yellow-600 dark:text-yellow-400 mt-1 space-y-1">
                  {selectedWithAgents.slice(0, 5).map((n) => (
                    <li key={n.id}>
                      {formatPhoneNumber(n.phoneNumber)} → {n.agent?.name}
                    </li>
                  ))}
                  {selectedWithAgents.length > 5 && (
                    <li>...and {selectedWithAgents.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-sm font-medium mb-2">Numbers to be deleted:</p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {selectedNumbers.slice(0, 10).map((n) => (
                  <Badge key={n.id} variant="secondary">
                    {formatPhoneNumber(n.phoneNumber)}
                  </Badge>
                ))}
                {selectedNumbers.length > 10 && (
                  <Badge variant="outline">
                    +{selectedNumbers.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedNumberIds.size} Number{selectedNumberIds.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
