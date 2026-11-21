import { useState } from 'react';
import { Shield, TrendingUp, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InsurancePoolData {
	poolBalance: string;
	totalCoverageOutstanding: string;
	averageCoveragePerPolicy: string;
	keyName: string;
}

interface InsurancePoolCardProps {
	data: InsurancePoolData;
	onFundPool: (amount: string) => Promise<void>;
	className?: string;
}

/**
 * #1179 — Insurance pool funding panel for creators.
 * Shows pool balance, coverage outstanding, gap, and a top-up form
 * with estimated coverage capacity preview.
 */
export function InsurancePoolCard({ data, onFundPool, className }: InsurancePoolCardProps) {
	const [amount, setAmount] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const poolBalance = parseFloat(data.poolBalance) || 0;
	const coverageOutstanding = parseFloat(data.totalCoverageOutstanding) || 0;
	const avgCoverage = parseFloat(data.averageCoveragePerPolicy) || 1;
	const gap = Math.max(0, coverageOutstanding - poolBalance);
	const coverageRatio = coverageOutstanding > 0 ? (poolBalance / coverageOutstanding) * 100 : 100;
	const isLowBalance = coverageRatio < 80;

	// Estimated coverage capacity from input amount
	const inputAmount = parseFloat(amount) || 0;
	const estimatedNewBalance = poolBalance + inputAmount;
	const estimatedCapacity = Math.floor(estimatedNewBalance / avgCoverage);

	const handleFund = async () => {
		if (!amount || inputAmount <= 0) {
			setError('Enter a valid amount.');
			return;
		}
		setSubmitting(true);
		setError(null);
		setSuccess(false);
		try {
			await onFundPool(amount);
			setSuccess(true);
			setAmount('');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fund pool.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={cn('rounded-xl border border-slate-700 bg-slate-800/50', className)}>
			<div className="p-4">
				<div className="mb-3 flex items-center gap-2">
					<Shield className="h-5 w-5 text-amber-500" />
					<h3 className="text-sm font-semibold text-white">Insurance Pool</h3>
					<span className="text-xs text-slate-500">{data.keyName}</span>
				</div>

				{/* Pool stats */}
				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-slate-400">Pool Balance</span>
						<span className="font-semibold text-white">{data.poolBalance}</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-slate-400">Coverage Outstanding</span>
						<span className="font-medium text-white">{data.totalCoverageOutstanding}</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-slate-400">Gap</span>
						<span className={cn('font-medium', gap > 0 ? 'text-red-400' : 'text-green-400')}>
							{gap > 0 ? `-${gap.toFixed(2)}` : 'None'}
						</span>
					</div>
				</div>

				{/* Low balance warning */}
				{isLowBalance && (
					<div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
						<AlertTriangle className="h-3.5 w-3.5 shrink-0" />
						Pool covers only {coverageRatio.toFixed(0)}% of outstanding coverage. Consider topping up.
					</div>
				)}

				{/* Top-up form */}
				<div className="mt-4 space-y-2">
					<label className="text-xs text-slate-400">Top Up Pool</label>
					<div className="flex gap-2">
						<input
							type="number"
							min="0"
							step="any"
							placeholder="Amount"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
							aria-label="Top up amount"
						/>
						<button
							onClick={handleFund}
							disabled={submitting || !amount || inputAmount <= 0}
							className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
						>
							{submitting ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<TrendingUp className="h-3.5 w-3.5" />
							)}
							Fund Pool
						</button>
					</div>

					{/* Coverage capacity preview */}
					{inputAmount > 0 && (
						<div className="rounded bg-slate-800 px-2 py-1.5 text-xs text-slate-400">
							Estimated capacity after top-up:{' '}
							<span className="font-medium text-white">{estimatedCapacity} policies</span>
						</div>
					)}

					{error && (
						<p className="text-xs text-red-400" role="alert">
							{error}
						</p>
					)}
					{success && (
						<div className="flex items-center gap-1.5 text-xs text-green-400">
							<CheckCircle2 className="h-3.5 w-3.5" />
							Pool funded successfully.
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
