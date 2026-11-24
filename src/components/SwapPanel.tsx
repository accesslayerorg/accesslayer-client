import React, { useCallback, useState } from 'react';
import { AlertCircle, AlertTriangle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuickAmountButtons from './QuickAmountButtons';
import OracleHealthBadge from '@/components/common/OracleHealthBadge';
import { useOracleStatus } from '@/hooks/useOracleStatus';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import {
	defaultReservedNetworkFee,
	type SwapSide,
} from '@/utils/swapQuantity.utils';

export interface SwapPanelProps {
	/** Buy side uses XLM balance; sell side uses held key balance. */
	balance: number;
	/** Whether a wallet is connected. Buttons disable when false. */
	isConnected: boolean;
	/** Controlled swap quantity in whole keys. */
	amount: number;
	/** Invoked when the quantity changes (typing or quick-select). */
	onAmountChange: (amount: number) => void;
	/** Initially active side. */
	defaultSide?: SwapSide;
	/** Creator being traded against. */
	creatorId?: string;
	/** Asset identifier for oracle check. Defaults to 'XLM'. */
	oracleAsset?: string;
}

const SwapPanel: React.FC<SwapPanelProps> = ({
	balance,
	isConnected,
	amount,
	onAmountChange,
	defaultSide = 'buy',
	creatorId,
	oracleAsset = 'XLM',
}) => {
	const [side, setSide] = useState<SwapSide>(defaultSide);
	const oracle = useOracleStatus(oracleAsset);
	const isOffline = useOfflineStatus();

	const handleSideChange = useCallback((value: string) => {
		setSide(value as SwapSide);
	}, []);

	const handleAmountChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const parsed = Number(e.target.value);
			const next = Number.isFinite(parsed)
				? Math.max(0, Math.floor(parsed))
				: 0;
			onAmountChange(next);
		},
		[onAmountChange]
	);

	return (
		<section
			className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
			data-testid="swap-panel"
		>
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-white/50">Trade Execution</span>
				<OracleHealthBadge asset={oracleAsset} />
			</div>

			{/* Fallback Banner - shows warning but does NOT block actions */}
			{oracle.isFallback && (
				<div
					data-testid="oracle-fallback-banner"
					className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"
					role="alert"
				>
					<AlertCircle className="size-4 shrink-0 text-amber-400 mt-0.5" />
					<div>
						<strong className="font-semibold block text-amber-300">
							Oracle Fallback Active
						</strong>
						The price feed is currently running on its fallback source ({oracle.sourceName}). Swaps remain active but may experience price deviation.
					</div>
				</div>
			)}

			{/* Stale Price Banner - warns and explains disabled actions */}
			{oracle.isStale && (
				<div
					data-testid="oracle-stale-banner"
					className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200"
					role="alert"
				>
					<AlertTriangle className="size-4 shrink-0 text-red-400 mt-0.5" />
					<div>
						<strong className="font-semibold block text-red-300">
							Oracle Feed Stale
						</strong>
						{oracle.staleReason || 'Price feed is stale. Trading is paused until fresh prices are reported.'}
					</div>
				</div>
			)}

			<Tabs value={side} onValueChange={handleSideChange} className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger
						value="buy"
						className="text-sm"
						data-testid="swap-tab-buy"
					>
						Buy
					</TabsTrigger>
					<TabsTrigger
						value="sell"
						className="text-sm"
						data-testid="swap-tab-sell"
					>
						Sell
					</TabsTrigger>
				</TabsList>

				<TabsContent value="buy" className="mt-3 space-y-3">
					<div className="space-y-1.5">
						<Label htmlFor="swap-buy-amount">Quantity (keys)</Label>
						<Input
							id="swap-buy-amount"
							data-testid="swap-buy-amount-input"
							type="number"
							inputMode="numeric"
							min={0}
							step={1}
							value={amount}
							onChange={handleAmountChange}
							disabled={!isConnected}
							placeholder="0"
						/>
						<p className="text-xs text-white/50">
							Buy Max uses your XLM balance minus a reserved network fee
							({defaultReservedNetworkFee()}).
						</p>
					</div>
					<QuickAmountButtons
						mode="buy"
						balance={balance}
						activeValue={amount}
						isConnected={isConnected}
						onSelect={onAmountChange}
					/>
				</TabsContent>

				<TabsContent value="sell" className="mt-3 space-y-3">
					<div className="space-y-1.5">
						<Label htmlFor="swap-sell-amount">Quantity (keys)</Label>
						<Input
							id="swap-sell-amount"
							data-testid="swap-sell-amount-input"
							type="number"
							inputMode="numeric"
							min={0}
							step={1}
							value={amount}
							onChange={handleAmountChange}
							disabled={!isConnected}
							placeholder="0"
						/>
						<p className="text-xs text-white/50">
							Holdings: {Math.floor(balance)} key
							{balance !== 1 ? 's' : ''}.
						</p>
					</div>
					<QuickAmountButtons
						mode="sell"
						balance={balance}
						activeValue={amount}
						isConnected={isConnected}
						onSelect={onAmountChange}
					/>
				</TabsContent>
			</Tabs>

			{creatorId && (
				<div className="space-y-1.5">
					<Button
						type="button"
						data-testid="swap-submit"
						disabled={
							!isConnected || !Number.isFinite(amount) || amount <= 0 || oracle.isStale || isOffline
						}
						className="w-full"
					>
						{side === 'buy' ? 'Buy Keys' : 'Sell Keys'}
					</Button>
					{isOffline && (
						<p
							data-testid="swap-offline-disabled-reason"
							className="text-xs text-amber-400 text-center"
							role="alert"
						>
							Action disabled: You are offline.
						</p>
					)}
					{oracle.isStale && !isOffline && (
						<p
							data-testid="swap-stale-disabled-reason"
							className="text-xs text-red-400 text-center"
							role="alert"
						>
							Action disabled: Price is stale. Please wait for an oracle update.
						</p>
					)}
				</div>
			)}
		</section>
	);
};

export default SwapPanel;
