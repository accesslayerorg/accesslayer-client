import { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, Clock, Coins, ShieldAlert } from 'lucide-react';
import { usePaymentAssets } from '@/hooks/usePaymentAssets';
import { convertQuoteToPaymentAsset } from '@/utils/paymentAsset.utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { PaymentAsset } from '@/types/paymentAsset.types';

interface PaymentAssetSelectProps {
	/** Quote amount in base stroops (7 decimals) */
	quoteStroops: number | bigint;
	/** Slippage tolerance percentage (e.g. 1.0 for 1%) */
	slippageTolerancePercent?: number;
	/** Callback when selected asset or max pay changes */
	onAssetChange?: (params: {
		asset: PaymentAsset;
		maxPay: number;
		convertedQuote: number;
		hasSufficientBalance: boolean;
	}) => void;
	className?: string;
}

export function PaymentAssetSelect({
	quoteStroops,
	slippageTolerancePercent = 1.0,
	onAssetChange,
	className,
}: PaymentAssetSelectProps) {
	const { assets, selectedAsset, selectAsset } = usePaymentAssets('XLM');
	const [customMaxPay, setCustomMaxPay] = useState<string>('');

	// Compute converted quote for the currently selected asset
	const quoteInfo = useMemo(() => {
		return convertQuoteToPaymentAsset(
			quoteStroops,
			selectedAsset,
			slippageTolerancePercent
		);
	}, [quoteStroops, selectedAsset, slippageTolerancePercent]);

	// Initialize / reset max pay input when quote or asset changes
	useEffect(() => {
		setCustomMaxPay(quoteInfo.formattedMaxPay);
	}, [quoteInfo.formattedMaxPay, selectedAsset.code]);

	// Notify parent whenever quote, asset, or max pay updates
	useEffect(() => {
		const parsedMaxPay = parseFloat(customMaxPay) || quoteInfo.maxPayAmount;
		onAssetChange?.({
			asset: selectedAsset,
			maxPay: parsedMaxPay,
			convertedQuote: quoteInfo.numericAmount,
			hasSufficientBalance: quoteInfo.hasSufficientBalance,
		});
	}, [selectedAsset, customMaxPay, quoteInfo, onAssetChange]);

	// Precompute conversions for all assets to check sufficiency in dropdown options
	const assetConversions = useMemo(() => {
		const map = new Map<string, ReturnType<typeof convertQuoteToPaymentAsset>>();
		for (const asset of assets) {
			map.set(
				asset.code,
				convertQuoteToPaymentAsset(quoteStroops, asset, slippageTolerancePercent)
			);
		}
		return map;
	}, [assets, quoteStroops, slippageTolerancePercent]);

	const rateAgeSeconds = Math.max(1, Math.round(quoteInfo.rateAgeMs / 1000));

	return (
		<div
			data-testid="payment-asset-select-container"
			className={`space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-white ${className || ''}`}
		>
			<div className="flex items-center justify-between gap-2">
				<Label
					htmlFor="payment-asset-select"
					className="flex items-center gap-1.5 text-xs font-semibold text-white/80"
				>
					<Coins className="size-3.5 text-amber-400" />
					Payment Asset
				</Label>
				<span className="font-mono text-[11px] text-white/60">
					Balance: {selectedAsset.balance} {selectedAsset.code}
				</span>
			</div>

			{/* Asset Dropdown */}
			<select
				id="payment-asset-select"
				data-testid="payment-asset-select"
				value={selectedAsset.code}
				onChange={e => selectAsset(e.target.value)}
				className="w-full rounded-lg border border-white/10 bg-[#06111f] px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
			>
				{assets.map(asset => {
					const conv = assetConversions.get(asset.code);
					const isInsufficient = Boolean(conv && !conv.hasSufficientBalance);
					return (
						<option
							key={asset.code}
							value={asset.code}
							disabled={isInsufficient}
							data-testid={`payment-option-${asset.code}`}
							className="bg-[#06111f] text-white"
						>
							{asset.name} ({asset.code}) — Balance: {asset.balance}
							{isInsufficient && conv
								? ` [Insufficient - Shortfall: ${conv.formattedShortfall} ${asset.code}]`
								: ''}
						</option>
					);
				})}
			</select>

			{/* Converted Cost & Rate Display */}
			<div className="space-y-1.5 rounded-lg bg-white/[0.03] p-2.5 text-xs">
				<div className="flex items-center justify-between font-mono">
					<span className="text-white/60">Converted Cost:</span>
					<span
						data-testid="converted-quote-display"
						className="font-bold text-amber-300"
					>
						{quoteInfo.formattedAmount} {selectedAsset.code}
					</span>
				</div>

				<div className="flex items-center justify-between text-[11px] text-white/50">
					<span>Exchange Rate:</span>
					<span data-testid="rate-used-display" className="font-mono text-white/80">
						1 XLM = {selectedAsset.rateAgainstXlm} {selectedAsset.code}
					</span>
				</div>

				<div className="flex items-center justify-between text-[10px] text-white/40">
					<span>Rate Source: {quoteInfo.rateSource}</span>
					<span className="flex items-center gap-1">
						<Clock className="size-2.5" />
						Updated {rateAgeSeconds}s ago
					</span>
				</div>
			</div>

			{/* Insufficient Balance Shortfall Banner */}
			{!quoteInfo.hasSufficientBalance && (
				<div
					data-testid="shortfall-warning"
					className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300"
				>
					<ShieldAlert className="size-4 shrink-0 text-red-400" />
					<span>
						Insufficient {selectedAsset.code} balance. Shortfall:{' '}
						<strong>
							{quoteInfo.formattedShortfall} {selectedAsset.code}
						</strong>
					</span>
				</div>
			)}

			{/* Fallback Oracle Warning Banner */}
			{quoteInfo.isFallback && (
				<div
					data-testid="oracle-fallback-warning"
					className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300"
				>
					<AlertTriangle className="size-4 shrink-0 text-amber-400" />
					<span>
						Warning: Price oracle is currently using secondary fallback feed.
						Rates may be delayed.
					</span>
				</div>
			)}

			{/* Max Pay Control */}
			<div className="space-y-1.5 pt-1">
				<div className="flex items-center justify-between text-xs">
					<Label htmlFor="max-pay-input" className="text-white/70">
						Max Pay (inc. {slippageTolerancePercent}% slippage):
					</Label>
					<span className="font-mono text-[10px] text-white/50">
						Default: {quoteInfo.formattedMaxPay} {selectedAsset.code}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<Input
						id="max-pay-input"
						data-testid="max-pay-input"
						type="text"
						value={customMaxPay}
						onChange={e => setCustomMaxPay(e.target.value)}
						className="h-8 border-white/10 bg-[#06111f] font-mono text-xs text-white"
					/>
					<span className="font-mono text-xs text-white/70">
						{selectedAsset.code}
					</span>
				</div>
			</div>
		</div>
	);
}

export default PaymentAssetSelect;
