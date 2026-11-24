import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { DecodedContractError } from '@/lib/contractErrors';

interface TransactionErrorDialogProps {
	open: boolean;
	onClose: () => void;
	decoded: DecodedContractError | null;
	onRecovery?: (action: string) => void;
}

export default function TransactionErrorDialog({
	open,
	onClose,
	decoded,
	onRecovery,
}: TransactionErrorDialogProps) {
	const [showDetails, setShowDetails] = useState(false);
	const [copied, setCopied] = useState(false);
	const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	if (!decoded) return null;

	const { entry, rawCode, rawMessage } = decoded;

	const detailsText = [
		rawCode ? `Error code: ${rawCode}` : null,
		`Message: ${rawMessage.slice(0, 500)}`,
	]
		.filter(Boolean)
		.join('\n');

	const handleCopy = () => {
		navigator.clipboard.writeText(detailsText).then(() => {
			setCopied(true);
			if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
			copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
		});
	};

	const handleRecovery = () => {
		onRecovery?.(entry.recoveryAction);
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={open => !open && onClose()}>
			<DialogContent
				className="max-w-md gap-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-0"
				data-testid="transaction-error-dialog"
			>
				<div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20">
						<AlertCircle className="size-5 text-rose-400" aria-hidden="true" />
					</div>
					<DialogHeader className="gap-0.5 text-left">
						<DialogTitle className="text-base font-bold text-white">
							{entry.title}
						</DialogTitle>
						<DialogDescription className="text-sm text-white/60">
							{entry.message}
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="space-y-4 px-6 py-5">
					<div className="flex flex-col gap-3 sm:flex-row-reverse">
						{entry.recoveryAction !== 'none' && (
							<Button
								onClick={handleRecovery}
								className={cn(
									'w-full sm:w-auto font-bold',
									entry.recoveryAction === 'add-funds'
										? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
										: 'bg-white text-slate-950 hover:bg-white/90'
								)}
								data-testid="tx-error-recovery-button"
							>
								{entry.recoveryLabel}
							</Button>
						)}
						<Button
							variant="outline"
							onClick={onClose}
							className="w-full border-white/15 bg-white/5 font-semibold text-white hover:bg-white/10 sm:w-auto"
							data-testid="tx-error-close-button"
						>
							{entry.recoveryAction === 'none' ? 'Dismiss' : 'Cancel'}
						</Button>
					</div>

					<div>
						<button
							type="button"
							onClick={() => setShowDetails(v => !v)}
							className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors"
							aria-expanded={showDetails}
							data-testid="tx-error-details-toggle"
						>
							<span>Show details</span>
							{showDetails ? (
								<ChevronUp className="size-3.5" aria-hidden="true" />
							) : (
								<ChevronDown className="size-3.5" aria-hidden="true" />
							)}
						</button>

						{showDetails && (
							<div
								className="mt-2 rounded-xl border border-white/10 bg-black/30 p-3"
								data-testid="tx-error-details-block"
							>
								<pre className="whitespace-pre-wrap break-words font-mono text-[0.65rem] leading-relaxed text-white/50">
									{detailsText}
								</pre>
								<button
									type="button"
									onClick={handleCopy}
									className="mt-2 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
									data-testid="tx-error-copy-details"
								>
									{copied ? (
										<Check className="size-3" aria-hidden="true" />
									) : (
										<Copy className="size-3" aria-hidden="true" />
									)}
									{copied ? 'Copied' : 'Copy to clipboard'}
								</button>
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
