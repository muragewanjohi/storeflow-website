'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface StarterPackTestClientProps {
  tenantId: string;
}

export default function StarterPackTestClient({ tenantId }: Readonly<StarterPackTestClientProps>) {
  const [businessType, setBusinessType] = useState('Pets');
  const [selling, setSelling] = useState('Ornamental Fish');
  const [themeSlug, setThemeSlug] = useState('grocery');
  const [includeGeminiCall, setIncludeGeminiCall] = useState(true);
  const [checkSellingExists, setCheckSellingExists] = useState(true);
  const [forceExternalGeneration, setForceExternalGeneration] = useState(false);
  const [jobId, setJobId] = useState('');
  const [jobStatus, setJobStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [isAutoPolling, setIsAutoPolling] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [responseLog, setResponseLog] = useState<unknown>(null);

  const [assetsJson, setAssetsJson] = useState(
    JSON.stringify(
      {
        assets: [
          {
            productName: 'Fancy Red Cap Oranda',
            sourcePrompt: '4k studio product photo of ornamental fish with realistic details',
            imageUrl: 'https://example.com/generated-image.png',
            storagePath: 'onboarding/starter-pack/red-cap-oranda.png',
            width: 2048,
            height: 2048,
            mimeType: 'image/png',
            provider: 'nano-banana',
          },
        ],
        persistMode: 'tenant-profile',
        tenantId,
      },
      null,
      2
    )
  );

  const basePayload = useMemo(
    () => ({
      businessType,
      selling,
      themeSlug,
      locale: 'en-KE',
      currency: 'KES',
      productsCount: 8,
      categoriesCount: 8,
      blogPostsCount: 2,
      includeGeminiCall,
      includeNanoBananaCall: true,
      checkSellingExists,
      forceExternalGeneration,
      geminiModel: 'gemini-2.5-flash',
    }),
    [businessType, selling, themeSlug, includeGeminiCall, checkSellingExists, forceExternalGeneration]
  );

  const logResponse = (data: unknown) => {
    setResponseLog(data);
  };

  const checkSelling = async () => {
    setIsBusy(true);
    try {
      const response = await fetch('/api/onboarding/selling-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selling,
          businessType,
        }),
      });
      const data = await response.json();
      logResponse(data);
      if (!response.ok || !data.success) {
        throw new Error(data?.error?.message || 'Selling check failed');
      }
      toast.success(data.data.exists ? 'Selling already exists' : 'Selling not found');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to check selling');
    } finally {
      setIsBusy(false);
    }
  };

  const createJob = async () => {
    setIsBusy(true);
    try {
      const response = await fetch('/api/onboarding/starter-pack-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      });
      const data = await response.json();
      logResponse(data);
      if (!response.ok || !data.success) {
        throw new Error(data?.error?.message || 'Failed to create starter-pack job');
      }
      setJobId(data.data.jobId);
      setJobStatus('running');
      toast.success('Starter-pack job created');
      return data.data.jobId as string;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create job');
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const pollJobStatus = async (overrideJobId?: string) => {
    const activeJobId = overrideJobId || jobId;
    if (!activeJobId) {
      toast.error('Create a job first');
      return;
    }

    setIsBusy(true);
    try {
      const response = await fetch(`/api/onboarding/starter-pack-jobs/${activeJobId}`);
      const data = await response.json();
      logResponse(data);
      if (!response.ok || !data.success) {
        throw new Error(data?.error?.message || 'Failed to poll job status');
      }
      const status = data.data.status as 'running' | 'success' | 'failed';
      setJobStatus(status);

      if (status === 'success') {
        toast.success('Job completed successfully');
      } else if (status === 'failed') {
        toast.error(data.data.error || 'Job failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to poll job');
    } finally {
      setIsBusy(false);
    }
  };

  const runFullWorkflow = async () => {
    const created = await createJob();
    if (!created) return;
    setIsAutoPolling(true);
  };

  const saveAssets = async () => {
    if (!jobId) {
      toast.error('Create a job first');
      return;
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(assetsJson);
    } catch {
      toast.error('Assets JSON is invalid');
      return;
    }

    setIsBusy(true);
    try {
      const response = await fetch(`/api/onboarding/starter-pack-jobs/${jobId}/save-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedBody),
      });
      const data = await response.json();
      logResponse(data);
      if (!response.ok || !data.success) {
        throw new Error(data?.error?.message || 'Failed to save assets');
      }
      toast.success('Assets saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save assets');
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!isAutoPolling || !jobId) return;
    if (jobStatus === 'success' || jobStatus === 'failed') {
      setIsAutoPolling(false);
      return;
    }

    const interval = setInterval(() => {
      void pollJobStatus(jobId);
    }, 2500);

    return () => clearInterval(interval);
  }, [isAutoPolling, jobId, jobStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Starter Pack Workflow Testing</h1>
        <p className="text-muted-foreground mt-2">
          Test the onboarding flow from website UI (selling check, job creation, polling, and asset persistence).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Input</CardTitle>
          <CardDescription>Configure your niche and generation behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Input id="businessType" value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling">Selling</Label>
              <Input id="selling" value={selling} onChange={(e) => setSelling(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="themeSlug">Theme Slug</Label>
              <Input id="themeSlug" value={themeSlug} onChange={(e) => setThemeSlug(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="includeGeminiCall">Include Gemini Call</Label>
              <Switch id="includeGeminiCall" checked={includeGeminiCall} onCheckedChange={setIncludeGeminiCall} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="checkSellingExists">Check Selling Exists</Label>
              <Switch id="checkSellingExists" checked={checkSellingExists} onCheckedChange={setCheckSellingExists} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="forceExternalGeneration">Force External Generation</Label>
              <Switch
                id="forceExternalGeneration"
                checked={forceExternalGeneration}
                onCheckedChange={setForceExternalGeneration}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={checkSelling} disabled={isBusy}>
              1) Check Selling
            </Button>
            <Button onClick={createJob} disabled={isBusy}>
              2) Create Job
            </Button>
            <Button onClick={() => void pollJobStatus()} disabled={isBusy || !jobId} variant="outline">
              3) Poll Status
            </Button>
            <Button onClick={runFullWorkflow} disabled={isBusy}>
              Run Full Workflow
            </Button>
            <Button
              onClick={() => setIsAutoPolling((prev) => !prev)}
              disabled={!jobId || jobStatus === 'success' || jobStatus === 'failed'}
              variant="outline"
            >
              {isAutoPolling ? 'Stop Auto Poll' : 'Start Auto Poll'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job State</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Job ID:</span> {jobId || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Status:</span> {jobStatus}
          </div>
          <div>
            <span className="font-medium">Auto Polling:</span> {isAutoPolling ? 'on' : 'off'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Save Assets</CardTitle>
          <CardDescription>Paste generated image metadata and persist it to the completed job.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={assetsJson} onChange={(e) => setAssetsJson(e.target.value)} rows={12} className="font-mono" />
          <Button onClick={saveAssets} disabled={isBusy || !jobId}>
            4) Save Assets
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest Response</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[500px] overflow-auto rounded bg-muted p-3 text-xs">
            {responseLog ? JSON.stringify(responseLog, null, 2) : 'No response yet.'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

