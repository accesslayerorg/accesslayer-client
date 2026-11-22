import {
	usePendingTransactions,
	type PendingTransaction,
} from '@/contexts/PendingTransactionContext';
import { usePendingTransactionPoller } from '@/hooks/usePendingTransactionPoller';
import { buildStellarExpertTxUrl, truncateTxHash } from '@/constants/stellar';
import { env } from '@/utils/env.utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Mounted once near the app root. Starts the Horizon poller and renders one
 * card per tracked transaction, reflecting its pending/confirmed/failed/
 * timeout state (#1082). Confirmed transactions are left to the existing
 * showToast.transactionSuccess flow and removed here once their state
 * settles, so the two surfaces never show the same confirmation twice.
 */
export default function PendingTransactionBanner() {
	usePendingTransactionPoller();
	const { transactions, removeTransaction, retryTransaction } =
		usePendingTransactions();

	const visible = transactions.filter(
		(tx): tx is PendingTransaction & { state: 'pending' | 'failed' | 'timeout' } =>
			tx.state !== 'confirmed'
	);
	if (visible.length === 0) return null;

	return (
		<div
			className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
			data-testid="pending-transaction-banner"
		>
			{visible.map(tx => (
				<TransactionCard
					key={tx.hash}
					hash={tx.hash}
					state={tx.state}
					errorMessage={tx.errorMessage}
					onDismiss={() => removeTransaction(tx.hash)}
					onRetry={() => retryTransaction(tx.hash)}
				/>
			))}
		</div>
	);
}

function TransactionCard({
	hash,
	state,
	errorMessage,
	onDismiss,
	onRetry,
}: {
	hash: string;
	state: 'pending' | 'failed' | 'timeout';
	errorMessage?: string;
	onDismiss: () => void;
	onRetry: () => void;
}) {
	const explorerUrl = buildStellarExpertTxUrl(hash, env.VITE_STELLAR_NETWORK);

	return (
		<div
			role="status"
			aria-live="polite"
			data-testid={`pending-transaction-${state}`}
			className={cn(
				'rounded-xl border bg-slate-900 p-4 shadow-xl',
				state === 'pending' && 'border-amber-500/20',
				state === 'failed' && 'border-rose-500/30',
				state === 'timeout' && 'border-amber-500/30'
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="font-jakarta text-sm font-bold text-white">
						{state === 'pending' && 'Confirming transaction…'}
						{state === 'failed' && 'Transaction failed'}
						{state === 'timeout' && 'Still confirming'}
					</p>
					<p className="mt-1 font-mono text-xs text-white/50">
						{truncateTxHash(hash)}
					</p>
					{state === 'failed' && errorMessage && (
						<p
							data-testid="pending-transaction-error-message"
							className="mt-1 text-xs text-rose-300"
						>
							{errorMessage}
						</p>
					)}
					{state === 'timeout' && (
						<p className="mt-1 text-xs text-white/60">
							This is taking longer than usual. Check the explorer for the
							latest status.
						</p>
					)}
				</div>
				<button
					type="button"
					onClick={onDismiss}
					aria-label="Dismiss"
					className="text-white/40 hover:text-white"
				>
					×
				</button>
			</div>

			<div className="mt-3 flex items-center gap-2">
				<a
					href={explorerUrl}
					target="_blank"
					rel="noopener noreferrer"
					data-testid="pending-transaction-explorer-link"
					className="text-xs font-medium text-amber-400/80 underline-offset-2 hover:text-amber-300 hover:underline"
				>
					View on Stellar Expert
				</a>
				{state === 'failed' && (
					<Button
						size="sm"
						variant="outline"
						onClick={onRetry}
						data-testid="pending-transaction-retry"
					>
						Retry
					</Button>
				)}
			</div>
		</div>
	);
}
