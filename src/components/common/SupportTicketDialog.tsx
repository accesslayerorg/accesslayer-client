import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	SUPPORT_TICKET_ISSUE_TYPES,
	SUPPORT_TICKET_ISSUE_TYPE_LABELS,
	type SupportTicketIssueType,
} from '@/services/supportTicket.service';
import {
	SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH,
	validateSupportTicketDraft,
} from '@/utils/supportTicket.utils';
import { useSubmitSupportTicket } from '@/hooks/useSupportTickets';

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

export interface SupportTicketDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	keyId: string;
	keyName?: string;
}

/**
 * Report-an-issue form for a specific key (#1250): frozen trading, a
 * disputed transaction, an incorrect balance, or an unlisted issue,
 * routed to admin review. Shown from the "Report Issue" button on the
 * key detail page and each portfolio holding row.
 */
const SupportTicketDialog: React.FC<SupportTicketDialogProps> = ({
	open,
	onOpenChange,
	keyId,
	keyName,
}) => {
	const triggerElementRef = useRef<HTMLElement | null>(null);
	const [issueType, setIssueType] = useState<SupportTicketIssueType | ''>('');
	const [description, setDescription] = useState('');
	const [transactionHash, setTransactionHash] = useState('');
	const [showError, setShowError] = useState(false);

	const submit = useSubmitSupportTicket();
	const isSubmitting = submit.isPending;

	useEffect(() => {
		if (open) {
			triggerElementRef.current = document.activeElement as HTMLElement | null;
		} else {
			setIssueType('');
			setDescription('');
			setTransactionHash('');
			setShowError(false);
		}
	}, [open]);

	const validationError = validateSupportTicketDraft({
		issueType,
		description,
		transactionHash,
	});
	const remaining = SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH - description.length;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		if (validationError || !issueType) {
			setShowError(true);
			return;
		}

		submit.mutate(
			{
				keyId,
				issueType,
				description: description.trim(),
				transactionHash: transactionHash.trim() || undefined,
			},
			{
				onSuccess: () => {
					onOpenChange(false);
				},
			}
		);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={next => !isSubmitting && onOpenChange(next)}
		>
			<DialogContent
				className="max-w-md"
				showCloseButton={!isSubmitting}
				showEscapeHint={!isSubmitting}
				data-testid="support-ticket-dialog"
				onCloseAutoFocus={event => {
					event.preventDefault();
					triggerElementRef.current?.focus();
				}}
				onEscapeKeyDown={event => {
					if (isSubmitting) event.preventDefault();
				}}
				onInteractOutside={event => {
					if (isSubmitting) event.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>Report an issue</DialogTitle>
					<DialogDescription>
						Report a problem with {keyName ?? 'this key'}. Your ticket is
						routed to admin review.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4" noValidate>
					<div className="space-y-1.5">
						<label
							htmlFor="support-ticket-issue-type"
							className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
						>
							Issue type
						</label>
						<select
							id="support-ticket-issue-type"
							data-testid="support-ticket-issue-type-select"
							value={issueType}
							onChange={e =>
								setIssueType(e.target.value as SupportTicketIssueType)
							}
							disabled={isSubmitting}
							className={fieldClass}
						>
							<option value="" disabled className="bg-[#06111f]">
								Select an issue type
							</option>
							{SUPPORT_TICKET_ISSUE_TYPES.map(value => (
								<option key={value} value={value} className="bg-[#06111f]">
									{SUPPORT_TICKET_ISSUE_TYPE_LABELS[value]}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<label
								htmlFor="support-ticket-description"
								className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
							>
								Description
							</label>
							<span
								data-testid="support-ticket-char-count"
								aria-live="polite"
								className={
									remaining < 0 ? 'text-xs text-red-400' : 'text-xs text-white/40'
								}
							>
								{description.length}/{SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH}
							</span>
						</div>
						<textarea
							id="support-ticket-description"
							data-testid="support-ticket-description-input"
							rows={5}
							value={description}
							onChange={e => setDescription(e.target.value)}
							disabled={isSubmitting}
							placeholder="Describe what happened."
							aria-invalid={showError && remaining < 0 ? 'true' : undefined}
							className={fieldClass}
						/>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="support-ticket-tx-hash"
							className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
						>
							Transaction hash{' '}
							<span className="text-white/30">(optional)</span>
						</label>
						<input
							id="support-ticket-tx-hash"
							data-testid="support-ticket-tx-hash-input"
							type="text"
							value={transactionHash}
							onChange={e => setTransactionHash(e.target.value)}
							disabled={isSubmitting}
							placeholder="64-character transaction hash, if applicable"
							className={`${fieldClass} font-mono`}
						/>
					</div>

					{showError && validationError && (
						<p
							role="alert"
							data-testid="support-ticket-error"
							className="text-xs text-red-400"
						>
							{validationError}
						</p>
					)}

					<DialogFooter className="sm:justify-between">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
							data-testid="support-ticket-cancel"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting}
							aria-busy={isSubmitting || undefined}
							data-testid="support-ticket-submit"
						>
							<StableButtonContent
								isLoading={isSubmitting}
								loadingLabel="Submitting…"
							>
								Submit ticket
							</StableButtonContent>
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default SupportTicketDialog;
