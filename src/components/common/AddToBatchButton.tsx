import { useState, useEffect } from 'react';
import { Layers, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnavailableAction } from '@/components/ui/unavailable-action';
import {
	useBatchTradeStore,
	selectIsInBatch,
	selectBatchItem,
} from '@/hooks/useBatchTradeStore';
import { clampBatchQuantity } from '@/utils/batchTrade.utils';
import { BUY_QUANTITY_BOUNDS } from '@/constants/fees';
import { cn } from '@/lib/utils';
import showToast from '@/utils/toast.util';
import type { BatchTradeDirection } from '@/types/batchTrade.types';

export interface AddToBatchButtonProps {
	/** Creator / course ID of the key to queue. */
	keyId: string;
	/** Display name shown in toasts and the batch drawer. */
	keyName: string;
	/** Current on-chain key price in stroops. */
	priceStroops: number;
	/** Current circulating supply, used for price impact estimates. */
	currentSupply?: number | null;
	/** Optional protocol fee in basis points. */
	protocolFeeBps?: number;
	/** Optional creator fee in basis points. */
	creatorFeeBps?: number;
	/** Optional thumbnail URL carried into the batch drawer. */
	thumbnail?: string;
	/** Renders the button disabled (e.g. while key is frozen or deprecated). */
	disabled?: boolean;
	/** Tooltip explaining why the button is disabled. */
	disabledReason?: string;
	/** Initial amount. */
	defaultAmount?: number;
	/** Initial direction. */
	defaultDirection?: BatchTradeDirection;
	className?: string;
}

/**
 * "Add to Batch" action control (#1155).
 *
 * Provides amount and direction (buy/sell) inputs alongside the Add to Batch
 * button, allowing users to configure and queue orders directly from KeyCard
 * and KeyDetail surfaces into the atomic batch swap drawer.
 */
export const AddToBatchButton: React.FC<AddToBatchButtonProps> = ({
	keyId,
	keyName,
	priceStroops,
	currentSupply,
	protocolFeeBps,
	creatorFeeBps,
	thumbnail,
	disabled = false,
	disabledReason,
	defaultAmount = BUY_QUANTITY_BOUNDS.MIN_QTY,
	defaultDirection = 'buy',
	className,
}) => {
	const isInBatch = useBatchTradeStore(state => selectIsInBatch(state, keyId));
	const existingItem = useBatchTradeStore(state => selectBatchItem(state, keyId));
	const addItem = useBatchTradeStore(state => state.addItem);
	const removeItem = useBatchTradeStore(state => state.removeItem);

	const [direction, setDirection] = useState<BatchTradeDirection>(
		existingItem?.direction ?? defaultDirection
	);
	const [amount, setAmount] = useState<number>(
		existingItem?.amount ?? defaultAmount
	);

	useEffect(() => {
		if (existingItem) {
			setDirection(existingItem.direction);
			setAmount(existingItem.amount);
		}
	}, [existingItem]);

	const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		if (raw === '') {
			setAmount(BUY_QUANTITY_BOUNDS.MIN_QTY);
			return;
		}
		const parsed = Number(raw);
		if (Number.isFinite(parsed)) {
			setAmount(clampBatchQuantity(parsed));
		}
	};

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (disabled) return;

		// If in batch with identical settings, toggle off
		if (
			isInBatch &&
			existingItem &&
			existingItem.direction === direction &&
			existingItem.amount === amount
		) {
			removeItem(keyId);
			showToast.success(`${keyName} removed from batch`);
			return;
		}

		addItem({
			keyId,
			keyName,
			priceStroops,
			currentSupply,
			protocolFeeBps,
			creatorFeeBps,
			thumbnail,
			amount,
			direction,
		});

		showToast.success(
			`${keyName} (${direction.toUpperCase()} ${amount}x) added to batch`
		);
	};

	const content = (
		<div
			className={cn(
				'inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs text-white backdrop-blur-sm',
				isInBatch && 'border-amber-400/30 bg-amber-400/[0.04]',
				className
			)}
			onClick={e => e.stopPropagation()}
			data-testid="add-to-batch-container"
		>
			{/* Direction toggle */}
			<div
				className="flex items-center rounded-lg bg-slate-900/80 p-0.5"
				role="radiogroup"
				aria-label={`Order direction for ${keyName}`}
				data-testid="add-to-batch-direction"
			>
				<button
					type="button"
					role="radio"
					aria-checked={direction === 'buy'}
					data-testid="add-to-batch-direction-buy"
					disabled={disabled}
					onClick={e => {
						e.stopPropagation();
						setDirection('buy');
					}}
					className={cn(
						'rounded-md px-2 py-1 text-[0.7rem] font-bold transition-colors',
						direction === 'buy'
							? 'bg-emerald-500/20 text-emerald-300'
							: 'text-white/50 hover:text-white'
					)}
				>
					Buy
				</button>
				<button
					type="button"
					role="radio"
					aria-checked={direction === 'sell'}
					data-testid="add-to-batch-direction-sell"
					disabled={disabled}
					onClick={e => {
						e.stopPropagation();
						setDirection('sell');
					}}
					className={cn(
						'rounded-md px-2 py-1 text-[0.7rem] font-bold transition-colors',
						direction === 'sell'
							? 'bg-amber-500/20 text-amber-300'
							: 'text-white/50 hover:text-white'
					)}
				>
					Sell
				</button>
			</div>

			{/* Amount input */}
			<div className="flex items-center">
				<label className="sr-only" htmlFor={`batch-amount-${keyId}`}>
					Amount for {keyName}
				</label>
				<input
					id={`batch-amount-${keyId}`}
					type="number"
					inputMode="numeric"
					min={BUY_QUANTITY_BOUNDS.MIN_QTY}
					max={BUY_QUANTITY_BOUNDS.MAX_QTY}
					value={amount}
					disabled={disabled}
					onChange={handleAmountChange}
					onClick={e => e.stopPropagation()}
					data-testid="add-to-batch-amount"
					aria-label={`Batch amount for ${keyName}`}
					className={cn(
						'w-12 rounded-lg border border-white/10 bg-slate-900/80 px-1.5 py-1 text-center font-mono text-xs font-semibold tabular-nums text-white outline-none transition-colors',
						'focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20',
						'disabled:opacity-40'
					)}
				/>
			</div>

			{/* Add/In Batch Button */}
			<Button
				type="button"
				variant="outline"
				size="xs"
				onClick={handleClick}
				disabled={disabled}
				aria-pressed={isInBatch}
				data-testid="add-to-batch-button"
				data-in-batch={isInBatch}
				className={cn(
					'h-7 gap-1 rounded-lg border-white/15 bg-white/[0.04] px-2.5 font-bold text-white/85 hover:border-amber-400/50 hover:text-amber-300',
					isInBatch &&
						'border-amber-400/40 bg-amber-400/10 text-amber-300 hover:border-amber-400/60 hover:bg-amber-400/20 hover:text-amber-200'
				)}
			>
				{isInBatch ? (
					<>
						<Check className="size-3.5 text-amber-400" aria-hidden="true" />
						In Batch
					</>
				) : (
					<>
						<Layers className="size-3.5" aria-hidden="true" />
						Add to Batch
					</>
				)}
			</Button>
		</div>
	);

	if (disabled) {
		return (
			<UnavailableAction disabled reason={disabledReason}>
				{content}
			</UnavailableAction>
		);
	}

	return content;
};

export default AddToBatchButton;
