/**
 * Scheduled Reports Manager Component
 * 
 * UI for managing scheduled analytics reports
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface ScheduledReport {
  id: string;
  report_type: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  email_recipients: string[];
  format: 'csv' | 'pdf';
  last_sent_at: string | null;
  next_send_at: string;
  is_active: boolean;
}

export default function ScheduledReportsManager() {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    reportType: 'overview',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    emailRecipients: '',
    format: 'csv' as 'csv' | 'pdf',
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/analytics/scheduled-reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.emailRecipients.trim()) {
      toast.error('Please enter at least one email address');
      return;
    }

    const emails = formData.emailRecipients.split(',').map(e => e.trim()).filter(Boolean);

    try {
      const response = await fetch('/api/analytics/scheduled-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: formData.reportType,
          frequency: formData.frequency,
          emailRecipients: emails,
          format: formData.format,
        }),
      });

      if (response.ok) {
        toast.success('Scheduled report created');
        setShowForm(false);
        setFormData({
          reportType: 'overview',
          frequency: 'weekly',
          emailRecipients: '',
          format: 'csv',
        });
        fetchReports();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create report');
      }
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('Failed to create scheduled report');
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return;

    try {
      const response = await fetch(`/api/analytics/scheduled-reports?id=${reportId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Scheduled report deleted');
        fetchReports();
      } else {
        toast.error('Failed to delete report');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete scheduled report');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading scheduled reports...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scheduled Reports</CardTitle>
            <CardDescription>Automated email reports for analytics data</CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-6 p-4 border rounded-lg space-y-4">
            <div>
              <Label>Report Type</Label>
              <Select
                value={formData.reportType}
                onValueChange={(value) => setFormData({ ...formData, reportType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="customers">Customers</SelectItem>
                  <SelectItem value="conversion">Conversion Funnel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Email Recipients (comma-separated)</Label>
              <Input
                value={formData.emailRecipients}
                onChange={(e) => setFormData({ ...formData, emailRecipients: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>

            <div>
              <Label>Format</Label>
              <Select
                value={formData.format}
                onValueChange={(value: any) => setFormData({ ...formData, format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate}>Create Report</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No scheduled reports. Create one to get automated analytics emails.
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="font-medium">{report.report_type} Report</div>
                  <div className="text-sm text-muted-foreground">
                    {report.frequency} • {report.email_recipients.join(', ')} • {report.format.toUpperCase()}
                  </div>
                  {report.last_sent_at && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Last sent: {new Date(report.last_sent_at).toLocaleString()}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Next: {new Date(report.next_send_at).toLocaleString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(report.id)}
                >
                  <TrashIcon className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
