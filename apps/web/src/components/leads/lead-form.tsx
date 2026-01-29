"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
} from "@heroui/react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Save } from "lucide-react";

interface Brand {
  id: string;
  name: string;
}

interface LeadFormProps {
  brands: Brand[];
  initialData?: {
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
    brandId: string | null;
  };
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

const SOURCE_OPTIONS = [
  { key: "MANUAL", label: "Manual Entry" },
  { key: "WEB_FORM", label: "Web Form" },
  { key: "SOCIAL_MEDIA", label: "Social Media" },
  { key: "VOICE_CALL", label: "Voice Call" },
  { key: "REFERRAL", label: "Referral" },
  { key: "ADVERTISEMENT", label: "Advertisement" },
  { key: "OTHER", label: "Other" },
];

export function LeadForm({ brands, initialData }: LeadFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    company: initialData?.company || "",
    jobTitle: initialData?.jobTitle || "",
    status: initialData?.status || "NEW",
    source: initialData?.source || "MANUAL",
    sourceDetails: initialData?.sourceDetails || "",
    estimatedValue: initialData?.estimatedValue?.toString() || "",
    notes: initialData?.notes || "",
    brandId: initialData?.brandId || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = initialData ? `/api/leads/${initialData.id}` : "/api/leads";
      const method = initialData ? "PATCH" : "POST";

      const payload = {
        ...formData,
        estimatedValue: formData.estimatedValue
          ? parseFloat(formData.estimatedValue)
          : null,
        brandId: formData.brandId || null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save lead");
      }

      const lead = await response.json();
      router.push(`/dashboard/leads/${lead.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={initialData ? "Edit Lead" : "Add New Lead"}
        description="Enter the lead's contact information and details."
        actions={
          <Button
            as={Link}
            href="/dashboard/leads"
            variant="bordered"
            startContent={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardBody className="p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardBody>
          </Card>
        )}

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Contact Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                isRequired
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="email"
                label="Email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <Input
                type="tel"
                label="Phone"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Company"
                placeholder="Acme Inc."
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
              />
              <Input
                label="Job Title"
                placeholder="Marketing Manager"
                value={formData.jobTitle}
                onChange={(e) =>
                  setFormData({ ...formData, jobTitle: e.target.value })
                }
              />
            </div>
          </CardBody>
        </Card>

        {/* Lead Details */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Lead Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Status"
                selectedKeys={[formData.status]}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.key}>{option.label}</SelectItem>
                ))}
              </Select>
              <Select
                label="Source"
                selectedKeys={[formData.source]}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
              >
                {SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.key}>{option.label}</SelectItem>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Source Details"
                placeholder="e.g., Facebook Ad Campaign"
                value={formData.sourceDetails}
                onChange={(e) =>
                  setFormData({ ...formData, sourceDetails: e.target.value })
                }
              />
              <Input
                type="number"
                label="Estimated Value ($)"
                placeholder="5000"
                value={formData.estimatedValue}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedValue: e.target.value })
                }
              />
            </div>
            {brands.length > 0 && (
              <Select
                label="Associated Brand"
                selectedKeys={formData.brandId ? [formData.brandId] : []}
                onChange={(e) =>
                  setFormData({ ...formData, brandId: e.target.value })
                }
              >
                {brands.map((brand) => (
                  <SelectItem key={brand.id}>{brand.name}</SelectItem>
                ))}
              </Select>
            )}
            <Textarea
              label="Notes"
              placeholder="Additional notes about this lead..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              minRows={4}
            />
          </CardBody>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button as={Link} href="/dashboard/leads" variant="bordered">
            Cancel
          </Button>
          <Button
            type="submit"
            color="primary"
            isLoading={loading}
            startContent={!loading && <Save className="w-4 h-4" />}
          >
            {initialData ? "Save Changes" : "Create Lead"}
          </Button>
        </div>
      </form>
    </div>
  );
}
