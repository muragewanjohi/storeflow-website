/**
 * Tenant Landlord Support Ticket Detail Client Component
 * 
 * Displays ticket details with conversation thread for tenant viewing their tickets to landlord
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

interface Message {
  id: string;
  message: string;
  attachments: string[];
  user_id: string | null;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

interface TenantLandlordTicketDetailClientProps {
  initialTicket: Ticket | null;
  error: string | null;
  tenantId: string;
  currentUserId: string;
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'open':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'resolved':
      return 'default';
    case 'closed':
      return 'outline';
    default:
      return 'default';
  }
}

function getPriorityBadgeVariant(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'default';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'secondary';
  }
}

function formatStatus(status: string) {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatPriority(priority: string) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatCategory(category: string) {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function TenantLandlordTicketDetailClient({
  initialTicket,
  error,
  tenantId,
  currentUserId,
}: Readonly<TenantLandlordTicketDetailClientProps>) {
  const router = useRouter();
  const [replyMessage, setReplyMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(initialTicket);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types (images only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      setUpdateError('Only image files (JPEG, PNG, WebP, GIF) are allowed');
      return;
    }

    // Validate file sizes (5MB max each)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setUpdateError('File size must be less than 5MB');
      return;
    }

    setAttachments(files);
    setUpdateError(null);
  };

  const handleReply = async () => {
    if (!ticket || !replyMessage.trim()) {
      return;
    }

    setIsReplying(true);
    setUploadingFiles(true);
    setUpdateError(null);
    setSuccessMessage(null);

    try {
      // Upload attachments first
      const attachmentUrls: string[] = [];
      for (const file of attachments) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/admin/support/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload image');
        }

        const uploadData = await uploadResponse.json();
        attachmentUrls.push(uploadData.url);
      }

      setUploadingFiles(false);

      // Send reply with attachments
      const response = await fetch(`/api/admin/support/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: replyMessage,
          attachments: attachmentUrls,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reply');
      }

      // Refresh ticket data
      const ticketResponse = await fetch(`/api/admin/support/tickets/${ticket.id}`);
      const ticketData = await ticketResponse.json();
      
      if (ticketData.success) {
        setTicket(ticketData.ticket);
        setReplyMessage('');
        setAttachments([]);
        setSuccessMessage('Reply sent successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to send reply');
      setUploadingFiles(false);
    } finally {
      setIsReplying(false);
    }
  };

  if (error || !ticket) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || 'Ticket not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/support/landlord-tickets">
              <Button variant="outline">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to Tickets
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTenantMessage = (message: Message) => {
    return message.user_id === currentUserId;
  };

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/support/landlord-tickets">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Tickets
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mt-4">{ticket.subject}</h1>
          <p className="text-muted-foreground mt-2">
            Ticket ID: {ticket.id.substring(0, 8)}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={getStatusBadgeVariant(ticket.status)}>
            {formatStatus(ticket.status)}
          </Badge>
          <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
            {formatPriority(ticket.priority)}
          </Badge>
          <Badge variant="outline">
            {formatCategory(ticket.category)}
          </Badge>
        </div>
      </div>

      {updateError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{updateError}</p>
          </CardContent>
        </Card>
      )}

      {successMessage && (
        <Card className="border-green-500">
          <CardContent className="pt-6">
            <p className="text-green-600">{successMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Ticket Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{ticket.description}</p>
        </CardContent>
      </Card>

      {/* Conversation Thread */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
          <CardDescription>
            {ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.messages.map((message) => (
            <div
              key={message.id}
              className={`p-4 rounded-lg border ${
                isTenantMessage(message)
                  ? 'bg-muted ml-8'
                  : 'bg-background mr-8'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">
                    {isTenantMessage(message) ? 'You' : 'Platform Support'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap">{message.message}</p>
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Attachments:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {message.attachments.map((url, idx) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes('image');
                      return (
                        <div key={idx} className="relative">
                          {isImage ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                              <img
                                src={url}
                                alt={`Attachment ${idx + 1}`}
                                className="w-full h-32 object-cover rounded border hover:opacity-80 transition-opacity"
                              />
                            </a>
                          ) : (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View attachment {idx + 1}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Reply Form */}
      {ticket.status !== 'closed' && (
        <Card>
          <CardHeader>
            <CardTitle>Reply</CardTitle>
            <CardDescription>Send a reply to the platform support team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reply">Message</Label>
              <Textarea
                id="reply"
                placeholder="Type your reply here..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachments">Attachments (Images, max 5MB each)</Label>
              <input
                id="attachments"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                multiple
                onChange={handleFileChange}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {attachments.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {attachments.length} file(s) selected
                </div>
              )}
            </div>
            <Button onClick={handleReply} disabled={isReplying || uploadingFiles || !replyMessage.trim()}>
              {isReplying || uploadingFiles ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadingFiles ? 'Uploading...' : 'Sending...'}
                </>
              ) : (
                'Send Reply'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ticket Info */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Created</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(ticket.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Last Updated</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(ticket.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

