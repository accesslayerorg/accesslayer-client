import React, { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Copy, Check } from 'lucide-react';
import showToast from '@/utils/toast.util';
import { formatTimestampTooltip } from '@/utils/time.utils';

export interface TransactionFailureDetails {
	txHash?: string;
	errorCode?: string;
	errorMessage: string;
	developerDetails?: Record<string, unknown>;
	timestamp?: number;
}

export interface TransactionFailureDrawerProps {
	open: boolean;
	onOpenChange?: (open: boolean) => void;
	failureDetails: TransactionFailureDetails;
	onRetry?: () => void;
	onDismiss?: () => void;
}

const TransactionFailureDrawer: React.FC<TransactionFailureDrawerProps> = ({
	open,
	onOpenChange,
	failureDetails,
	onRetry,
	onDismiss,
}) => {
	const [copiedField, setCopiedField] = useState<
		'errorCode' | 'txHash' | null
	>(null);

	const copyToClipboard = async (
		text: string,
		field: 'errorCode' | 'txHash'
	) => {
		try {
			await navigator.clipboard.writeText(text);
			showToast.success('Copied to clipboard');
			setCopiedField(field);
			window.setTimeout(() => setCopiedField(null), 2000);
		} catch {
			showToast.error('Failed to copy to clipboard');
		}
	};

	const handleClose = () => {
		onDismiss?.();
		onOpenChange?.(false);
	};

	const timestamp = failureDetails.timestamp
		? formatTimestampTooltip(failureDetails.timestamp, {
				showAbsolute: false,
			})
		: null;

	const handleCopyErrorCode = () => {
		if (failureDetails.errorCode) {
			copyToClipboard(failureDetails.errorCode, 'errorCode').catch(() => {});
		}
	};

	const handleCopyTxHash = () => {
		if (failureDetails.txHash) {
			copyToClipboard(failureDetails.txHash, 'txHash').catch(() => {});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-3 mb-3">
						<div className="rounded-full bg-red-500/15 p-3">
							<AlertCircle className="size-6 text-red-400" />
						</div>
						<div>
							<DialogTitle>Transaction Failed</DialogTitle>
							<DialogDescription className="sr-only">
								Details about why the transaction failed.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-4 border-t border-white/5 pt-4">
					{failureDetails.timestamp && timestamp && (
						<div>
							<p className="text-sm font-medium text-white/70 mb-2">
								Time
							</p>
							<p
								className="text-sm text-white/80 rounded-lg bg-white/5 p-3"
								title={timestamp.title ?? undefined}
							>
								{timestamp.display}
							</p>
						</div>
					)}
					<div>
						<p className="text-sm font-medium text-white/70 mb-2">
							Error Message
						</p>
						<p className="text-sm text-white/90 rounded-lg bg-white/5 p-3 break-words">
							{failureDetails.errorMessage}
						</p>
					</div>

					{failureDetails.errorCode && (
						<div>
							<p className="text-sm font-medium text-white/70 mb-2">
								Error Code
							</p>
							<div className="flex items-center gap-2 rounded-lg bg-white/5 p-3">
								<code className="text-sm text-amber-400 font-mono flex-1 break-all">
									{failureDetails.errorCode}
								</code>
								<button
									type="button"
									onClick={handleCopyErrorCode}
									className="shrink-0 p-2 hover:bg-white/10 rounded transition-colors"
									aria-label={
										copiedField === 'errorCode'
											? 'Error code copied'
											: 'Copy error code'
									}
								>
									{copiedField === 'errorCode' ? (
										<Check
											className="size-4 text-emerald-400"
											aria-hidden="true"
										/>
									) : (
										<Copy
											className="size-4 text-white/60"
											aria-hidden="true"
										/>
									)}
								</button>
							</div>
							<span
								role="status"
								aria-live="polite"
								aria-atomic="true"
								className="sr-only"
							>
								{copiedField === 'errorCode'
									? 'Error code copied to clipboard'
									: ''}
							</span>
						</div>
					)}

					{failureDetails.txHash && (
						<div>
							<p className="text-sm font-medium text-white/70 mb-2">
								Transaction Hash
							</p>
							<div className="flex items-center gap-2 rounded-lg bg-white/5 p-3">
								<code className="text-sm text-white/60 font-mono flex-1 truncate">
									{failureDetails.txHash}
								</code>
								<button
									type="button"
									onClick={handleCopyTxHash}
									className="shrink-0 p-2 hover:bg-white/10 rounded transition-colors"
									aria-label={
										copiedField === 'txHash'
											? 'Transaction hash copied'
											: 'Copy transaction hash'
									}
								>
									{copiedField === 'txHash' ? (
										<Check
											className="size-4 text-emerald-400"
											aria-hidden="true"
										/>
									) : (
										<Copy
											className="size-4 text-white/60"
											aria-hidden="true"
										/>
									)}
								</button>
							</div>
							<span
								role="status"
								aria-live="polite"
								aria-atomic="true"
								className="sr-only"
							>
								{copiedField === 'txHash'
									? 'Transaction hash copied to clipboard'
									: ''}
							</span>
						</div>
					)}

					{failureDetails.developerDetails &&
						Object.keys(failureDetails.developerDetails).length > 0 && (
							<details className="text-sm cursor-pointer group">
								<summary className="font-medium text-white/70 group-open:text-white/90 transition-colors">
									Developer Details
								</summary>
								<pre className="mt-2 rounded-lg bg-white/5 p-3 overflow-auto text-xs text-white/60 font-mono">
									{JSON.stringify(
										failureDetails.developerDetails,
										null,
										2
									)}
								</pre>
							</details>
						)}
				</div>

				<DialogFooter className="sm:justify-between">
					<Button variant="ghost" size="sm" onClick={handleClose}>
						Dismiss
					</Button>
					{onRetry && (
						<Button size="sm" onClick={onRetry}>
							Retry Transaction
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default TransactionFailureDrawer;
