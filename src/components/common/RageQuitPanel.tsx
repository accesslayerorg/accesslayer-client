import { useState } from 'react';
import { AlertTriangle, LoaderCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRageQuit } from '@/hooks/useRageQuit';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { formatCompactNumber } from '@/utils/numberFormat.utils';

export interface RageQuitPanelProps {
	proposalId: string;
}

const ELIGIBILITY_MESSAGE: Record<string, string> = {
	voted_for:
		'You voted for this proposal and are not eligible to rage-quit.',
	window_closed: 'The rage-quit window has closed for this proposal.',
	cap_reached:
		'The maximum exit cap has been reached. No further rage-quits are allowed.',
};

/**
 * Rage-quit panel surfaced on passed proposals during the exit window (#1253).
 *
 * Eligible holders (voted against or abstained, held keys at snapshot) can
 * burn their keys and receive a pro-rata share of the reserve.
 * Hidden entirely when the wallet is disconnected or the window is closed.
 */
export default function RageQuitPanel({ proposalId }: RageQuitPanelProps) {
	const { address } = useStellarWallet();
	const {
		rageQuitStatus,
		isLoading,
		isWindowOpen,
		eligibility,
		payoutPerKey,
		windowEndsAt,
		exitedFraction,
		maxExitFraction,
		isSubmitting,
		submitRageQuit,
	} = useRageQuit(proposalId, address);

	const [amount, setAmount] = useState('');

	// Don't render if wallet is not connected
	if (!address) return null;

	if (isLoading) {
		return (
			<section
				aria-label="Rage-quit loading"
				className="mt-6 h-24 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
			/>
		);
	}

	// Ineligible states: show a brief notice only
	if (
		eligibility === 'voted_for' ||
		eligibility === 'window_closed' ||
		eligibility === 'cap_reached' ||
		!isWindowOpen
	) {
		const message = ELIGIBILITY_MESSAGE[eligibility];
		if (!message) return null;
		return (
			<section
				className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
				aria-label="Rage-quit ineligible"
				data-testid="ragequit-ineligible"
			>
				<div className="flex items-start gap-3">
					<AlertTriangle
						className="mt-0.5 size-4 shrink-0 text-white/40"
						aria-hidden="true"
					/>
					<p className="text-sm text-white/50">{message}</p>
				</div>
			</section>
		);
	}

	const parsedAmount = parseInt(amount, 10);
	const validAmount =
		Number.isInteger(parsedAmount) && parsedAmount > 0;

	const capPercent = Math.round(maxExitFraction * 100);
	const exitedPercent = Math.round(exitedFraction * 100);
	const deadline = windowEndsAt
		? new Date(windowEndsAt).toLocaleString()
		: null;

	return (
		<section
			aria-labelledby="ragequit-heading"
			className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-5 sm:p-7"
			data-testid="ragequit-panel"
		>
			<div className="flex items-center gap-2 text-red-400">
				<LogOut className="size-4" aria-hidden="true" />
				<h2
					id="ragequit-heading"
					className="text-sm font-bold uppercase tracking-[0.15em]"
				>
					Rage-Quit Window Open
				</h2>
			</div>

			<p className="mt-2 text-sm text-white/55">
				You voted against or abstained on this proposal. Burn your keys now
				to receive a pro-rata share of the reserve before execution.
			</p>

			<dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
				{payoutPerKey !== null && (
					<div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2">
						<dt className="text-white/40">Payout / key</dt>
						<dd className="mt-0.5 font-semibold text-white">
							{formatCompactNumber(payoutPerKey)} XLM
						</dd>
					</div>
				)}
				<div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2">
					<dt className="text-white/40">Exited</dt>
					<dd className="mt-0.5 font-semibold text-white">
						{exitedPercent}% of {capPercent}% cap
					</dd>
				</div>
				{deadline && (
					<div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2">
						<dt className="text-white/40">Window closes</dt>
						<dd className="mt-0.5 font-semibold text-white">{deadline}</dd>
					</div>
				)}
			</dl>

			{rageQuitStatus && (
				<div className="mt-4 space-y-2" data-testid="ragequit-form">
					<label
						htmlFor="ragequit-amount"
						className="block text-xs text-white/50"
					>
						Number of keys to burn
					</label>
					<Input
						id="ragequit-amount"
						type="number"
						min={1}
						step={1}
						value={amount}
						onChange={e => setAmount(e.target.value)}
						placeholder="e.g. 10"
						className="bg-white/[0.04] text-white placeholder:text-white/30"
						data-testid="ragequit-amount-input"
					/>
					<Button
						variant="destructive"
						size="sm"
						disabled={!validAmount || isSubmitting}
						onClick={() => {
							if (validAmount) submitRageQuit(parsedAmount);
						}}
						data-testid="ragequit-submit-btn"
					>
						{isSubmitting && (
							<LoaderCircle
								className="mr-2 size-4 animate-spin"
								aria-hidden="true"
							/>
						)}
						Burn &amp; exit
					</Button>
				</div>
			)}
		</section>
	);
}
