import { Download, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useDataExport } from '@/hooks/useDataExport';
import DeleteAccountFlow from '@/components/settings/DeleteAccountFlow';

/**
 * Privacy settings page (#1387).
 *
 * Surfaces two actions:
 *  1. Data export — request, poll status, download when ready, show expiry.
 *  2. Account deletion — warning, typed confirmation, grace period with cancel.
 */
export default function PrivacySettingsPage() {
	useNavigationTiming('privacy-settings');

	const {
		exportData,
		status,
		isLoading: exportLoading,
		isRequesting,
		requestExport,
		downloadUrl,
		expiresAt,
	} = useDataExport();

	const exportReady = status === 'ready';
	const exportPending = status === 'pending';
	const exportExpired = status === 'expired';

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
				<span className="text-foreground">Privacy</span>
			</nav>

			<div className="mb-8 flex items-center gap-3">
				<ShieldCheck
					className="size-6 text-foreground"
					aria-hidden="true"
				/>
				<div>
					<h1 className="font-jakarta text-2xl font-semibold">Privacy</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Export your data or permanently delete your account.
					</p>
				</div>
			</div>

			{/* ── Data export ─────────────────────────────────────────────── */}
			<section
				className="mb-6 rounded-xl border border-border p-4"
				aria-labelledby="data-export-heading"
				data-testid="data-export-section"
			>
				<div className="flex items-start gap-3">
					<Download
						className="mt-0.5 size-5 shrink-0 text-foreground"
						aria-hidden="true"
					/>
					<div className="flex-1">
						<h2
							id="data-export-heading"
							className="text-sm font-semibold text-foreground"
						>
							Export your data
						</h2>
						<p className="mt-1 text-xs text-muted-foreground">
							Request a copy of your account data. The download link
							expires after 24 hours.
						</p>

						{exportLoading && (
							<div
								className="mt-3 h-8 w-32 animate-pulse rounded bg-muted"
								data-testid="export-loading-skeleton"
							/>
						)}

						{!exportLoading && (
							<div className="mt-3 flex flex-wrap items-center gap-3">
								{/* No export yet or failed — show request button */}
								{(!exportData || status === 'failed') && (
									<Button
										variant="outline"
										size="sm"
										onClick={requestExport}
										disabled={isRequesting}
										data-testid="request-export-btn"
									>
										{isRequesting && (
											<LoaderCircle
												className="mr-2 size-4 animate-spin"
												aria-hidden="true"
											/>
										)}
										Request export
									</Button>
								)}

								{/* Pending — show spinner + status */}
								{exportPending && (
									<span
										aria-live="polite"
										className="flex items-center gap-2 text-xs text-muted-foreground"
										data-testid="export-pending-status"
									>
										<LoaderCircle
											className="size-4 animate-spin"
											aria-hidden="true"
										/>
										Preparing your export…
									</span>
								)}

								{/* Ready — show download link */}
								{exportReady && downloadUrl && (
									<div
										className="flex flex-col gap-1"
										data-testid="export-ready"
									>
										<a
											href={downloadUrl}
											download
											className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
										>
											<Download className="size-3.5" aria-hidden="true" />
											Download export
										</a>
										{expiresAt && (
											<p className="text-xs text-muted-foreground">
												Link expires{' '}
												{new Date(expiresAt).toLocaleString()}
											</p>
										)}
									</div>
								)}

								{/* Expired */}
								{exportExpired && (
									<div
										className="flex flex-col gap-1"
										data-testid="export-expired"
									>
										<p className="text-xs text-destructive">
											Your previous export link has expired.
										</p>
										<Button
											variant="outline"
											size="sm"
											onClick={requestExport}
											disabled={isRequesting}
										>
											Request new export
										</Button>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</section>

			{/* ── Account deletion ─────────────────────────────────────────── */}
			<DeleteAccountFlow />
		</main>
	);
}
