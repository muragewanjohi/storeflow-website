/**
 * Landlord Support Ticket Validation Schemas
 * 
 * Zod schemas for validating landlord support ticket data
 * These are tickets from tenants to the landlord/platform admin
 */

import { z } from 'zod';

/**
 * Landlord support ticket status enum
 */
export const landlordTicketStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);

/**
 * Landlord support ticket priority enum
 */
export const landlordTicketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

/**
 * Create landlord support ticket schema
 */
export const createLandlordTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject must be less than 255 characters'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description must be less than 5000 characters'),
  priority: landlordTicketPrioritySchema.default('medium'),
  category: z.enum(['billing', 'technical', 'feature_request', 'bug_report', 'account', 'other']).optional(),
});

/**
 * Update landlord support ticket schema
 */
export const updateLandlordTicketSchema = z.object({
  status: landlordTicketStatusSchema.optional(),
  priority: landlordTicketPrioritySchema.optional(),
  subject: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(5000).optional(),
  category: z.enum(['billing', 'technical', 'feature_request', 'bug_report', 'account', 'other']).optional(),
});

/**
 * Create landlord support ticket message schema
 */
export const createLandlordTicketMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message must be less than 5000 characters'),
  attachments: z.array(z.string().url('Invalid attachment URL')).optional().default([]),
});

/**
 * Landlord support ticket query schema (for filtering and pagination)
 */
export const landlordTicketQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: landlordTicketStatusSchema.optional(),
  priority: landlordTicketPrioritySchema.optional(),
  category: z.enum(['billing', 'technical', 'feature_request', 'bug_report', 'account', 'other']).optional(),
  tenant_id: z.string().uuid().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'priority', 'status']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

