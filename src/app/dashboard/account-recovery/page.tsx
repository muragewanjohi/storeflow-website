/**
 * Account Recovery Page
 * 
 * For tenant admins who have lost access to their email account
 * Creates a support ticket for manual verification and recovery
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function AccountRecoveryPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    storeSubdomain: '',
    adminEmail: '',
    adminName: '',
    storeName: '',
    approximateAccountCreationDate: '',
    lastSuccessfulLoginDate: '',
    additionalInfo: '',
    backupEmail: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/tenant/account-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || 'Failed to submit recovery request');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
              Recovery Request Submitted
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Your account recovery request has been submitted successfully.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-blue-900">What happens next?</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Our support team will review your request</li>
              <li>We&apos;ll verify your identity using the information provided</li>
              <li>You&apos;ll receive an email at your backup email (if provided) or we&apos;ll contact you through alternative means</li>
              <li>Once verified, we&apos;ll help you regain access to your account</li>
            </ol>
            <p className="text-xs text-blue-700 mt-4">
              <strong>Note:</strong> This process typically takes 24-48 hours. For urgent matters, please contact support directly.
            </p>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/dashboard/login">Back to Login</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
            Account Recovery
          </h2>
          <p className="text-sm text-gray-600">
            Lost access to your email? We&apos;ll help you recover your account.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Security Notice</p>
              <p>
                For your security, we need to verify your identity before we can help you recover your account. 
                Please provide as much information as possible. Our support team will review your request and contact you.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="storeSubdomain">Store Subdomain *</Label>
              <div className="flex items-center">
                <Input
                  id="storeSubdomain"
                  type="text"
                  required
                  value={formData.storeSubdomain}
                  onChange={(e) => setFormData({ ...formData, storeSubdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="mystore"
                  className="rounded-r-none"
                />
                <span className="px-4 py-2 bg-gray-100 border border-l-0 rounded-r-md text-gray-600 text-sm">
                  .dukanest.com
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Your store&apos;s subdomain (the part before .dukanest.com)
              </p>
            </div>

            <div>
              <Label htmlFor="adminEmail">Admin Email Address *</Label>
              <Input
                id="adminEmail"
                type="email"
                required
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="admin@example.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                The email address you used to create your admin account
              </p>
            </div>

            <div>
              <Label htmlFor="adminName">Your Full Name *</Label>
              <Input
                id="adminName"
                type="text"
                required
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="storeName">Store Name *</Label>
              <Input
                id="storeName"
                type="text"
                required
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                placeholder="My Awesome Store"
              />
            </div>

            <div>
              <Label htmlFor="backupEmail">Backup/Recovery Email (Optional)</Label>
              <Input
                id="backupEmail"
                type="email"
                value={formData.backupEmail}
                onChange={(e) => setFormData({ ...formData, backupEmail: e.target.value })}
                placeholder="backup@example.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                An alternative email where we can contact you about this recovery request
              </p>
            </div>

            <div>
              <Label htmlFor="approximateAccountCreationDate">Approximate Account Creation Date</Label>
              <Input
                id="approximateAccountCreationDate"
                type="date"
                value={formData.approximateAccountCreationDate}
                onChange={(e) => setFormData({ ...formData, approximateAccountCreationDate: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">
                When did you create your store? (Approximate date is fine)
              </p>
            </div>

            <div>
              <Label htmlFor="lastSuccessfulLoginDate">Last Successful Login Date (Optional)</Label>
              <Input
                id="lastSuccessfulLoginDate"
                type="date"
                value={formData.lastSuccessfulLoginDate}
                onChange={(e) => setFormData({ ...formData, lastSuccessfulLoginDate: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">
                When did you last successfully log in? (If you remember)
              </p>
            </div>

            <div>
              <Label htmlFor="additionalInfo">Additional Information</Label>
              <Textarea
                id="additionalInfo"
                rows={4}
                value={formData.additionalInfo}
                onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                placeholder="Any additional information that can help verify your identity (e.g., store description, first product added, billing information, etc.)"
              />
              <p className="mt-1 text-xs text-gray-500">
                The more information you provide, the faster we can verify your identity
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600">
              <strong>Privacy:</strong> All information provided will be used solely for account recovery verification purposes. 
              Our support team will review your request and contact you through the backup email (if provided) or alternative means.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Recovery Request'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

