import { z } from "zod";

export const organizationSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(50, "Organization name must be less than 50 characters"),
});

export const brandSchema = z.object({
  name: z
    .string()
    .min(2, "Brand name must be at least 2 characters")
    .max(50, "Brand name must be less than 50 characters"),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  industry: z.string().optional(),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;
export type BrandFormData = z.infer<typeof brandSchema>;
