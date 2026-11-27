import { useEffect, useState } from 'react';
import { ArrowLeftRight, Clock3, ExternalLink } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { buildStellarExpertTxUrl, truncateTxHash } from '@/constants/stellar';
import { env } from '@/utils/env.utils';
import { formatElapsedTime } from '@/utils/time.utils';
import { useNowMs } from '@/hooks/useNowMs';
import { usePollTransactionStatus } from '@/hooks/usePollTransactionStatus';
import {
	selectPendingTransactionCount,
	usePendingTxStore,
	type PendingTransaction,
	type PendingTransactionStatus,
	type PendingTransactionType,
} from '@/hooks/usePendingTxStore';

/**
 * Pending transaction tracker drawer (#1286).
 *
 * The trigger lives in the nav bar and carries a badge with the number of
 * transactions still waiting for ledger inclusion. Opening it lists every
 * tracked submission with a live status chip, the truncated hash linked to
 * Stellar Expert, and how long ago it was submitted.
 *
 * Each pending transaction is polled in the background (even while the
 * drawer is closed) so a page refresh resumes tracking immediately, and
 * completed rows are pruned 60 seconds after they settle.
 */

const TYPE_LABELS: Record<PendingTransactionType, string> = {
	buy: 'Buy',
	sell: 'Sell',
	add_liquidity: 'Add liquidity',
	claim_rewards: 'Claim rewards',
	remove_liquidity: 'Remove liquidity',
};

const STATUS_LABELS: Record<PendingTransactionStatus, string> = {
	pending: 'Pending',
	success: 'Success',
	failed: 'Failed',
};

const STATUS_CHIP_CLASSES: Record<PendingTransactionStatus, string> = {
	pending: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
	success: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
	failed: 'border-red-500/30 bg-red-500/15 text-red-300',
};

const PRUNE_INTERVAL_MS = 5_000;

/** Polls one transaction and renders nothing; the drawer reads the store. */
function TransactionStatusPoller({ hash }: { hash: string }) {
	usePollTransactionStatus(hash);
	return null;
}

function PendingTransactionRow({
	transaction,
	nowMs,
}: {
	transaction: PendingTransaction;
	nowMs: number;
}) {
	const explorerUrl = buildStellarExpertTxUrl(
		transaction.hash,
		env.VITE_STELLAR_NETWORK
	);

	return (
		<li
			data-testid={`pending-tx-row-${transaction.hash}`}
			className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
		>
			<div className="flex items-center justify-between gap-2">
				<span className="text-sm font-semibold text-white">
					{TYPE_LABELS[transaction.type]}
				</span>
				<span
					data-testid={`pending-tx-status-${transaction.hash}`}
					className={cn(
						'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
						STATUS_CHIP_CLASSES[transaction.status]
					)}
				>
					{STATUS_LABELS[transaction.status]}
				</span>
			</div>

			<div className="flex items-center justify-between gap-3 text-xs text-white/50">
				<a
					href={explorerUrl}
					target="_blank"
					rel="noopener noreferrer"
					data-testid={`pending-tx-hash-${transaction.hash}`}
					aria-label={`View transaction ${transaction.hash} on Stellar Expert`}
					className="inline-flex items-center gap-1 font-mono text-white/70 transition-colors hover:text-amber-300"
					title={transaction.hash}
				>
					{truncateTxHash(transaction.hash)}
					<ExternalLink className="size-3" aria-hidden="true" />
				</a>
				<span data-testid={`pending-tx-elapsed-${transaction.hash}`}>
					{formatElapsedTime(transaction.submittedAt, nowMs)} ago
				</span>
			</div>
		</li>
	);
}

export interface PendingTransactionsDrawerProps {
	/** Extra classes for the nav-bar trigger button. */
	className?: string;
}

export function PendingTransactionsDrawer({
	className,
}: PendingTransactionsDrawerProps) {
	const [open, setOpen] = useState(false);
	const transactions = usePendingTxStore(state => state.transactions);
	const pendingCount = usePendingTxStore(selectPendingTransactionCount);
	const pruneCompletedTransactions = usePendingTxStore(
		state => state.pruneCompletedTransactions
	);
	const nowMs = useNowMs(1_000);

	// Drop rows that settled more than 60 seconds ago. Running the effect on
	// mount also clears stale entries restored from sessionStorage.
	useEffect(() => {
		pruneCompletedTransactions();
		const id = window.setInterval(
			() => pruneCompletedTransactions(),
			PRUNE_INTERVAL_MS
		);
		return () => window.clearInterval(id);
	}, [pruneCompletedTransactions]);

	const pendingTransactions = transactions.filter(
		tx => tx.status === 'pending'
	);

	return (
		<>
			{/* Background pollers keep tracking while the drawer is closed. */}
			{pendingTransactions.map(tx => (
				<TransactionStatusPoller key={tx.hash} hash={tx.hash} />
			))}

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<button
						type="button"
						data-testid="pending-tx-trigger"
						aria-label={
							pendingCount > 0
								? `Pending transactions — ${pendingCount} pending`
								: 'Pending transactions'
						}
						className={cn(
							'relative inline-flex items-center justify-center rounded-full p-2 transition-colors',
							'text-white/70 hover:bg-white/10 hover:text-white',
							className
						)}
					>
						<Clock3 className="size-5" aria-hidden="true" />
						{pendingCount > 0 && (
							<span
								data-testid="pending-tx-badge"
								aria-hidden="true"
								className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 font-mono text-[10px] font-bold leading-none text-slate-950"
							>
								{pendingCount > 99 ? '99+' : pendingCount}
							</span>
						)}
					</button>
				</DialogTrigger>

				<DialogContent
					data-testid="pending-transactions-drawer"
					showEscapeHint={false}
					className="top-0 bottom-0 left-auto right-0 h-full max-w-md translate-x-0 translate-y-0 grid-rows-[auto_1fr] rounded-none border-l border-white/10 bg-[#0b1728] p-6 text-white data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
				>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-white">
							<ArrowLeftRight
								className="size-4 text-amber-400"
								aria-hidden="true"
							/>
							Pending transactions
						</DialogTitle>
						<DialogDescription className="text-white/55">
							Transactions waiting for ledger inclusion. Status updates
							automatically every few seconds.
						</DialogDescription>
					</DialogHeader>

					{transactions.length === 0 ? (
						<p
							data-testid="pending-tx-empty-state"
							className="py-10 text-center text-sm text-white/50"
						>
							No pending transactions.
						</p>
					) : (
						<ul
							className="mt-2 space-y-2 overflow-y-auto"
							aria-label="Tracked transactions"
						>
							{transactions.map(tx => (
								<PendingTransactionRow
									key={tx.hash}
									transaction={tx}
									nowMs={nowMs}
								/>
							))}
						</ul>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

export default PendingTransactionsDrawer;
