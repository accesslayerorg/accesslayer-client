import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/time.utils';
import { formatCreatorHandle } from '@/utils/handleDisplay.utils';
import TransactionTypeBadge from '@/components/common/TransactionTypeBadge';


export interface Transaction {
	id: string;
	type: 'buy' | 'sell';
	/** Raw creator identifier from the API — never shown in the UI. */
	creatorId: string;
	/** Human-readable handle used for display (e.g. instructorId). */
	creatorHandle: string;
	amount: number;
	price: number;
	timestamp: number;
	txHash: string;
	status: 'completed' | 'pending' | 'failed';
}

interface TransactionHistoryProps {
	transactions?: Transaction[];
}

const COMPACT_VIEW_KEY = 'accesslayer.transaction-compact-view';

const SAMPLE_TRANSACTIONS: Transaction[] = [
	{
		id: '1',
		type: 'buy',
		creatorId: '1',
		creatorHandle: 'arivers',
		amount: 5,
		price: 0.05,
		timestamp: Date.now() - 1000 * 60 * 30,
		txHash: '0x1234...abcd',
		status: 'completed',
	},
	{
		id: '2',
		type: 'sell',
		creatorId: '2',
		creatorHandle: 'schen_dev',
		amount: 3,
		price: 0.12,
		timestamp: Date.now() - 1000 * 60 * 60 * 2,
		txHash: '0x5678...efgh',
		status: 'completed',
	},
	{
		id: '3',
		type: 'buy',
		creatorId: '3',
		creatorHandle: 'mthorne',
		amount: 10,
		price: 0.08,
		timestamp: Date.now() - 1000 * 60 * 60 * 5,
		txHash: '0x9abc...def0',
		status: 'completed',
	},
	{
		id: '4',
		type: 'buy',
		creatorId: '4',
		creatorHandle: 'evance_design',
		amount: 2,
		price: 0.04,
		timestamp: Date.now() - 1000 * 60 * 60 * 24,
		txHash: '0x1357...2468',
		status: 'completed',
	},
	{
		id: '5',
		type: 'sell',
		creatorId: '5',
		creatorHandle: 'dkojo_beats',
		amount: 7,
		price: 0.15,
		timestamp: Date.now() - 1000 * 60 * 60 * 48,
		txHash: '0x2468...1357',
		status: 'completed',
	},
];

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
	transactions = SAMPLE_TRANSACTIONS,
}) => {
	const [isCompact, setIsCompact] = useState(() => {
		if (typeof window === 'undefined') return false;
		const saved = localStorage.getItem(COMPACT_VIEW_KEY);
		return saved === 'true';
	});
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

	useEffect(() => {
		localStorage.setItem(COMPACT_VIEW_KEY, String(isCompact));
	}, [isCompact]);

	const sortedTransactions = [...transactions].sort((left, right) => {
		if (left.timestamp !== right.timestamp) {
			return right.timestamp - left.timestamp;
		}

		return right.id.localeCompare(left.id);
	});

	const toggleCompact = () => {
		setIsCompact(!isCompact);
	};

	const toggleRowExpansion = (id: string) => {
		setExpandedRows(prev => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const getTransactionIcon = (type: Transaction['type']) => {
		switch (type) {
			case 'buy':
				return <ArrowUpRight className="size-4 text-emerald-400" />;
			case 'sell':
				return <ArrowDownRight className="size-4 text-rose-400" />;
			default:
				return <Minus className="size-4 text-white/40" />;
		}
	};

	return (
		<section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h3 className="font-grotesque text-2xl font-bold text-white">
						Transaction History
					</h3>
					<p className="mt-1 text-sm text-white/65">
						Your recent buy and sell activity
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={toggleCompact}
					className="rounded-xl border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
				>
					{isCompact ? 'Expand View' : 'Compact View'}
				</Button>
			</div>

			<div className="space-y-2">
				{sortedTransactions.map(tx => {
					const displayHandle = formatCreatorHandle(tx.creatorHandle);
					const isExpanded = expandedRows.has(tx.id) || !isCompact;
					return (
						<div
							key={tx.id}
							data-testid={`activity-item-${tx.type}`}
							className={cn(
								'group rounded-xl border border-white/10 bg-white/[0.02] transition-all duration-200 hover:border-white/20 hover:bg-white/[0.04]',
								isCompact && !isExpanded && 'py-2',
								(!isCompact || isExpanded) && 'p-4'
							)}
						>
							<div className="flex items-center gap-4">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/5">
									{getTransactionIcon(tx.type)}
								</div>
								
								<div className="flex min-w-0 flex-1 items-center gap-4">
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<TransactionTypeBadge type={tx.type} />
											<span className="text-white/40">•</span>
											<span
												className="text-white/90"
												data-testid={`activity-creator-handle-${tx.id}`}
											>
												{displayHandle}
											</span>
										</div>
										{(!isCompact || isExpanded) && (
											<div className="mt-1 flex items-center gap-3 text-xs text-white/50">
												<span>{tx.amount} keys</span>
												<span className="text-white/30">•</span>
												<span>{tx.price} XLM</span>
												<span className="text-white/30">•</span>
												<span>{formatRelativeTime(tx.timestamp)}</span>
											</div>
										)}
									</div>

									{(!isCompact || isExpanded) && (
										<div className="hidden shrink-0 items-center gap-4 text-right sm:flex">
											<div className="text-sm">
												<div
													className="font-semibold text-white"
													data-testid={`tx-amount-${tx.id}`}
												>
													{tx.type === 'buy' ? '-' : '+'}
													{(tx.amount * tx.price).toFixed(4)} XLM
												</div>
												<div className="text-xs text-white/50">
													{tx.txHash}
												</div>
											</div>
											<div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
												<div className="size-1.5 rounded-full bg-emerald-400" />
												<span className="text-xs font-semibold text-emerald-400">
													{tx.status}
												</span>
											</div>
										</div>
									)}

									{isCompact && !isExpanded && (
										<div className="flex shrink-0 items-center gap-3">
											<div className="text-right">
												<div
													className="text-sm font-semibold text-white"
													data-testid={`tx-amount-${tx.id}`}
												>
													{tx.type === 'buy' ? '-' : '+'}
													{(tx.amount * tx.price).toFixed(4)} XLM
												</div>
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => toggleRowExpansion(tx.id)}
												className="h-8 w-8 rounded-lg p-0 text-white/50 hover:bg-white/10 hover:text-white"
											>
												<ChevronDown className="size-4" />
											</Button>
										</div>
									)}

									{isCompact && isExpanded && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => toggleRowExpansion(tx.id)}
											className="h-8 w-8 rounded-lg p-0 text-white/50 hover:bg-white/10 hover:text-white"
										>
											<ChevronUp className="size-4" />
										</Button>
									)}
								</div>
							</div>

							{isCompact && isExpanded && (
								<div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
									<div className="flex items-center gap-3 text-white/50">
										<span>{tx.amount} keys</span>
										<span className="text-white/30">•</span>
										<span>{tx.price} XLM</span>
										<span className="text-white/30">•</span>
										<span>{formatRelativeTime(tx.timestamp)}</span>
										<span className="text-white/30">•</span>
										<span>{tx.txHash}</span>
									</div>
									<div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
										<div className="size-1.5 rounded-full bg-emerald-400" />
										<span className="text-xs font-semibold text-emerald-400">
											{tx.status}
										</span>
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
};

export default TransactionHistory;
