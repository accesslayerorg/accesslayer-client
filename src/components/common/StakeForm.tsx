import { useMemo, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InlineValidationMessage from '@/components/common/InlineValidationMessage';
import { cn } from '@/lib/utils';
import { formatXlmPrice, formatPercent } from '@/utils/numberFormat.utils';
import type { StakingVaultLockPeriod } from '@/services/stakingVault.service';

// ─── Lock period options ───────────────────────────────────────────────────────

interface LockOption {
	days: StakingVaultLockPeriod;
	label: string;
	/** Rough APY multiplier relative to base (purely illustrative until the API
	 *  returns a live estimate). */
	apyMultiplier: number;
}

const LOCK_OPTIONS: LockOption[] = [
	{ days: 7, label: '7 days', apyMultiplier: 0.5 },
	{ days: 30, label: '30 days', apyMultiplier: 1 },
	{ days: 90, label: '90 days', apyMultiplier: 1.8 },
	{ days: 180, label: '180 days', apyMultiplier: 3 },
];

/** Rough estimated reward in XLM based on pool balance, lock length, and amount.
 *  Replaced with a live API estimate once the endpoint is wired up. */
function computeEstimatedReward(
	amount: number,
	lockDays: StakingVaultLockPeriod,
	rewardPoolBalance: number
): number {
	// Simple heuristic: share of pool proportional to (amount * days).
	// This is only shown as a UI preview — backend is authoritative.
	const option = LOCK_OPTIONS.find(o => o.days === lockDays)!;
	const estimatedApy = 0.12 * option.apyMultiplier; // base 12% APY
	return parseFloat(
		((amount * rewardPoolBalance * estimatedApy * lockDays) / 365).toFixed(4)
	);
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StakeFormProps {
	/** Maximum keys the wallet can stake (their current holdings for this key). */
	availableBalance: number;
	/** Current reward pool balance for this key (XLM). Used for reward preview. */
	rewardPoolBalance: number;
	/** Called when the user submits a valid stake. */
	onStake: (amount: number, lockPeriodDays: StakingVaultLockPeriod) => void;
	/** Whether a stake submission is in flight. */
	isSubmitting?: boolean;
	/** Whether the wallet is connected. When false the button is disabled. */
	isConnected?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StakeForm({
	availableBalance,
	rewardPoolBalance,
	onStake,
	isSubmitting = false,
	isConnected = true,
}: StakeFormProps) {
	const [amountText, setAmountText] = useState('');
	const [touched, setTouched] = useState(false);
	const [selectedPeriod, setSelectedPeriod] =
		useState<StakingVaultLockPeriod>(30);

	// Parse as integer — keys are whole units
	const parsedAmount = useMemo(() => {
		const n = parseInt(amountText.trim(), 10);
		return Number.isFinite(n) ? n : null;
	}, [amountText]);

	const validationError = useMemo((): string | null => {
		if (!amountText.trim()) return 'Please enter an amount.';
		if (parsedAmount === null || parsedAmount <= 0)
			return 'Amount must be a positive whole number.';
		if (parsedAmount > availableBalance)
			return `You only hold ${availableBalance} key${availableBalance === 1 ? '' : 's'} available to stake.`;
		return null;
	}, [amountText, parsedAmount, availableBalance]);

	const isAmountValid = validationError === null;
	const showValidationError = touched && !isAmountValid;

	const estimatedReward = useMemo(() => {
		if (!isAmountValid || parsedAmount === null) return null;
		return computeEstimatedReward(parsedAmount, selectedPeriod, rewardPoolBalance);
	}, [isAmountValid, parsedAmount, selectedPeriod, rewardPoolBalance]);

	const selectedOption = LOCK_OPTIONS.find(o => o.days === selectedPeriod)!;
	const illustrativeApy = 0.12 * selectedOption.apyMultiplier * 100; // as %

	const canSubmit = isAmountValid && isConnected && !isSubmitting;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setTouched(true);
		if (!isAmountValid || parsedAmount === null) return;
		onStake(parsedAmount, selectedPeriod);
	};

	return (
		<form
			onSubmit={handleSubmit}
			data-testid="stake-form"
			className="space-y-5"
		>
			{/* Amount input */}
			<div>
				<label
					htmlFor="stake-amount-input"
					className="mb-2 block text-sm font-medium text-white/70"
				>
					Amount to stake
				</label>
				<div className="flex items-center gap-3">
					<input
						id="stake-amount-input"
						data-testid="stake-amount-input"
						type="text"
						inputMode="numeric"
						autoComplete="off"
						placeholder={`Max ${availableBalance}`}
						value={amountText}
						disabled={isSubmitting}
						onChange={e => {
							setAmountText(e.target.value);
							if (!touched && e.target.value.trim() !== '')
								setTouched(true);
						}}
						onBlur={() => setTouched(true)}
						className={cn(
							'h-12 min-w-0 flex-1 rounded-xl border bg-white/[0.03] px-4 font-mono text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/20',
							showValidationError ? 'border-red-500/50' : 'border-white/10'
						)}
						aria-invalid={showValidationError}
						aria-describedby={
							showValidationError ? 'stake-amount-error' : undefined
						}
					/>
					<button
						type="button"
						className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:border-amber-500/30 hover:bg-amber-500/10"
						onClick={() => {
							setAmountText(String(availableBalance));
							setTouched(true);
						}}
						disabled={isSubmitting || availableBalance === 0}
					>
						Max
					</button>
				</div>
				{showValidationError && (
					<div id="stake-amount-error" data-testid="stake-amount-error">
						<InlineValidationMessage message={validationError ?? ''} />
					</div>
				)}
				<p className="mt-1.5 text-xs text-white/35">
					Available balance:{' '}
					<span className="text-white/60 font-medium">
						{availableBalance} key{availableBalance === 1 ? '' : 's'}
					</span>
				</p>
			</div>

			{/* Lock period selector */}
			<div>
				<p className="mb-2 text-sm font-medium text-white/70">Lock period</p>
				<div
					role="radiogroup"
					aria-label="Lock period"
					className="grid grid-cols-2 gap-2 sm:grid-cols-4"
					data-testid="lock-period-selector"
				>
					{LOCK_OPTIONS.map(option => {
						const isSelected = selectedPeriod === option.days;
						return (
							<button
								key={option.days}
								type="button"
								role="radio"
								aria-checked={isSelected}
								data-testid={`lock-period-${option.days}`}
								onClick={() => setSelectedPeriod(option.days)}
								disabled={isSubmitting}
								className={cn(
									'flex flex-col items-center gap-0.5 rounded-xl border px-3 py-3 text-center transition-colors',
									isSelected
										? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
										: 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.05]'
								)}
							>
								<span className="text-sm font-semibold">{option.label}</span>
								<span className="text-[0.65rem] font-bold uppercase tracking-wide opacity-70">
									~{formatPercent(option.apyMultiplier * 12, {
										maximumFractionDigits: 0,
									})}{' '}
									APY
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Estimated reward preview */}
			{estimatedReward !== null && (
				<div
					data-testid="reward-preview"
					className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-4"
				>
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
								Estimated reward
							</p>
							<p
								className="mt-1 font-jakarta text-base font-bold text-amber-300"
								data-testid="reward-preview-value"
							>
								{formatXlmPrice(estimatedReward)}
							</p>
						</div>
						<div className="text-right">
							<p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
								Est. APY
							</p>
							<p className="mt-1 font-jakarta text-base font-bold text-white">
								{formatPercent(illustrativeApy, { maximumFractionDigits: 0 })}
							</p>
						</div>
					</div>
					<p className="mt-2 text-[0.7rem] text-white/35">
						Preview only — actual rewards depend on pool inflow and other
						stakers.
					</p>
				</div>
			)}

			{/* Submit */}
			<Button
				type="submit"
				data-testid="stake-submit-button"
				disabled={!canSubmit}
				className="w-full rounded-xl font-bold"
			>
				{isSubmitting ? (
					<>
						<Loader2 className="animate-spin" aria-hidden="true" />
						Staking…
					</>
				) : (
					<>
						<Lock className="size-4" aria-hidden="true" />
						Stake Keys
					</>
				)}
			</Button>

			{!isConnected && (
				<p className="text-center text-xs text-white/40">
					Connect your wallet to stake.
				</p>
			)}
		</form>
	);
}
