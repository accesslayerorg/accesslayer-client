import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import {
	AlertCircle,
	ArrowLeftRight,
	Download,
	Gift,
	History,
	Lock,
	ShoppingCart,
	Tag,
	Unlock,
	Users,
	type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import Web3Provider from '@/providers/Web3Provider';
import { cn } from '@/lib/utils';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import {
	useTransactionHistory,
	type FetchTransactionPage,
} from '@/hooks/useTransactionHistory';
import type {
	WalletTransaction,
	WalletTransactionType,
} from '@/services/transactionHistory.service';
import {
	DATE_RANGE_PRESETS,
	TRANSACTION_TYPE_FILTERS,
	TRANSACTION_TYPE_LABELS,
	buildTransactionCsvFilename,
	describeTransaction,
	downloadCsv,
	resolveDateRange,
	transactionsToCsv,
	type CustomDateRange,
	type DateRangePreset,
	type TransactionTypeFilter,
} from '@/utils/transactionHistory.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatRelativeTime } from '@/utils/time.utils';

const TRANSACTION_TYPE_ICONS: Record<WalletTransactionType, LucideIcon> = {
	buy: ShoppingCart,
	sell: Tag,
	stake: Lock,
	unstake: Unlock,
	claim: Gift,
	referral: Users,
	swap: ArrowLeftRight,
};

const FILTER_PILL_CLASS =
	'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

function formatXlm(value: number) {
	return `${formatNumber(value, { maximumFractionDigits: 4 })} XLM`;
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
	const Icon = TRANSACTION_TYPE_ICONS[tx.type];
	const isIn = tx.direction === 'in';

	return (
		<li
			data-testid={`transaction-row-${tx.id}`}
			data-type={tx.type}
			className="flex items-center gap-4 px-4 py-4"
		>
			<span
				data-testid={`transaction-icon-${tx.type}`}
				className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground"
			>
				<Icon className="size-4" aria-hidden="true" />
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground">
					{describeTransaction(tx)}
				</p>
				<p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
					<span>{TRANSACTION_TYPE_LABELS[tx.type]}</span>
					<span aria-hidden="true">•</span>
					<span>{tx.keyName}</span>
					<span aria-hidden="true">•</span>
					<time
						dateTime={new Date(tx.timestamp).toISOString()}
						title={new Date(tx.timestamp).toLocaleString()}
					>
						{formatRelativeTime(tx.timestamp)}
					</time>
				</p>
			</div>
			<div className="shrink-0 text-right">
				<p
					className={cn(
						'text-sm font-semibold',
						isIn
							? 'text-emerald-600 dark:text-emerald-400'
							: 'text-foreground'
					)}
				>
					<span className="sr-only">{isIn ? 'Received' : 'Sent'} </span>
					{isIn ? '+' : '−'}
					{formatXlm(tx.amount)}
				</p>
				<p className="mt-0.5 text-xs text-muted-foreground">
					Fee {formatXlm(tx.fee)}
				</p>
			</div>
		</li>
	);
}

export interface TransactionHistoryViewProps {
	address: string | undefined;
	fetchPage?: FetchTransactionPage;
}

export function TransactionHistoryView({
	address,
	fetchPage,
}: TransactionHistoryViewProps) {
	const [filter, setFilter] = useState<TransactionTypeFilter>('all');
	const [preset, setPreset] = useState<DateRangePreset>('30d');
	const [custom, setCustom] = useState<CustomDateRange>({
		start: '',
		end: '',
	});

	// Anchor "now" to when the preset/custom inputs change so the range is
	// stable across re-renders and doesn't trigger refetch loops.
	const range = useMemo(
		() => resolveDateRange(preset, custom),
		[preset, custom]
	);

	const {
		transactions,
		status,
		hasMore,
		isLoadingMore,
		loadMoreError,
		loadMore,
		retry,
	} = useTransactionHistory({ address, filter, range, fetchPage });

	const customRangeInvalid =
		preset === 'custom' && Boolean(custom.start && custom.end) && !range;

	const handleExport = () => {
		downloadCsv(
			buildTransactionCsvFilename(filter, preset),
			transactionsToCsv(transactions)
		);
	};

	return (
		<>
			<div className="mb-6 space-y-4">
				<div
					role="group"
					aria-label="Filter by type"
					className="flex flex-wrap gap-2"
				>
					{TRANSACTION_TYPE_FILTERS.map(option => (
						<button
							key={option.value}
							type="button"
							aria-pressed={filter === option.value}
							onClick={() => setFilter(option.value)}
							className={cn(
								FILTER_PILL_CLASS,
								filter === option.value
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-border text-muted-foreground hover:text-foreground'
							)}
						>
							{option.label}
						</button>
					))}
				</div>

				<div className="flex flex-wrap items-end justify-between gap-3">
					<div className="flex flex-wrap items-end gap-3">
						<div
							role="group"
							aria-label="Date range"
							className="flex flex-wrap gap-2"
						>
							{DATE_RANGE_PRESETS.map(option => (
								<button
									key={option.value}
									type="button"
									aria-pressed={preset === option.value}
									onClick={() => setPreset(option.value)}
									className={cn(
										FILTER_PILL_CLASS,
										preset === option.value
											? 'border-foreground/40 bg-accent text-accent-foreground'
											: 'border-border text-muted-foreground hover:text-foreground'
									)}
								>
									{option.label}
								</button>
							))}
						</div>
						{preset === 'custom' && (
							<div className="flex items-end gap-2 text-xs">
								<label className="flex flex-col gap-1 text-muted-foreground">
									From
									<input
										type="date"
										value={custom.start}
										max={custom.end || undefined}
										onChange={e =>
											setCustom(c => ({
												...c,
												start: e.target.value,
											}))
										}
										className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
									/>
								</label>
								<label className="flex flex-col gap-1 text-muted-foreground">
									To
									<input
										type="date"
										value={custom.end}
										min={custom.start || undefined}
										onChange={e =>
											setCustom(c => ({ ...c, end: e.target.value }))
										}
										className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
									/>
								</label>
							</div>
						)}
					</div>

					<Button
						variant="outline"
						size="sm"
						onClick={handleExport}
						disabled={transactions.length === 0}
					>
						<Download aria-hidden="true" />
						Export CSV
					</Button>
				</div>

				{customRangeInvalid && (
					<p role="alert" className="text-xs text-destructive">
						The start date must be on or before the end date.
					</p>
				)}
				{preset === 'custom' && !range && !customRangeInvalid && (
					<p className="text-xs text-muted-foreground">
						Pick a start and end date to see activity.
					</p>
				)}
			</div>

			{status === 'loading' && (
				<div
					data-testid="transaction-history-loading"
					className="space-y-3"
				>
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className="h-16 w-full animate-pulse rounded-xl bg-muted"
						/>
					))}
				</div>
			)}

			{status === 'error' && (
				<div
					role="alert"
					className="flex flex-col items-center gap-4 rounded-2xl border border-border py-12 text-center"
				>
					<AlertCircle
						className="size-6 text-destructive"
						aria-hidden="true"
					/>
					<p className="text-sm text-muted-foreground">
						We couldn't load your transaction history.
					</p>
					<Button variant="outline" size="sm" onClick={retry}>
						Try again
					</Button>
				</div>
			)}

			{status === 'ready' && transactions.length === 0 && (
				<div
					data-testid="transaction-history-empty"
					className="flex flex-col items-center gap-3 rounded-2xl border border-border py-16 text-center"
				>
					<History
						className="size-6 text-muted-foreground"
						aria-hidden="true"
					/>
					<p className="text-sm text-muted-foreground">
						No activity matches these filters.
					</p>
				</div>
			)}

			{status === 'ready' && transactions.length > 0 && (
				<>
					<ul
						data-testid="transaction-history-list"
						aria-label="Transactions"
						className="divide-y divide-border rounded-xl border border-border"
					>
						{transactions.map(tx => (
							<TransactionRow key={tx.id} tx={tx} />
						))}
					</ul>
					<div className="mt-6 flex flex-col items-center gap-2">
						{loadMoreError && (
							<p role="alert" className="text-xs text-destructive">
								Couldn't load more activity. Try again.
							</p>
						)}
						{hasMore ? (
							<Button
								variant="outline"
								size="sm"
								onClick={loadMore}
								disabled={isLoadingMore}
							>
								{isLoadingMore ? 'Loading…' : 'Load more'}
							</Button>
						) : (
							<p className="text-xs text-muted-foreground">
								You've reached the end of your activity.
							</p>
						)}
					</div>
				</>
			)}
		</>
	);
}

function TransactionHistoryPageContent() {
	useNavigationTiming('transaction_history');
	const { address, isConnected } = useAccount();

	return (
		<main className="mx-auto max-w-3xl px-6 py-16">
			<div className="mb-8 flex items-center gap-3">
				<History className="size-6 text-foreground" aria-hidden="true" />
				<div>
					<h1 className="font-jakarta text-2xl font-semibold">
						Transaction history
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Buys, sells, stakes, claims, swaps and referral payouts from
						your wallet.
					</p>
				</div>
			</div>

			{isConnected && address ? (
				<TransactionHistoryView address={address} />
			) : (
				<div className="flex flex-col items-center gap-4 rounded-2xl border border-border py-16 text-center">
					<p className="text-sm text-muted-foreground">
						Connect your wallet to see your transaction history.
					</p>
					<ConnectWalletButton />
				</div>
			)}
		</main>
	);
}

/**
 * Wallet providers are mounted per-route (see a066172) so wallet extensions
 * only initialise on pages that need them.
 */
export default function TransactionHistoryPage() {
	return (
		<Web3Provider>
			<TransactionHistoryPageContent />
		</Web3Provider>
	);
}
