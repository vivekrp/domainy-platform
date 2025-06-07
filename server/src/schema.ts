
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  password_hash: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// User registration input
export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// User login input
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Auth response
export const authResponseSchema = z.object({
  user: userSchema.omit({ password_hash: true }),
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Domain status enum
export const domainStatusSchema = z.enum(['active', 'expiring_soon', 'expired', 'unknown']);

export type DomainStatus = z.infer<typeof domainStatusSchema>;

// Domain schema
export const domainSchema = z.object({
  id: z.string().uuid(),
  domain_name: z.string(),
  registrar: z.string(),
  expiry_date: z.coerce.date().nullable(),
  whois_data: z.string().nullable(),
  user_id: z.string().uuid(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Domain = z.infer<typeof domainSchema>;

// Domain with computed status
export const domainWithStatusSchema = domainSchema.extend({
  status: domainStatusSchema,
  days_until_expiry: z.number().nullable()
});

export type DomainWithStatus = z.infer<typeof domainWithStatusSchema>;

// Add domain input
export const addDomainInputSchema = z.object({
  domain_name: z.string().min(1, 'Domain name is required'),
  registrar: z.string().min(1, 'Registrar is required')
});

export type AddDomainInput = z.infer<typeof addDomainInputSchema>;

// Update domain input
export const updateDomainInputSchema = z.object({
  id: z.string().uuid(),
  domain_name: z.string().min(1).optional(),
  registrar: z.string().min(1).optional(),
  expiry_date: z.coerce.date().nullable().optional(),
  whois_data: z.string().nullable().optional()
});

export type UpdateDomainInput = z.infer<typeof updateDomainInputSchema>;

// Delete domain input
export const deleteDomainInputSchema = z.object({
  id: z.string().uuid()
});

export type DeleteDomainInput = z.infer<typeof deleteDomainInputSchema>;

// Get domains input (for filtering by user)
export const getDomainsInputSchema = z.object({
  user_id: z.string().uuid().optional()
});

export type GetDomainsInput = z.infer<typeof getDomainsInputSchema>;

// WHOIS lookup result
export const whoisResultSchema = z.object({
  domain_name: z.string(),
  expiry_date: z.coerce.date().nullable(),
  registrar: z.string().nullable(),
  whois_data: z.string(),
  success: z.boolean()
});

export type WhoisResult = z.infer<typeof whoisResultSchema>;
