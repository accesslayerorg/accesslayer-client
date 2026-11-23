import { useState } from 'react';
import { AlertTriangle, LoaderCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';

/** Exact phrase the user must type to confirm deletion. */
const CONFIRM_PHRASE = 'delete my account';

export interface DeleteAccountFlowProps {
	className?: string;
}

/**
 * Account deletion section (#1387).
 *
 * - Shows blocking reasons when the account cannot be deleted.
 * - Requires the user to type "delete my account" before submitting.
 * - During the grace period shows the deadline and a cancel action.
 */
export default function DeleteAccountFlow({ className }: DeleteAccountFlowProps) {
	const {
		deletionState,
		isLoading,
		blockingReasons,
		gracePeriodEndsAt,
		isPending,
		isSubmitting,
		isCancelling,
		requestDeletion,
		cancelDeletion,
	} = useAccountDeletion();

	const [phrase, setPhrase] = useState('');
	const [showConfirm, setShowConfirm] = useState(false);

	const hasBlockers = blockingReasons.length > 0;
	const canSubmit =
		phrase === CONFIRM_PHRASE && !hasBlockers && !isSubmitting;

	if (isLoading) {
		return (
			<section
				className={cn('rounded-xl border border-border p-4', className)}
				aria-labelledby="delete-account-heading"
			>
				<div className="h-4 w-40 animate-pulse rounded bg-muted" />
			</section>
		);
	}

	if (isPending && gracePeriodEndsAt) {
		const deadline = new Date(gracePeriodEndsAt).toLocaleString();
		return (
			<section
				className={cn('rounded-xl border border-destructive/40 p-4', className)}
				aria-labelledby="delete-account-heading"
				data-testid="delete-account-pending"
			>
				<div className="flex items-start gap-3">
					<AlertTriangle
						className="mt-0.5 size-5 shrink-0 text-destructive"
						aria-hidden="true"
					/>
					<div className="flex-1">
						<h2
							id="delete-account-heading"
							className="text-sm font-semibold text-foreground"
						>
							Account deletion pending
						</h2>
						<p className="mt-1 text-xs text-muted-foreground">
							Your account is scheduled for deletion. You can cancel before{' '}
							<span className="font-medium text-foreground">{deadline}</span>.
						</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-3"
							onClick={cancelDeletion}
							disabled={isCancelling}
							data-testid="cancel-deletion-btn"
						>
							{isCancelling && (
								<LoaderCircle
									className="mr-2 size-4 animate-spin"
									aria-hidden="true"
								/>
							)}
							Cancel deletion
						</Button>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section
			className={cn('rounded-xl border border-border p-4', className)}
			aria-labelledby="delete-account-heading"
			data-testid="delete-account-section"
		>
			<div className="flex items-start gap-3">
				<XCircle
					className="mt-0.5 size-5 shrink-0 text-destructive"
					aria-hidden="true"
				/>
				<div className="flex-1">
					<h2
						id="delete-account-heading"
						className="text-sm font-semibold text-foreground"
					>
						Delete account
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Permanently delete your account and all associated data. This
						cannot be undone once the grace period expires.
					</p>

					{hasBlockers && (
						<ul
							role="list"
							aria-label="Blocking reasons"
							className="mt-3 space-y-1"
							data-testid="blocking-reasons"
						>
							{blockingReasons.map(reason => (
								<li
									key={reason}
									className="flex items-center gap-2 text-xs text-destructive"
								>
									<AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
									{reason}
								</li>
							))}
						</ul>
					)}

					{!hasBlockers && !showConfirm && (
						<Button
							variant="destructive"
							size="sm"
							className="mt-3"
							onClick={() => setShowConfirm(true)}
							data-testid="request-deletion-btn"
						>
							Request deletion
						</Button>
					)}

					{!hasBlockers && showConfirm && (
						<div className="mt-3 space-y-2" data-testid="deletion-confirm-form">
							<label
								htmlFor="confirm-phrase"
								className="block text-xs text-muted-foreground"
							>
								Type{' '}
								<span className="font-mono font-semibold text-foreground">
									{CONFIRM_PHRASE}
								</span>{' '}
								to confirm.
							</label>
							<Input
								id="confirm-phrase"
								value={phrase}
								onChange={e => setPhrase(e.target.value)}
								placeholder={CONFIRM_PHRASE}
								autoComplete="off"
								data-testid="confirm-phrase-input"
							/>
							<div className="flex gap-2">
								<Button
									variant="destructive"
									size="sm"
									disabled={!canSubmit}
									onClick={() => {
										if (canSubmit) requestDeletion();
									}}
									data-testid="confirm-deletion-btn"
								>
									{isSubmitting && (
										<LoaderCircle
											className="mr-2 size-4 animate-spin"
											aria-hidden="true"
										/>
									)}
									Confirm deletion
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setShowConfirm(false);
										setPhrase('');
									}}
								>
									Cancel
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
