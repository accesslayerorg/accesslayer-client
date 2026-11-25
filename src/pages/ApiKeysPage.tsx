import { useState } from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { AsyncButton } from '@/components/ui/async-button';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import CreateApiKeyModal from '@/components/settings/CreateApiKeyModal';
import SecretRevealDialog from '@/components/settings/SecretRevealDialog';
import { useApiKeys, useRevokeApiKey } from '@/hooks/useApiKeys';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { cn } from '@/lib/utils';
import type { ApiKey, CreatedApiKey } from '@/services/apiKey.service';
import { formatRelativeTime } from '@/utils/time.utils';

const STATUS_CLASSNAME: Record<ApiKey['status'], string> = {
	active: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-300',
	revoked: 'border-white/10 bg-white/5 text-white/40',
};

const STATUS_LABELS: Record<ApiKey['status'], string> = {
	active: 'Active',
	revoked: 'Revoked',
};

const FALLBACK_PREFIX = 'ak_live_…';

/**
 * Developer settings (#1322): create, inspect and revoke scoped API keys.
 *
 * The full secret is held only in this component's state for the one-time
 * reveal and is never written to the query cache or browser storage.
 */
export default function ApiKeysPage() {
	useNavigationTiming('developer_settings');

	const { data: keys, isLoading, isError } = useApiKeys();
	const revokeKey = useRevokeApiKey();

	const [createOpen, setCreateOpen] = useState(false);
	const [createdSecret, setCreatedSecret] = useState<string | null>(null);
	const [createdPrefix, setCreatedPrefix] = useState<string | null>(null);
	const [pendingRevoke, setPendingRevoke] = useState<ApiKey | null>(null);

	const handleSecretCreated = (created: CreatedApiKey) => {
		setCreatedSecret(created.secret);
		setCreatedPrefix(created.apiKey.prefix);
		setCreateOpen(false);
	};

	const handleCloseSecret = () => {
		setCreatedSecret(null);
	};

	const handleConfirmRevoke = () => {
		if (!pendingRevoke) return;
		revokeKey.mutate(pendingRevoke.id);
		setPendingRevoke(null);
	};

	const sortedKeys = [...(keys ?? [])].sort(
		(a, b) => Number(a.status === 'revoked') - Number(b.status === 'revoked')
	);

	const samplePrefix =
		createdPrefix ??
		sortedKeys.find(key => key.status === 'active')?.prefix ??
		FALLBACK_PREFIX;

	const sampleRequest = `curl https://api.accesslayer.xyz/v1/keys \\
  -H "X-API-Key: ${samplePrefix}…"`;

	return (
		<main className="mx-auto max-w-3xl px-6 py-16">
			<nav aria-label="Breadcrumb" className="mb-4 text-sm">
				<Link
					to="/settings"
					className="text-muted-foreground transition-colors hover:text-foreground"
				>
					Settings
				</Link>
				<span className="mx-2 text-muted-foreground">/</span>
				<span className="text-foreground">Developer</span>
			</nav>

			<div className="mb-8 flex flex-wrap items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<KeyRound
						className="size-6 text-foreground"
						aria-hidden="true"
					/>
					<div>
						<h1 className="font-jakarta text-2xl font-semibold">
							API keys
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Scoped keys for your integrations and creator tooling.
						</p>
					</div>
				</div>

				<Button
					type="button"
					data-testid="create-api-key-button"
					onClick={() => setCreateOpen(true)}
					className="gap-2"
				>
					<Plus className="size-4" aria-hidden="true" />
					Create API key
				</Button>
			</div>

			<section aria-labelledby="api-keys-list-heading" className="mb-10">
				<h2 id="api-keys-list-heading" className="sr-only">
					Your API keys
				</h2>

				{isLoading && (
					<div data-testid="api-keys-loading" className="space-y-3">
						{Array.from({ length: 2 }).map((_, index) => (
							<div
								key={index}
								className="h-24 w-full animate-pulse rounded-xl bg-muted"
							/>
						))}
					</div>
				)}

				{!isLoading && isError && (
					<div
						role="alert"
						data-testid="api-keys-error"
						className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
					>
						We couldn't load your API keys. Please refresh and try again.
					</div>
				)}

				{!isLoading && !isError && sortedKeys.length === 0 && (
					<div
						data-testid="api-keys-empty"
						className="flex flex-col items-center gap-3 rounded-2xl border border-border py-16 text-center"
					>
						<div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
							<KeyRound className="size-6" aria-hidden="true" />
						</div>
						<p className="text-sm text-muted-foreground">
							You haven't created any API keys yet
						</p>
					</div>
				)}

				{!isLoading && !isError && sortedKeys.length > 0 && (
					<ul
						data-testid="api-keys-list"
						className="divide-y divide-border rounded-xl border border-border"
					>
						{sortedKeys.map(key => (
							<li
								key={key.id}
								data-testid={`api-key-row-${key.id}`}
								className="flex flex-wrap items-start gap-4 px-4 py-4"
							>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<p className="truncate font-jakarta text-sm font-semibold text-foreground">
											{key.name}
										</p>
										<span
											data-testid={`api-key-status-${key.id}`}
											className={cn(
												'rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
												STATUS_CLASSNAME[key.status]
											)}
										>
											{STATUS_LABELS[key.status]}
										</span>
									</div>

									<p
										data-testid={`api-key-prefix-${key.id}`}
										className="mt-1 font-mono text-xs text-muted-foreground"
									>
										{key.prefix}…
									</p>

									<div className="mt-2 flex flex-wrap gap-1.5">
										{key.scopes.map(scope => (
											<span
												key={scope}
												className="rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
											>
												{scope}
											</span>
										))}
									</div>

									<p className="mt-2 text-xs text-muted-foreground">
										Last used{' '}
										{key.lastUsedAt
											? formatRelativeTime(key.lastUsedAt)
											: 'never'}
									</p>
								</div>

								{key.status === 'active' && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										data-testid={`revoke-api-key-${key.id}`}
										onClick={() => setPendingRevoke(key)}
										className="gap-1.5 text-destructive hover:border-destructive/50 hover:bg-destructive/10"
									>
										<Trash2 className="size-3.5" aria-hidden="true" />
										Revoke
									</Button>
								)}
							</li>
						))}
					</ul>
				)}
			</section>

			<section
				aria-labelledby="api-key-usage-heading"
				data-testid="api-key-usage"
				className="rounded-xl border border-border p-4"
			>
				<h2
					id="api-key-usage-heading"
					className="font-jakarta text-sm font-semibold text-foreground"
				>
					Using your API key
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Send the full key in the{' '}
					<code className="font-mono">X-API-Key</code> header on every
					request. Keep it server-side — never ship it in a browser bundle.
				</p>
				<pre
					data-testid="api-key-sample-request"
					className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground"
				>
					{sampleRequest}
				</pre>
			</section>

			<CreateApiKeyModal
				open={createOpen}
				onOpenChange={setCreateOpen}
				onSecretCreated={handleSecretCreated}
			/>

			<SecretRevealDialog
				open={createdSecret !== null}
				secret={createdSecret ?? ''}
				onClose={handleCloseSecret}
			/>

			<Dialog
				open={pendingRevoke !== null}
				onOpenChange={open => {
					if (!open) setPendingRevoke(null);
				}}
			>
				<DialogContent data-testid="revoke-api-key-dialog">
					<DialogHeader>
						<DialogTitle>Revoke this API key?</DialogTitle>
						<DialogDescription>
							{pendingRevoke
								? `${pendingRevoke.name} (${pendingRevoke.prefix}…) will stop working immediately. This can't be undone.`
								: ''}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							data-testid="revoke-api-key-cancel"
							onClick={() => setPendingRevoke(null)}
						>
							Cancel
						</Button>
						<AsyncButton
							type="button"
							variant="destructive"
							isPending={revokeKey.isPending}
							pendingText="Revoking…"
							data-testid="revoke-api-key-confirm"
							onClick={handleConfirmRevoke}
						>
							Revoke key
						</AsyncButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</main>
	);
}
