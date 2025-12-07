"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Select,
  SelectItem,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Calendar,
  Edit,
  Trash2,
  Plus,
  MessageSquare,
  PhoneCall,
  FileText,
  Clock,
} from "lucide-react";

interface Lead {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  status: string;
  source: string;
  sourceDetails: string | null;
  estimatedValue: number | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  lastContactedAt: string | null;
  convertedAt: string | null;
  brand: { id: string; name: string } | null;
  activities: Activity[];
  calls: Call[];
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
}

interface Call {
  id: string;
  direction: string;
  status: string;
  createdAt: string;
  agent: { id: string; name: string } | null;
}

const STATUS_OPTIONS = [
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "PROPOSAL", label: "Proposal" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "CONVERTED", label: "Converted" },
  { key: "LOST", label: "Lost" },
];

const ACTIVITY_TYPES = [
  { key: "NOTE", label: "Note" },
  { key: "CALL", label: "Call" },
  { key: "EMAIL", label: "Email" },
  { key: "MEETING", label: "Meeting" },
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

const getActivityIcon = (type: string) => {
  const icons: Record<string, typeof FileText> = {
    NOTE: FileText,
    CALL: PhoneCall,
    EMAIL: Mail,
    MEETING: Calendar,
    STATUS_CHANGE: Clock,
  };
  return icons[type] || MessageSquare;
};

export function LeadDetail({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activityType, setActivityType] = useState("NOTE");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  async function fetchLead() {
    try {
      const response = await fetch(`/api/leads/${leadId}`);
      if (!response.ok) throw new Error("Failed to fetch lead");
      const data = await response.json();
      setLead(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    if (!lead) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update");
      await fetchLead();
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdating(false);
    }
  }

  async function addActivity() {
    if (!activityTitle.trim()) return;
    try {
      const response = await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activityType,
          title: activityTitle,
          description: activityDescription || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to add activity");
      await fetchLead();
      onClose();
      setActivityTitle("");
      setActivityDescription("");
    } catch (err) {
      console.error("Error adding activity:", err);
    }
  }

  async function deleteLead() {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      router.push("/dashboard/leads");
    } catch (err) {
      console.error("Error deleting lead:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <Card>
        <CardBody className="py-16 text-center">
          <p className="text-red-500">{error || "Lead not found"}</p>
          <Button as={Link} href="/dashboard/leads" className="mt-4">
            Back to Leads
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${lead.firstName} ${lead.lastName || ""}`}
        description={lead.company || lead.email || "Lead details"}
        actions={
          <div className="flex items-center gap-3">
            <Button
              as={Link}
              href="/dashboard/leads"
              variant="bordered"
              startContent={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <Button
              as={Link}
              href={`/dashboard/leads/${leadId}/edit`}
              variant="bordered"
              startContent={<Edit className="w-4 h-4" />}
            >
              Edit
            </Button>
            <Button
              color="danger"
              variant="bordered"
              startContent={<Trash2 className="w-4 h-4" />}
              onPress={deleteLead}
            >
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Card */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Contact Information</h2>
              <Select
                size="sm"
                selectedKeys={[lead.status]}
                onChange={(e) => updateStatus(e.target.value)}
                className="w-40"
                isDisabled={updating}
              >
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.key}>{option.label}</SelectItem>
                ))}
              </Select>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lead.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}
                {lead.company && (
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Company</p>
                      <p className="text-gray-900 dark:text-white">
                        {lead.company}
                        {lead.jobTitle && (
                          <span className="text-gray-500">
                            {" "}
                            - {lead.jobTitle}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {lead.notes && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-sm text-gray-500 mb-2">Notes</p>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {lead.notes}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Activity</h2>
              <Button
                size="sm"
                color="primary"
                startContent={<Plus className="w-4 h-4" />}
                onPress={onOpen}
              >
                Add Activity
              </Button>
            </CardHeader>
            <CardBody>
              {lead.activities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No activities yet
                </p>
              ) : (
                <div className="space-y-4">
                  {lead.activities.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div
                        key={activity.id}
                        className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {activity.title}
                          </p>
                          {activity.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {activity.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Status</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Current Status</span>
                <Chip color={getStatusColor(lead.status)} variant="flat">
                  {lead.status}
                </Chip>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Source</span>
                <span className="text-gray-900 dark:text-white">
                  {lead.source.replace("_", " ")}
                </span>
              </div>
              {lead.estimatedValue && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Est. Value</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    ${lead.estimatedValue.toLocaleString()}
                  </span>
                </div>
              )}
              {lead.lastContactedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Last Contact</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(lead.lastContactedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Tags */}
          {lead.tags.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Tags</h2>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag) => (
                    <Chip key={tag} size="sm" variant="flat">
                      {tag}
                    </Chip>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Related Calls */}
          {lead.calls.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Related Calls</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {lead.calls.map((call) => (
                  <div
                    key={call.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {call.direction === "inbound" ? "Inbound" : "Outbound"}
                      </span>
                      <Chip size="sm" variant="flat">
                        {call.status}
                      </Chip>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(call.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Add Activity Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Add Activity</ModalHeader>
          <ModalBody>
            <Select
              label="Activity Type"
              selectedKeys={[activityType]}
              onChange={(e) => setActivityType(e.target.value)}
            >
              {ACTIVITY_TYPES.map((type) => (
                <SelectItem key={type.key}>{type.label}</SelectItem>
              ))}
            </Select>
            <Textarea
              label="Title"
              placeholder="Brief description of the activity"
              value={activityTitle}
              onChange={(e) => setActivityTitle(e.target.value)}
              isRequired
            />
            <Textarea
              label="Details (optional)"
              placeholder="Additional notes..."
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={onClose}>
              Cancel
            </Button>
            <Button color="primary" onPress={addActivity}>
              Add Activity
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
