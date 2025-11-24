/**
 * Support Ticket Validation Schemas
 * 
 * Zod schemas for validating support ticket data
 */

import { z } from 'zod';

/**
 * Support ticket status enum
 */
export const ticketStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);

/**
 * Support ticket priority enum
 */
export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

/**
 * Create support ticket schema
 */
export const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject must be less than 255 characters'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description must be less than 5000 characters'),
  priority: ticketPrioritySchema.default('medium'),
  department_id: z.string().uuid('Department ID must be a valid UUID').optional().nullable(),
});

/**
 * Update support ticket schema
 */
export const updateTicketSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  department_id: z.string().uuid('Department ID must be a valid UUID').optional().nullable(),
  subject: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(5000).optional(),
});

/**
 * Create support ticket message schema
 */
export const createTicketMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message must be less than 5000 characters'),
  attachments: z.array(z.string().url('Invalid attachment URL')).optional().default([]),
});

/**
 * Support ticket query schema (for filtering and pagination)
 */
export const ticketQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  department_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'priority', 'status']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

/**
 * Support department schema (for creating/updating departments)
 */
export const supportDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(255, 'Department name must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
});

