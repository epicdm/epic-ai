"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@heroui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const organizationUpdateSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(50, "Organization name must be less than 50 characters"),
});

type OrganizationUpdateData = z.infer<typeof organizationUpdateSchema>;

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface SettingsFormProps {
  organization: Organization;
}

export function SettingsForm({ organization }: SettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<OrganizationUpdateData>({
    resolver: zodResolver(organizationUpdateSchema),
    defaultValues: {
      name: organization.name,
    },
  });

  const onSubmit = async (data: OrganizationUpdateData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update organization");
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Organization Name"
          placeholder="Acme Inc."
          {...register("name")}
          isInvalid={!!errors.name}
          errorMessage={errors.name?.message}
        />

        <Input
          label="Organization Slug"
          value={organization.slug}
          isDisabled
          description="Used in URLs"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {success && (
        <p className="text-green-500 text-sm">
          Organization updated successfully!
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          color="primary"
          isLoading={isLoading}
          isDisabled={!isDirty}
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}
