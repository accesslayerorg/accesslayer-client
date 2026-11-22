import React, { useState } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface DeprecateKeyPanelProps {
	/** Creator ID or key ID. */
	creatorId: string;
	/** Current circulating supply of keys. */
	circulatingSupply: number;
	/** Optional creator wallet balance in XLM to check for sufficient funds. */
	creatorBalanceXlm?: number | null;
	/** Whether the key has already been deprecated. */
	isDeprecated?: boolean;
	/** Called when submitting deprecation with buybackPrice and totalEscrow. */
	onSubmit: (params: {
		buybackPrice: number;
		totalEscrow: number;
	}) => void | Promise<void>;
	isSubmitting?: boolean;
}

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

/**
 * Key deprecation management panel for the creator dashboard settings tab.
 *
 * Lets creators initiate key deprecation by specifying a per-key buyback price,
 * previews the required total XLM escrow, verifies sufficient creator balance,
 * and requires typing "DEPRECATE" in a confirmation field to enable submission.
 */
const DeprecateKeyPanel: React.FC<DeprecateKeyPanelProps> = ({
	circulatingSupply,
	creatorBalanceXlm,
	isDeprecated = false,
	onSubmit,
	isSubmitting = false,
}) => {
	const [buybackPriceInput, setBuybackPriceInput] = useState('1');
	const [confirmTextInput, setConfirmTextInput] = useState('');

	const parsedBuybackPrice = Number(buybackPriceInput) || 0;
	const totalEscrowRequired = parsedBuybackPrice * circulatingSupply;

	const isConfirmationTyped = confirmTextInput.trim() === 'DEPRECATE';

	// Balance validation: show error if creator balance is known and less than totalEscrowRequired
	const isBalanceInsufficient =
		creatorBalanceXlm != null &&
		Number.isFinite(creatorBalanceXlm) &&
		creatorBalanceXlm < totalEscrowRequired;

	const isSubmitDisabled =
		isSubmitting ||
		!isConfirmationTyped ||
		isBalanceInsufficient ||
		parsedBuybackPrice <= 0;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitDisabled) return;
		onSubmit({
			buybackPrice: parsedBuybackPrice,
			totalEscrow: totalEscrowRequired,
		});
	};

	if (isDeprecated) {
		return (
			<div
				className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-white"
				data-testid="key-deprecated-banner"
			>
				<div className="flex items-center gap-3">
					<AlertTriangle className="size-6 shrink-0 text-amber-400" />
					<div>
						<h3 className="font-grotesque text-lg font-bold text-amber-300">
							Key deprecated
						</h3>
						<p className="mt-1 text-sm text-white/70">
							This key has been deprecated. All new buys are disabled and
							holders can redeem their keys for escrowed buyback value.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-6"
			noValidate
			data-testid="deprecate-key-panel"
		>
			{/* Prominent warning box */}
			<div
				className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200"
				data-testid="deprecate-warning-box"
			>
				<AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-400" />
				<div className="text-sm font-semibold">
					Deprecating a key is irreversible. All new buys will be disabled.
				</div>
			</div>

			{/* Buyback Price Input & Circulating Supply Info */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<label
						htmlFor="buyback-price"
						className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
					>
						Buyback price (XLM per key)
					</label>
					<input
						id="buyback-price"
						data-testid="buyback-price-input"
						type="number"
						inputMode="decimal"
						min={0}
						step="any"
						className={fieldClass}
						value={buybackPriceInput}
						onChange={e => setBuybackPriceInput(e.target.value)}
						disabled={isSubmitting}
						placeholder="e.g. 1.5"
					/>
				</div>

				<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
					<p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
						Circulating Key Supply
					</p>
					<p
						className="mt-1 font-jakarta text-sm font-bold text-white"
						data-testid="circulating-supply-display"
					>
						{formatNumber(circulatingSupply)} keys
					</p>
				</div>
			</div>

			{/* Total Escrow Calculation Display */}
			<div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
						Total XLM Escrow Required
					</span>
					<span
						className="font-mono text-base font-bold text-amber-300"
						data-testid="total-escrow-amount"
					>
						{totalEscrowRequired.toLocaleString(undefined, {
							minimumFractionDigits: 2,
							maximumFractionDigits: 4,
						})}{' '}
						XLM
					</span>
				</div>
				<p className="mt-1 text-xs text-white/40">
					Calculation: {parsedBuybackPrice} XLM × {circulatingSupply}{' '}
					circulating keys
				</p>
			</div>

			{/* Insufficient Creator Balance Error */}
			{isBalanceInsufficient && (
				<div
					className="flex items-center gap-2 text-xs font-semibold text-rose-400"
					role="alert"
					data-testid="insufficient-balance-error"
				>
					<AlertCircle className="size-4 shrink-0" />
					<span>
						Insufficient creator balance for escrow. Required:{' '}
						{totalEscrowRequired.toFixed(2)} XLM, Available:{' '}
						{creatorBalanceXlm.toFixed(2)} XLM
					</span>
				</div>
			)}

			{/* Confirmation Input: DEPRECATE */}
			<div className="space-y-1.5">
				<label
					htmlFor="deprecate-confirm"
					className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
				>
					Confirmation: Type &quot;DEPRECATE&quot; to submit
				</label>
				<input
					id="deprecate-confirm"
					data-testid="deprecate-confirm-input"
					type="text"
					className={fieldClass}
					value={confirmTextInput}
					onChange={e => setConfirmTextInput(e.target.value)}
					disabled={isSubmitting}
					placeholder="Type DEPRECATE"
					aria-label="Type DEPRECATE to confirm key deprecation"
				/>
			</div>

			<Button
				type="submit"
				variant="destructive"
				data-testid="deprecate-key-submit"
				disabled={isSubmitDisabled}
				className="w-full sm:w-auto"
			>
				{isSubmitting ? 'Deprecating key…' : 'Deprecate key & escrow XLM'}
			</Button>
		</form>
	);
};

export default DeprecateKeyPanel;
