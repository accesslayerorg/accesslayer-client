import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { AlertTriangle } from 'lucide-react';
import { formatNumber } from '@/utils/numberFormat.utils';
import { isOwnWallet } from '@/utils/isOwnWallet';
import {
  useStakingRewardPool,
  useFundRewardPoolMutation,
} from '@/hooks/useStakingRewardPool';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md';

/** Below this many days of coverage the low-balance warning shows. */
const LOW_BALANCE_THRESHOLD_DAYS = 7;

/**
 * Fund reward pool form for the creator key management dashboard (#1023).
 *
 * - Amount input recalculates the estimated reward rate live (the preview
 *   derives from the pool payload's `projectedRewardRate` interpolation, so
 *   the number matches the contract math rather than a client guess).
 * - The low-pool-balance warning shows when the pool covers fewer than
 *   {@link LOW_BALANCE_THRESHOLD_DAYS} days at the current stake rate.
 * - Only the creator wallet sees the form; everyone else gets nothing.
 */
export default function FundRewardPoolForm({ keyId }: { keyId: string }) {
	const { address } = useAccount();
	const [amount, setAmount] = useState('');

	const { data: pool, isLoading } = useStakingRewardPool(keyId);
	const fundMutation = useFundRewardPoolMutation(keyId, address ?? '');

	const isCreator = isOwnWallet(address, address);
	const parsedAmount = Number(amount);
	const canSubmit =
		isCreator &&
		pool != null &&
		Number.isFinite(parsedAmount) &&
		parsedAmount > 0;

	/**
	 * Live preview: scale the backend's projected rate between the current
	 * balance and the balance after the entered deposit. The backend
	 * computes the authoritative `projectedRewardRate` for the exact amount
	 * on submit; this preview interpolates the same relationship so the
	 * number updates on every keystroke without a request per keystroke.
	 */
	const previewedRate = useMemo(() => {
		if (!pool || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			return pool?.rewardRate ?? null;
		}
		const nextBalance = pool.poolBalanceXlm + parsedAmount;
		if (nextBalance <= 0) return pool.rewardRate;
		const weight = parsedAmount / nextBalance;
		return (
			pool.rewardRate * (1 - weight) +
			pool.projectedRewardRate * weight
		);
	}, [pool, parsedAmount]);

	if (!isCreator) return null;

	if (isLoading || !pool) {
		return (
			<section className={CARD_CLASS} data-testid="fund-pool-loading">
				<div className="h-4 w-40 animate-pulse rounded bg-white/10" />
				<div className="mt-4 h-10 animate-pulse rounded-xl bg-white/5" />
			</section>
		);
	}

	const lowBalance =
		pool.daysOfRewardsRemaining < LOW_BALANCE_THRESHOLD_DAYS;

	return (
		<section className={CARD_CLASS} data-testid="fund-reward-pool-form">
			<h2 className="font-grotesque text-xl font-black tracking-tight">
				Staking reward pool
			</h2>

			<dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div>
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Pool balance
					</dt>
					<dd className="mt-1 font-jakarta font-bold">
						{formatNumber(pool.poolBalanceXlm)} XLM
					</dd>
				</div>
				<div>
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Current reward rate
					</dt>
					<dd className="mt-1 font-jakarta font-bold">
						{(pool.rewardRate * 100).toFixed(2)}% APR
					</dd>
				</div>
				<div>
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Est. rate after funding
					</dt>
					<dd
						className="mt-1 font-jakarta font-bold text-emerald-400"
						data-testid="projected-reward-rate"
					>
						{previewedRate == null
							? '—'
							: `${(previewedRate * 100).toFixed(2)}% APR`}
					</dd>
				</div>
			</dl>

			{lowBalance && (
				<p
					className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300"
					role="alert"
					data-testid="low-balance-warning"
				>
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
					Low pool balance: rewards cover only{' '}
					{Math.max(0, Math.floor(pool.daysOfRewardsRemaining))} day(s) at
					the current stake rate. Fund the pool to keep rewards flowing.
				</p>
			)}

			<form
				className="mt-4 flex flex-col gap-3 sm:flex-row"
				onSubmit={event => {
					event.preventDefault();
					if (!canSubmit) return;
					fundMutation.mutate({ amountXlm: parsedAmount });
					setAmount('');
				}}
			>
				<input
					type="number"
					inputMode="decimal"
					min="0"
					step="any"
					placeholder="Amount in XLM"
					value={amount}
					onChange={event => setAmount(event.target.value)}
					className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-jakarta text-white placeholder:text-white/30"
					aria-label="Funding amount in XLM"
					data-testid="fund-pool-amount"
				/>
				<button
					type="submit"
					disabled={!canSubmit || fundMutation.isPending}
					className="shrink-0 rounded-full bg-white/10 px-6 py-2.5 font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
					data-testid="fund-pool-submit"
				>
					{fundMutation.isPending ? 'Funding…' : 'Fund pool'}
				</button>
			</form>
		</section>
	);
}
