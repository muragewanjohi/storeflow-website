/**
 * Form Submissions Client Component
 * 
 * Displays form submissions with data view
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Submission {
  id: string;
  data: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

interface FormSubmissionsClientProps {
  formId: string;
  formTitle: string;
}

export default function FormSubmissionsClient({
  formId,
  formTitle,
}: Readonly<FormSubmissionsClientProps>) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/forms/${formId}/submissions`);
        const data = await response.json();

        if (response.ok) {
          setSubmissions(data.submissions || []);
          setPagination(data.pagination || null);
        } else {
          setError(data.error || 'Failed to load submissions');
        }
      } catch (err) {
        setError('Failed to load submissions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [formId]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Link href="/dashboard/forms">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Forms
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Form Submissions</h1>
            <p className="text-muted-foreground">
              View submissions for &quot;{formTitle}&quot;
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All Submissions</CardTitle>
              <CardDescription>
                {pagination?.total || 0} total submission{pagination?.total !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">Loading submissions...</p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No submissions yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Fields</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow
                        key={submission.id}
                        className={selectedSubmission?.id === submission.id ? 'bg-muted' : 'cursor-pointer'}
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <TableCell>{formatDate(submission.created_at)}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {submission.ip_address || 'N/A'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {Object.keys(submission.data || {}).length} fields
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submission Detail */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
              <CardDescription>
                {selectedSubmission ? 'View submission data' : 'Select a submission to view details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedSubmission ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Submitted</Label>
                    <p className="text-sm font-medium">{formatDate(selectedSubmission.created_at)}</p>
                  </div>
                  {selectedSubmission.ip_address && (
                    <div>
                      <Label className="text-xs text-muted-foreground">IP Address</Label>
                      <p className="text-sm font-medium font-mono">{selectedSubmission.ip_address}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Form Data</Label>
                    <div className="space-y-2">
                      {Object.entries(selectedSubmission.data || {}).map(([key, value]) => (
                        <div key={key} className="border rounded p-2">
                          <Label className="text-xs font-medium text-muted-foreground">{key}</Label>
                          <p className="text-sm mt-1">
                            {Array.isArray(value) ? value.join(', ') : String(value || 'N/A')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Click on a submission to view details
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

