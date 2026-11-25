import React, { useState, useEffect } from 'react';
import {
	type TriggeredLargeTradeRule,
	calculatePriceComparison,
	calculateSplitTradePreview,
} from '@/utils/largeTradeGuard.utils';
import { telemetryClient } from '@/telemetry/TelemetryClient';
import { AlertTriangle, ShieldAlert, Split } from 'lucide-react';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface LargeTradeGuardProps {
	triggeredRules: TriggeredLargeTradeRule[];
	amount: number;
	unitPriceStroops?: number | null;
	totalStroops?: number | null;
	side: 'buy' | 'sell';
	creatorName: string;
	onAcknowledgementChange: (isAcknowledged: boolean) => void;
}

export const LargeTradeGuard: React.FC<LargeTradeGuardProps> = ({
	triggeredRules,
	amount,
	unitPriceStroops,
	totalStroops,
	side,
	creatorName,
	onAcknowledgementChange,
}) => {
	const [typedQuantity, setTypedQuantity] = useState('');
	const [checkboxChecked, setCheckboxChecked] = useState(false);
	const [verificationMethod, setVerificationMethod] = useState<'checkbox' | 'type'>('checkbox');

	const isTypedMatch = parseInt(typedQuantity, 10) === amount;
	const isAcknowledged = verificationMethod === 'checkbox' ? checkboxChecked : isTypedMatch;

	useEffect(() => {
		onAcknowledgementChange(isAcknowledged);
	}, [isAcknowledged, onAcknowledgementChange]);

	useEffect(() => {
		if (triggeredRules.length > 0) {
			try {
				telemetryClient.track({
					type: 'UserAction',
					action: 'large_trade_guard_triggered',
					target: 'LargeTradeGuard',
					metadata: {
						side,
						amount,
						rulesTriggered: triggeredRules.map((r) => r.rule.id),
						triggeredValues: triggeredRules.map((r) => ({
							rule: r.rule.id,
							actual: r.actualValue,
							threshold: r.thresholdValue,
						})),
						hasTotalStroops: totalStroops != null,
					},
				});
			} catch {
				// Non-blocking telemetry
			}
		}
	}, [triggeredRules, side, amount, totalStroops]);

	const { averagePriceXlm, spotPriceXlm, priceDifferenceXlm, premiumPercent } =
		calculatePriceComparison({
			amount,
			totalStroops,
			unitPriceStroops,
		});

	const splitPreview = totalStroops
		? calculateSplitTradePreview(amount, totalStroops, 3)
		: null;

	return (
		<div
			className="space-y-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-4 text-white"
			data-testid="large-trade-guard"
		>
			<div className="flex items-start gap-2.5">
				<ShieldAlert className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
				<div>
					<h4 className="text-sm font-bold text-rose-200">
						Whale Order & Price Impact Guard
					</h4>
					<p className="text-xs text-rose-200/70">
						This trade triggers one or more safety limits. Please review the market impact details below before proceeding.
					</p>
				</div>
			</div>

			<div
				className="space-y-2 rounded-lg border border-rose-500/20 bg-black/20 p-3"
				data-testid="triggered-rules-list"
			>
				<span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
					Triggered Warning Rules
				</span>
				<div className="space-y-1.5 mt-1">
					{triggeredRules.map((tr) => (
						<div
							key={tr.rule.id}
							className="flex items-center justify-between text-xs"
							data-testid={`rule-item-${tr.rule.id}`}
						>
							<span className="text-white/80 flex items-center gap-1.5">
								<AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
								{tr.rule.label}
							</span>
							<span className="font-mono text-rose-300 font-bold">
								{tr.formattedActual}{' '}
								<span className="text-white/40 font-normal">
									(limit: {tr.formattedThreshold})
								</span>
							</span>
						</div>
					))}
				</div>
			</div>

			<div
				className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs space-y-2"
				data-testid="price-comparison-panel"
			>
				<div className="flex justify-between items-center text-white/60">
					<span>Spot Price</span>
					<span className="font-mono text-white" data-testid="spot-price-val">
						{spotPriceXlm > 0 ? `${spotPriceXlm.toFixed(4)} XLM` : '—'}
					</span>
				</div>
				<div className="flex justify-between items-center text-white/60">
					<span>Resulting Average Price</span>
					<span className="font-mono font-bold text-amber-300" data-testid="avg-price-val">
						{averagePriceXlm > 0 ? `${averagePriceXlm.toFixed(4)} XLM` : '—'}
					</span>
				</div>
				<div className="flex justify-between items-center border-t border-white/5 pt-1.5 text-white/70">
					<span>Slippage / Impact Premium</span>
					<span className="font-mono text-rose-300 font-semibold" data-testid="premium-val">
						+{priceDifferenceXlm.toFixed(4)} XLM (+{premiumPercent.toFixed(1)}%)
					</span>
				</div>
			</div>

			{splitPreview && amount >= 3 && (
				<div
					className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.05] p-3 text-xs space-y-2"
					data-testid="split-suggestion-panel"
				>
					<div className="flex items-center gap-1.5 font-bold text-emerald-300">
						<Split className="h-4 w-4" />
						<span>Recommended Cost Optimization: Split Trade</span>
					</div>
					<p className="text-[11px] text-emerald-200/80">
						Splitting into {splitPreview.numSplits} smaller orders (~{splitPreview.splitQuantity} keys each) avoids crossing steep bonding curve brackets simultaneously.
					</p>
					<div className="flex justify-between items-center pt-1 border-t border-emerald-500/10 font-mono text-[11px]">
						<span className="text-white/60">Estimated Savings:</span>
						<span className="text-emerald-300 font-bold" data-testid="split-savings-val">
							~{splitPreview.estimatedSavingsXlm} XLM ({splitPreview.savingsPercent}% lower cost)
						</span>
					</div>
				</div>
			)}

			<div className="space-y-2 border-t border-white/10 pt-3 text-xs">
				<div className="flex items-center justify-between text-[11px] text-white/50">
					<span>Verification Step</span>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setVerificationMethod('checkbox')}
							className={`hover:underline ${
								verificationMethod === 'checkbox'
									? 'text-amber-300 font-bold'
									: 'text-white/40'
							}`}
						>
							Checkbox
						</button>
						<span>•</span>
						<button
							type="button"
							onClick={() => setVerificationMethod('type')}
							className={`hover:underline ${
								verificationMethod === 'type'
									? 'text-amber-300 font-bold'
									: 'text-white/40'
							}`}
						>
							Type Quantity
						</button>
					</div>
				</div>

				{verificationMethod === 'checkbox' ? (
					<label
						className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-2.5 cursor-pointer hover:bg-white/[0.04]"
						data-testid="large-trade-checkbox-label"
					>
						<input
							type="checkbox"
							checked={checkboxChecked}
							onChange={(e) => setCheckboxChecked(e.target.checked)}
							className="mt-0.5 rounded border-white/30 text-rose-500 focus:ring-rose-500"
							data-testid="large-trade-acknowledge-checkbox"
						/>
						<span className="text-white/80 text-[11px]">
							I acknowledge that this order of{' '}
							<strong>
								{formatNumber(amount)} {creatorName} keys
							</strong>{' '}
							has high price impact ({triggeredRules[0]?.formattedActual}) and I accept the resulting average execution price.
						</span>
					</label>
				) : (
					<div className="space-y-1.5" data-testid="large-trade-type-container">
						<p className="text-[11px] text-white/70">
							Type <strong>{amount}</strong> to confirm execution:
						</p>
						<input
							type="text"
							value={typedQuantity}
							onChange={(e) => setTypedQuantity(e.target.value)}
							placeholder={`Type ${amount}`}
							className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:border-rose-400 focus:outline-none"
							data-testid="large-trade-quantity-input"
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default LargeTradeGuard;
