import { z } from "zod";

// User Validators
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

// Organization Validators
export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
});

// Brand Validators
export const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  website: z.string().url().optional(),
});

// Persona Validators
export const createPersonaSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().max(100).optional(),
  personality: z.string().max(2000).optional(),
  tone: z.enum(["professional", "friendly", "bold", "casual"]),
});

// Lead Validators
export const createLeadSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  company: z.string().max(200).optional(),
  source: z.string().optional(),
});

// Post Validators
export const createPostSchema = z.object({
  content: z.string().min(1).max(10000),
  platforms: z.array(z.string()).min(1),
  scheduledAt: z.string().datetime().optional(),
});
