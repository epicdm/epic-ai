"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
  Tooltip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
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
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeTab, setActiveTab] = useState<string>("owned");
  const [mounted, setMounted] = useState(false);

  // Owned numbers state
  const [ownedNumbers, setOwnedNumbers] = useState<PhoneNumber[]>([]);
  const [loadingOwned, setLoadingOwned] = useState(true);
  const [magnusConfigured, setMagnusConfigured] = useState(false);

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

  // Hydration-safe mounting
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
        onClose();
        setSelectedDID(null);
        setSelectedAgentId("");
        fetchOwnedNumbers();
        // Remove from available list
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

  const openPurchaseModal = (did: AvailableDID) => {
    setSelectedDID(did);
    onOpen();
  };

  const formatPhoneNumber = (number: string) => {
    // Format US numbers as (xxx) xxx-xxxx
    if (number.startsWith("+1") && number.length === 12) {
      const digits = number.slice(2);
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return number;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "failed":
        return "danger";
      default:
        return "default";
    }
  };

  // Show loading state until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Phone Numbers"
          description="Manage phone numbers for your voice agents via Magnus Billing."
        />
        <Card>
          <CardBody>
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </CardBody>
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
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => setActiveTab("available")}
          >
            Get New Number
          </Button>
        }
      />

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        variant="underlined"
        size="lg"
      >
        <Tab
          key="owned"
          title={
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>My Numbers</span>
              {ownedNumbers.length > 0 && (
                <Chip size="sm" variant="flat">
                  {ownedNumbers.length}
                </Chip>
              )}
            </div>
          }
        />
        <Tab
          key="available"
          title={
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span>Get Numbers</span>
            </div>
          }
        />
      </Tabs>

      {activeTab === "owned" && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Your Phone Numbers</h3>
            <Button
              size="sm"
              variant="flat"
              startContent={<RefreshCw className="w-4 h-4" />}
              onPress={fetchOwnedNumbers}
              isLoading={loadingOwned}
            >
              Refresh
            </Button>
          </CardHeader>
          <CardBody>
            {loadingOwned ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
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
                <Button
                  color="primary"
                  startContent={<Plus className="w-4 h-4" />}
                  onPress={() => setActiveTab("available")}
                >
                  Get Your First Number
                </Button>
              </div>
            ) : (
              <Table aria-label="Phone numbers table">
                <TableHeader>
                  <TableColumn>PHONE NUMBER</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>ASSIGNED TO</TableColumn>
                  <TableColumn>CALLS</TableColumn>
                  <TableColumn>ACTIONS</TableColumn>
                </TableHeader>
                <TableBody>
                  {ownedNumbers.map((number) => (
                    <TableRow key={number.id}>
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
                          <Chip
                            size="sm"
                            color={getStatusColor(number.magnusStatus)}
                            variant="flat"
                            startContent={
                              number.magnusStatus === "active" ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : number.magnusStatus === "failed" ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                <AlertCircle className="w-3 h-3" />
                              )
                            }
                          >
                            {number.magnusStatus || "Unknown"}
                          </Chip>
                          {number.isActive && (
                            <Chip size="sm" color="success" variant="dot">
                              Active
                            </Chip>
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
                            size="sm"
                            placeholder="Assign to agent"
                            className="max-w-[180px]"
                            onChange={(e) => handleAssign(number.id, e.target.value || null)}
                          >
                            {agents.map((agent) => (
                              <SelectItem key={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat">
                          {number._count.callLogs} calls
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <Dropdown>
                          <DropdownTrigger>
                            <Button isIconOnly size="sm" variant="light">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu>
                            <DropdownItem
                              key="unassign"
                              isDisabled={!number.agent}
                              onPress={() => handleAssign(number.id, null)}
                            >
                              Unassign from agent
                            </DropdownItem>
                            <DropdownItem
                              key="delete"
                              className="text-danger"
                              color="danger"
                              startContent={<Trash2 className="w-4 h-4" />}
                              onPress={() => handleDelete(number.id)}
                            >
                              Release Number
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === "available" && (
        <div className="space-y-6">
          {/* Search Filters */}
          <Card>
            <CardBody>
              <div className="flex flex-col sm:flex-row gap-4">
                <Select
                  label="Country"
                  selectedKeys={[searchCountry]}
                  onChange={(e) => setSearchCountry(e.target.value)}
                  className="sm:max-w-[200px]"
                  startContent={<Globe className="w-4 h-4 text-gray-400" />}
                >
                  {COUNTRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="Area Code"
                  selectedKeys={searchAreaCode ? [searchAreaCode] : []}
                  onChange={(e) => setSearchAreaCode(e.target.value)}
                  className="sm:max-w-[200px]"
                  startContent={<MapPin className="w-4 h-4 text-gray-400" />}
                >
                  {US_AREA_CODES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>

                <Button
                  color="primary"
                  startContent={<Search className="w-4 h-4" />}
                  onPress={fetchAvailableNumbers}
                  isLoading={loadingAvailable}
                  className="sm:self-end"
                >
                  Search Numbers
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Available Numbers</h3>
            </CardHeader>
            <CardBody>
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
                  <Spinner size="lg" />
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
                      isPressable
                      onPress={() => openPurchaseModal(did)}
                    >
                      <CardBody className="p-4">
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
                          <Chip size="sm" color="success" variant="flat">
                            Available
                          </Chip>
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
                          <Button size="sm" color="primary" variant="flat">
                            Select
                          </Button>
                        </div>

                        {did.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {did.features.slice(0, 3).map((feature) => (
                              <Chip key={feature} size="sm" variant="bordered">
                                {feature}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Purchase Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          {selectedDID && (
            <>
              <ModalHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Purchase Phone Number</h3>
                    <p className="text-sm text-gray-500">
                      {formatPhoneNumber(selectedDID.phoneNumber)}
                    </p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="space-y-4">
                <Card className="bg-gray-50 dark:bg-gray-800/50">
                  <CardBody className="p-4">
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
                  </CardBody>
                </Card>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Assign to Voice Agent (Optional)
                  </label>
                  <Select
                    placeholder="Select an agent"
                    selectedKeys={selectedAgentId ? [selectedAgentId] : []}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    startContent={<Bot className="w-4 h-4 text-gray-400" />}
                  >
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    You can also assign this number to an agent later.
                  </p>
                </div>

                {selectedDID.features.length > 0 && (
                  <div>
                    <span className="text-sm font-medium mb-2 block">Features</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedDID.features.map((feature) => (
                        <Chip key={feature} size="sm" variant="flat" color="primary">
                          {feature}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handlePurchase}
                  isLoading={purchasing}
                  startContent={!purchasing && <ShoppingCart className="w-4 h-4" />}
                >
                  Purchase Number
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
