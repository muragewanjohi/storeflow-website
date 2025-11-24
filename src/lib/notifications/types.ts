/**
 * Notification Types
 */

export type NotificationType = 
  | 'new_order' 
  | 'pending_payment' 
  | 'failed_payment' 
  | 'low_stock'
  | 'new_support_ticket'
  | 'support_ticket_reply';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  created_at: Date | string; // Can be Date or ISO string from API
  read: boolean;
  metadata?: Record<string, any>;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
  unread_count: number;
  total: number;
}

