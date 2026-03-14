import Link from 'next/link';

type RestorePageSearchParams = Promise<{
  accountDeleted?: string;
  subdomain?: string;
  tenantName?: string;
  deletedAt?: string;
  retentionDays?: string;
}>;

interface RestorePageProps {
  searchParams: RestorePageSearchParams;
}

export default async function AccountRestorePage({ searchParams }: Readonly<RestorePageProps>) {
  const params = await searchParams;
  const tenantName = params.tenantName || params.subdomain || 'your store';
  const subdomain = params.subdomain || 'unknown';
  const retentionDays = Number(params.retentionDays || '90');
  const supportEmail = 'support@dukanest.com';

  const deletedAtDate = params.deletedAt ? new Date(params.deletedAt) : null;
  const finalDeletionDate = deletedAtDate
    ? new Date(deletedAtDate.getTime() + retentionDays * 24 * 60 * 60 * 1000)
    : null;

  const restoreSubject = `Account Restore Request - ${tenantName} (${subdomain})`;
  const restoreBody = `Hello DukaNest Support,

I would like to restore my deleted account.

Store name: ${tenantName}
Store subdomain: ${subdomain}
Deleted at: ${deletedAtDate ? deletedAtDate.toISOString() : 'Unknown'}

Please assist me with restoring my account within the retention period.

Thank you.`;

  const restoreMailto = `mailto:${supportEmail}?subject=${encodeURIComponent(restoreSubject)}&body=${encodeURIComponent(restoreBody)}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">Account deleted</h1>
        <p className="mt-3 text-muted-foreground">
          <strong>{tenantName}</strong> has been deactivated and scheduled for permanent deletion.
        </p>

        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p>
            You can request account restoration within <strong>{retentionDays} days</strong> by emailing{' '}
            <a className="font-semibold underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>.
          </p>
          {finalDeletionDate && (
            <p className="mt-2">
              Estimated permanent deletion date:{' '}
              <strong>{finalDeletionDate.toLocaleString()}</strong>
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={restoreMailto}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Email support to restore
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Back to home
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Include your store name and subdomain in the email to speed up restoration.
        </p>
      </div>
    </main>
  );
}

