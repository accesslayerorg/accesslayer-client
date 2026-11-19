import { useEffect, useState, type FormEvent } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { ApiError } from '@/services/api.service';
import { reportKey, type KeyReportReason } from '@/services/moderation.service';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

const MAX_DETAILS_LENGTH = 500;

const REASONS: Array<{ value: KeyReportReason; label: string }> = [
	{ value: 'scam', label: 'Scam' },
	{ value: 'impersonation', label: 'Impersonation' },
	{ value: 'harassment', label: 'Harassment' },
	{ value: 'other', label: 'Other' },
];

interface ReportKeyModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	keyId: string;
	keyName?: string;
}

function reportedKeyStorageKey(keyId: string) {
	return `reported-key:${keyId}`;
}

function getErrorMessage(error: unknown): string {
	if (error instanceof ApiError && error.status === 409) {
		return 'This key has already been reported.';
	}
	if (error instanceof ApiError && error.status === 429) {
		return 'Too many reports have been submitted. Please try again later.';
	}
	return error instanceof Error
		? error.message
		: 'Could not submit your report.';
}

export default function ReportKeyModal({
	open,
	onOpenChange,
	keyId,
	keyName = 'this key',
}: ReportKeyModalProps) {
	const { address } = useAccount();
	const {
		connect,
		connectors,
		error: connectError,
		isPending: isConnecting,
	} = useConnect();
	const [reason, setReason] = useState<KeyReportReason | ''>('');
	const [details, setDetails] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [alreadyReported, setAlreadyReported] = useState(false);
	const [success, setSuccess] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setReason('');
		setDetails('');
		setSuccess(false);
		setErrorMessage(null);
		try {
			setAlreadyReported(
				window.sessionStorage.getItem(reportedKeyStorageKey(keyId)) ===
					'true'
			);
		} catch {
			setAlreadyReported(false);
			setErrorMessage(
				'Unable to verify whether this key was already reported.'
			);
		}
	}, [keyId, open]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (
			!reason ||
			!address ||
			isSubmitting ||
			details.length > MAX_DETAILS_LENGTH
		) {
			return;
		}

		try {
			if (
				window.sessionStorage.getItem(reportedKeyStorageKey(keyId)) ===
				'true'
			) {
				setAlreadyReported(true);
				return;
			}
			window.sessionStorage.setItem(reportedKeyStorageKey(keyId), 'true');
			setAlreadyReported(true);
		} catch {
			setErrorMessage(
				'Unable to verify whether this key was already reported.'
			);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);
		try {
			await reportKey(keyId, {
				reason,
				details,
				reporterAddress: address,
			});
			setSuccess(true);
		} catch (error) {
			try {
				window.sessionStorage.removeItem(reportedKeyStorageKey(keyId));
				setAlreadyReported(false);
				setErrorMessage(getErrorMessage(error));
			} catch {
				setErrorMessage(
					`${getErrorMessage(error)} The session duplicate-submission check could not be cleared.`
				);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const connector = connectors[0];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-white/10 bg-[#0b1728] text-white">
				<DialogHeader>
					<DialogTitle className="text-white">
						Report {keyName}
					</DialogTitle>
					<DialogDescription className="text-white/60">
						Reports are sent to moderators for review.
					</DialogDescription>
				</DialogHeader>

				{!address ? (
					<div className="space-y-4">
						<p className="text-sm text-white/75">
							Connect your wallet to report this key.
						</p>
						{connectError ? (
							<p role="alert" className="text-sm text-rose-300">
								{connectError.message}
							</p>
						) : null}
						<DialogFooter>
							<Button
								type="button"
								disabled={!connector || isConnecting}
								onClick={() => {
									if (connector) connect({ connector });
								}}
								className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
							>
								{isConnecting ? 'Connecting…' : 'Connect wallet'}
							</Button>
						</DialogFooter>
					</div>
				) : success ? (
					<div className="space-y-4">
						<p role="status" className="text-sm text-emerald-300">
							Your report has been submitted for moderator review.
						</p>
						{errorMessage ? (
							<p role="alert" className="text-sm text-amber-300">
								{errorMessage}
							</p>
						) : null}
						<DialogFooter>
							<Button type="button" onClick={() => onOpenChange(false)}>
								Done
							</Button>
						</DialogFooter>
					</div>
				) : alreadyReported && !isSubmitting ? (
					<p role="status" className="text-sm text-white/75">
						This key has already been reported in this session.
					</p>
				) : (
					<form className="space-y-5" onSubmit={handleSubmit}>
						<div className="space-y-2">
							<label
								htmlFor="report-key-reason"
								className="text-sm font-medium text-white/80"
							>
								Reason
							</label>
							<select
								id="report-key-reason"
								value={reason}
								onChange={event =>
									setReason(event.target.value as KeyReportReason | '')
								}
								className="w-full rounded-xl border border-white/15 bg-[#102033] px-4 py-3 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
							>
								<option value="">Select a reason</option>
								{REASONS.map(option => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="report-key-details"
								className="text-sm font-medium text-white/80"
							>
								Details (optional)
							</label>
							<textarea
								id="report-key-details"
								value={details}
								onChange={event => setDetails(event.target.value)}
								maxLength={MAX_DETAILS_LENGTH}
								rows={4}
								aria-describedby="report-key-details-count"
								className="w-full resize-y rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
							/>
							<p
								id="report-key-details-count"
								className="text-right text-xs text-white/45"
								aria-live="polite"
							>
								{details.length}/{MAX_DETAILS_LENGTH}
							</p>
						</div>

						{errorMessage ? (
							<p role="alert" className="text-sm text-rose-300">
								{errorMessage}
							</p>
						) : null}

						<DialogFooter>
							<Button
								type="button"
								variant="ghost"
								className="text-white/70 hover:text-white"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={
									!reason ||
									isSubmitting ||
									details.length > MAX_DETAILS_LENGTH
								}
								className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
							>
								{isSubmitting ? 'Submitting…' : 'Submit report'}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
