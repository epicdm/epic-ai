"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const brandSchema = z.object({
  name: z
    .string()
    .min(2, "Brand name must be at least 2 characters")
    .max(50, "Brand name must be less than 50 characters"),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
});

type BrandFormData = z.infer<typeof brandSchema>;

interface Brand {
  id: string;
  name: string;
  website: string | null;
  createdAt: Date;
}

interface BrandsListProps {
  brands: Brand[];
  organizationId: string;
}

export function BrandsList({ brands, organizationId }: BrandsListProps) {
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: "",
      website: "",
    },
  });

  const onSubmit = async (data: BrandFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          organizationId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create brand");
      }

      reset();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {brands.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✨</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No brands yet. Create your first brand to get started.
          </p>
          <Button color="primary" onPress={onOpen}>
            Create Brand
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {brand.name}
                  </p>
                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-500 hover:underline"
                    >
                      {brand.website}
                    </a>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  Created{" "}
                  {new Date(brand.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>

          <Button variant="flat" color="primary" onPress={onOpen}>
            + Add Brand
          </Button>
        </div>
      )}

      {/* Create Brand Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleSubmit(onSubmit)}>
              <ModalHeader>Create New Brand</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Brand Name"
                    placeholder="My Awesome Brand"
                    {...register("name")}
                    isInvalid={!!errors.name}
                    errorMessage={errors.name?.message}
                    autoFocus
                  />

                  <Input
                    label="Website (Optional)"
                    placeholder="https://example.com"
                    {...register("website")}
                    isInvalid={!!errors.website}
                    errorMessage={errors.website?.message}
                  />

                  {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button type="submit" color="primary" isLoading={isLoading}>
                  Create Brand
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
