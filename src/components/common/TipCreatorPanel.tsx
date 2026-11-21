import React, { useState, useId } from 'react';
import { Heart, Sparkles, AlertCircle, Coins, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	calculateTipBreakdown,
	isTipMessageValid,
	isTipAmountValid,
	TIP_MESSAGE_MAX_LENGTH,
	PRESET_TIP_AMOUNTS,
} from '@/utils/tip.utils';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { useSendTipMutation } from '@/hooks/useTips';
import { cn } from '@/lib/utils';

export interface TipCreatorPanelProps {
	creatorId: string;
	creatorName: string;
	isHolder: boolean;
	userAddress?: string;
	className?: string;
}

export const TipCreatorPanel: React.FC<TipCreatorPanelProps> = ({
	creatorId,
	creatorName,
	isHolder,
	userAddress,
	className,
}) => {
	const amountInputId = useId();
	const messageInputId = useId();

	const [amountInput, setAmountInput] = useState<string>('');
	const [message, setMessage] = useState<string>('');

	const parsedAmount = parseFloat(amountInput);
	const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
	const { amount, fee, netAmount, feePercent } = calculateTipBreakdown(validAmount);

	const charCount = message.length;
	const isOverCharLimit = !isTipMessageValid(message);
	const isAmountValid = isTipAmountValid(validAmount);

	const canSubmit = isHolder && isAmountValid && !isOverCharLimit;

	const sendTipMutation = useSendTipMutation(creatorId, {
		creatorName,
		tipper: userAddress,
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canSubmit || sendTipMutation.isPending) return;

		try {
			await sendTipMutation.mutateAsync({
				amount: validAmount,
				message: message.trim() || undefined,
			});
			// Reset form fields on success
			setAmountInput('');
			setMessage('');
		} catch {
			// error handled in mutation onError toast
		}
	};

	const handlePresetClick = (preset: number) => {
		setAmountInput(preset.toString());
	};

	return (
		<div
			data-testid="tip-creator-panel"
			className={cn(
				'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
		>
			{/* Panel Header */}
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 text-amber-400 shadow-lg shadow-amber-500/5">
						<Heart className="size-5 fill-amber-400 text-amber-400" />
					</div>
					<div>
						<h2 className="font-grotesque text-xl font-black tracking-tight text-white flex items-center gap-2">
							Tip Creator
							<Sparkles className="size-4 text-amber-400" />
						</h2>
						<p className="text-xs text-white/60">
							Send direct appreciation in XLM to <span className="font-semibold text-white/90">{creatorName}</span>
						</p>
					</div>
				</div>

				{isHolder ? (
					<div
						data-testid="tip-holder-badge"
						className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300"
					>
						<ShieldCheck className="size-3.5" />
						Key Holder Verified
					</div>
				) : (
					<div
						data-testid="tip-non-holder-badge"
						className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300"
					>
						<AlertCircle className="size-3.5" />
						Holders Only
					</div>
				)}
			</div>

			{/* Non-holder Notice */}
			{!isHolder && (
				<div
					data-testid="tip-holder-restriction"
					className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90"
				>
					<AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-400" />
					<div>
						<p className="font-semibold text-amber-300">Holder Exclusive</p>
						<p className="text-xs text-amber-200/80 mt-0.5">
							Tipping is exclusive to key holders. Hold at least 1 key to send direct tips to this creator.
						</p>
					</div>
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Tip Amount Input */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<label
							htmlFor={amountInputId}
							className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5"
						>
							<Coins className="size-3.5 text-amber-400" />
							Tip Amount (XLM)
						</label>
						<span className="text-xs text-white/40">Minimum 0.1 XLM</span>
					</div>

					<div className="relative">
						<input
							id={amountInputId}
							type="number"
							step="any"
							min="0.1"
							placeholder="0.0"
							disabled={!isHolder || sendTipMutation.isPending}
							value={amountInput}
							onChange={e => setAmountInput(e.target.value)}
							data-testid="tip-amount-input"
							className={cn(
								'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-lg font-bold text-white placeholder-white/20 transition-all focus:border-amber-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-amber-400/40',
								!isHolder && 'cursor-not-allowed opacity-50'
							)}
						/>
						<span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/50">
							XLM
						</span>
					</div>

					{/* Preset Buttons */}
					<div className="flex flex-wrap items-center gap-2 pt-1">
						{PRESET_TIP_AMOUNTS.map(preset => (
							<button
								key={preset}
								type="button"
								disabled={!isHolder || sendTipMutation.isPending}
								onClick={() => handlePresetClick(preset)}
								className={cn(
									'rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/80 transition-all hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-300 active:scale-95',
									validAmount === preset && 'border-amber-400 bg-amber-400/20 text-amber-300 font-bold',
									!isHolder && 'cursor-not-allowed opacity-40'
								)}
								data-testid={`tip-preset-${preset}`}
							>
								+{preset} XLM
							</button>
						))}
					</div>
				</div>

				{/* Optional Message Textarea */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<label
							htmlFor={messageInputId}
							className="text-xs font-semibold uppercase tracking-wider text-white/70"
						>
							Optional Message
						</label>
						<span
							data-testid="tip-char-counter"
							className={cn(
								'text-xs tabular-nums transition-colors',
								isOverCharLimit ? 'font-bold text-rose-400' : 'text-white/50'
							)}
						>
							{charCount}/{TIP_MESSAGE_MAX_LENGTH}
						</span>
					</div>

					<textarea
						id={messageInputId}
						rows={3}
						placeholder="Add an encouraging note to the creator (optional)..."
						disabled={!isHolder || sendTipMutation.isPending}
						value={message}
						onChange={e => setMessage(e.target.value)}
						data-testid="tip-message-input"
						className={cn(
							'w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white placeholder-white/20 transition-all focus:border-amber-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-amber-400/40',
							isOverCharLimit && 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/40',
							!isHolder && 'cursor-not-allowed opacity-50'
						)}
					/>
					{isOverCharLimit && (
						<p className="text-xs text-rose-400" data-testid="tip-char-limit-error">
							Message exceeds {TIP_MESSAGE_MAX_LENGTH} character limit by {charCount - TIP_MESSAGE_MAX_LENGTH} character{charCount - TIP_MESSAGE_MAX_LENGTH !== 1 ? 's' : ''}.
						</p>
					)}
				</div>

				{/* Tip Summary Box */}
				<div
					data-testid="tip-summary"
					className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5"
				>
					<div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-1">
						Tip Summary
					</div>

					<div className="flex items-center justify-between text-sm">
						<span className="text-white/70">Tip Amount:</span>
						<span className="font-semibold text-white tabular-nums" data-testid="tip-amount-display">
							{formatXlmPrice(amount)}
						</span>
					</div>

					<div className="flex items-center justify-between text-sm text-white/60">
						<span>Protocol Fee ({feePercent}%):</span>
						<span className="tabular-nums text-white/60" data-testid="tip-fee-display">
							-{formatXlmPrice(fee)}
						</span>
					</div>

					<div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm font-bold">
						<span className="text-white/90">Net to Creator:</span>
						<span className="text-emerald-400 tabular-nums text-base" data-testid="tip-net-display">
							{formatXlmPrice(netAmount)}
						</span>
					</div>
				</div>

				{/* Submit Button */}
				<Button
					type="submit"
					disabled={!canSubmit || sendTipMutation.isPending}
					data-testid="send-tip-button"
					className={cn(
						'h-12 w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 font-bold text-slate-950 transition-all hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 active:scale-[0.99]',
						(!canSubmit || sendTipMutation.isPending) && 'cursor-not-allowed opacity-50 shadow-none'
					)}
				>
					{sendTipMutation.isPending ? (
						<span className="flex items-center gap-2">
							<span className="size-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
							Sending Tip…
						</span>
					) : !isHolder ? (
						'Holders Only'
					) : (
						<span className="flex items-center gap-2">
							<Heart className="size-4 fill-slate-950 text-slate-950" />
							Send Tip {validAmount > 0 ? `(${formatXlmPrice(validAmount)})` : ''}
						</span>
					)}
				</Button>
			</form>
		</div>
	);
};

export default TipCreatorPanel;
