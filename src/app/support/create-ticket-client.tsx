/**
 * Create Support Ticket Client Component
 * 
 * Form for customers to create a new support ticket
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
}

interface Department {
  id: string;
  name: string;
  description?: string | null;
}

interface CreateTicketClientProps {
  customer: Customer;
  departments: Department[];
}

export default function CreateTicketClient({
  customer,
  departments,
}: Readonly<CreateTicketClientProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types (images only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      setError('Only image files (JPEG, PNG, WebP, GIF) are allowed');
      return;
    }

    // Validate file sizes (5MB max each)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError('File size must be less than 5MB');
      return;
    }

    setAttachments(files);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setUploadingFiles(true);

    try {
      // Upload attachments first
      const attachmentUrls: string[] = [];
      for (const file of attachments) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/support/upload', {
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

      // Create ticket first
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          description,
          priority,
          department_id: departmentId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create ticket');
      }

      // If there are attachments, create an initial message with them
      if (attachmentUrls.length > 0 && data.ticket?.id) {
        await fetch(`/api/support/tickets/${data.ticket.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: description, // Use description as initial message with attachments
            attachments: attachmentUrls,
          }),
        }).catch((err) => {
          console.error('Failed to add attachments to ticket:', err);
          // Don't fail ticket creation if message creation fails
        });
      }

      // Redirect to ticket detail page
      router.push(`/support/tickets/${data.ticket.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket');
      setUploadingFiles(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Contact Support</h1>
        <p className="text-muted-foreground mt-2">
          Create a support ticket and we&apos;ll get back to you as soon as possible.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Support Ticket</CardTitle>
          <CardDescription>
            Fill out the form below to submit a support request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Please provide as much detail as possible about your issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={8}
                maxLength={5000}
              />
              <p className="text-sm text-muted-foreground">
                {description.length} / 5000 characters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {departments.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department (Optional)</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {departments.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachments">Attachments (Images, max 5MB each) - Optional</Label>
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

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting || uploadingFiles || !subject.trim() || !description.trim()}>
                {isSubmitting || uploadingFiles ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadingFiles ? 'Uploading...' : 'Creating Ticket...'}
                  </>
                ) : (
                  'Create Ticket'
                )}
              </Button>
              <Link href="/support/tickets">
                <Button type="button" variant="outline">
                  View My Tickets
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

