import React, { useState } from 'react';
import { ArrowDownToLine, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateWithdrawalFee } from '@/utils/stream.utils';

export interface StreamWithdrawFormProps {
	streamId: string;
	claimableBalance: number;
	onWithdraw: (amount: number) => Promise<void> | void;
	isPending?: boolean;
}

export const StreamWithdrawForm: React.FC<StreamWithdrawFormProps> = ({
	streamId: _streamId,
	claimableBalance,
	onWithdraw,
	isPending = false,
}) => {
	const [amount, setAmount] = useState<string>('');

	const parsedAmount = Number(amount) || 0;
	const isExceeding = parsedAmount > claimableBalance;
	const isZeroOrNegative = parsedAmount <= 0;
	const isDisabled = isExceeding || isZeroOrNegative || isPending;

	const { feeXlm, netAmountXlm } = calculateWithdrawalFee(parsedAmount);

	const handleMax = () => {
		// Round down to 4 decimals to avoid micro precision overflows
		const safeMax = Math.floor(claimableBalance * 10000) / 10000;
		setAmount(safeMax.toString());
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isDisabled) return;
		await onWithdraw(parsedAmount);
		setAmount('');
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3.5"
			data-testid="stream-withdraw-form"
		>
			<div className="flex items-center justify-between">
				<Label htmlFor="withdraw-amount" className="text-xs font-semibold text-white/80">
					Withdraw Accrued Earnings
				</Label>
				<button
					type="button"
					onClick={handleMax}
					className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
					data-testid="withdraw-max-button"
				>
					Max ({claimableBalance.toFixed(4)} XLM)
				</button>
			</div>

			<div className="relative">
				<Input
					id="withdraw-amount"
					type="number"
					step="any"
					min={0}
					value={amount}
					onChange={e => setAmount(e.target.value)}
					placeholder="0.00"
					className="bg-white/[0.06] border-white/15 text-white font-mono text-sm pr-16"
					data-testid="stream-withdraw-input"
				/>
				<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 font-mono">
					XLM
				</span>
			</div>

			{/* Inline Validation: Withdrawing above claimable is blocked inline (#acceptance criteria) */}
			{isExceeding && (
				<p
					className="flex items-center gap-1.5 text-xs text-red-400"
					role="alert"
					data-testid="withdraw-exceed-error"
				>
					<AlertCircle className="size-3.5 shrink-0" />
					Amount exceeds claimable balance of {claimableBalance.toFixed(4)} XLM.
				</p>
			)}

			{/* Fee Preview */}
			{parsedAmount > 0 && !isExceeding && (
				<div
					className="rounded-lg bg-white/[0.04] p-2.5 text-xs space-y-1 border border-white/5"
					data-testid="withdraw-fee-preview"
				>
					<div className="flex justify-between text-white/60">
						<span>Protocol Fee (0.5% min 0.01):</span>
						<span className="font-mono text-white/80 tabular-nums">
							{feeXlm.toFixed(4)} XLM
						</span>
					</div>
					<div className="flex justify-between text-white/90 font-medium pt-1 border-t border-white/10">
						<span>Net Payout to Wallet:</span>
						<span
							className="font-mono text-emerald-400 font-semibold tabular-nums"
							data-testid="withdraw-net-payout"
						>
							{netAmountXlm.toFixed(4)} XLM
						</span>
					</div>
				</div>
			)}

			<Button
				type="submit"
				disabled={isDisabled}
				className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs h-9 gap-1.5"
				data-testid="stream-withdraw-submit"
			>
				<ArrowDownToLine className="size-3.5" />
				{isPending ? 'Withdrawing…' : 'Withdraw Earnings'}
			</Button>
		</form>
	);
};

export default StreamWithdrawForm;
