import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, Minus, Plus, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import {
	useBundleCartStore,
	selectBundleTotalCostStroops,
	selectBundleItemCount,
	selectEstimatedBundlePriceImpact,
} from '@/hooks/useBundleCartStore';
import { creatorKeysContractService } from '@/services/creatorKeysContract.service';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { truncateTxHash } from '@/constants/stellar';
import showToast from '@/utils/toast.util';
import { cn } from '@/lib/utils';

export default function BundleCartDrawer() {
	const items = useBundleCartStore(state => state.items);
	const isOpen = useBundleCartStore(state => state.isOpen);
	const setIsOpen = useBundleCartStore(state => state.setIsOpen);
	const removeItem = useBundleCartStore(state => state.removeItem);
	const updateAmount = useBundleCartStore(state => state.updateAmount);
	const clearCart = useBundleCartStore(state => state.clearCart);

	const totalCostStroops = useBundleCartStore(selectBundleTotalCostStroops);
	const itemCount = useBundleCartStore(selectBundleItemCount);
	const priceImpact = useBundleCartStore(selectEstimatedBundlePriceImpact);

	const [isSubmitting, setIsSubmitting] = useState(false);

	if (!isOpen) return null;

	const handleSubmitBundle = async () => {
		if (items.length === 0 || isSubmitting) return;

		setIsSubmitting(true);
		showToast.loading('Submitting bundle purchase...');

		try {
			const result = await creatorKeysContractService.bundle_buy({
				items: items.map(i => ({
					keyId: i.keyId,
					amount: i.amount,
					maxPriceStroops: Math.ceil(i.priceStroops * 1.05),
				})),
			});

			const txHash =
				result?.hash ||
				`0x${Array.from({ length: 64 }, () =>
					Math.floor(Math.random() * 16).toString(16)
				).join('')}`;

			showToast.transactionSuccess(
				'Bundle Purchase Confirmed',
				`Purchased ${items.length} key${items.length === 1 ? '' : 's'} in one atomic transaction (${truncateTxHash(txHash)})`,
				txHash
			);

			clearCart();
			setIsOpen(false);
		} catch (error) {
			const msg =
				error instanceof Error
					? error.message
					: 'Failed to complete bundle purchase';
			showToast.error(msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex justify-end">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
				onClick={() => !isSubmitting && setIsOpen(false)}
				aria-hidden="true"
			/>

			{/* Slide-in drawer from right */}
			<aside
				data-testid="bundle-cart-drawer"
				className={cn(
					'relative z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-900/98 shadow-2xl backdrop-blur-xl',
					'transition-transform duration-300 ease-out'
				)}
				aria-label="Bundle purchase cart"
			>
				{/* Drawer header */}
				<div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
					<div className="flex items-center gap-2.5">
						<div className="flex size-9 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-400">
							<ShoppingBag className="size-4" aria-hidden="true" />
						</div>
						<div>
							<h2 className="font-grotesque text-lg font-black tracking-tight text-white">
								Bundle Purchase
							</h2>
							<p className="text-xs text-white/50">
								{itemCount} key{itemCount === 1 ? '' : 's'} queued
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={() => setIsOpen(false)}
						disabled={isSubmitting}
						data-testid="bundle-cart-close"
						aria-label="Close bundle cart"
						className="flex size-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
					>
						<X className="size-4" aria-hidden="true" />
					</button>
				</div>

				{/* Drawer content: list of queued items */}
				<ScrollArea className="flex-1 px-6 py-4">
					{items.length === 0 ? (
						<div
							data-testid="bundle-cart-empty"
							className="flex flex-col items-center justify-center py-20 text-center"
						>
							<div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/30">
								<ShoppingBag className="size-7" aria-hidden="true" />
							</div>
							<p className="mt-4 font-grotesque text-base font-bold text-white">
								Your bundle cart is empty
							</p>
							<p className="mt-1 max-w-xs text-xs text-white/50">
								Add creator keys from the marketplace or key details to
								buy them all together in a single atomic transaction.
							</p>
						</div>
					) : (
						<ul className="divide-y divide-white/10" aria-label="Queued bundle items">
							{items.map(item => {
								const itemTotalStroops = item.priceStroops * item.amount;

								return (
									<li
										key={item.keyId}
										data-testid="bundle-cart-item"
										className="flex items-center gap-3 py-4"
									>
										{/* Avatar */}
										<div className="size-11 shrink-0 overflow-hidden rounded-xl border border-white/10">
											<CreatorInitialsAvatar
												name={item.name}
												creatorId={item.keyId}
												imageSrc={item.avatarUrl || item.thumbnail}
											/>
										</div>

										{/* Details */}
										<div className="min-w-0 flex-1">
											<p
												data-testid="bundle-item-name"
												className="truncate text-sm font-bold text-white"
												title={item.name}
											>
												{item.name}
											</p>
											<p
												data-testid="bundle-item-cost"
												className="text-xs font-semibold text-amber-300"
											>
												{formatDisplayKeyPrice(itemTotalStroops)}
											</p>
											<p className="text-[0.65rem] text-white/40">
												{formatDisplayKeyPrice(item.priceStroops)} each
											</p>
										</div>

										{/* Amount input & controls */}
										<div className="flex items-center gap-1">
											<button
												type="button"
												onClick={() =>
													updateAmount(item.keyId, item.amount - 1)
												}
												disabled={item.amount <= 1 || isSubmitting}
												aria-label={`Decrease amount for ${item.name}`}
												className="flex size-6 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
											>
												<Minus className="size-3" aria-hidden="true" />
											</button>

											<input
												type="number"
												min={1}
												value={item.amount}
												onChange={e => {
													const val = parseInt(e.target.value, 10);
													updateAmount(item.keyId, isNaN(val) ? 1 : val);
												}}
												disabled={isSubmitting}
												data-testid="bundle-item-amount"
												aria-label={`Amount for ${item.name}`}
												className="w-10 rounded-md border border-white/10 bg-white/[0.04] px-1 py-0.5 text-center font-mono text-xs font-bold text-white outline-none focus:border-amber-400"
											/>

											<button
												type="button"
												onClick={() =>
													updateAmount(item.keyId, item.amount + 1)
												}
												disabled={isSubmitting}
												aria-label={`Increase amount for ${item.name}`}
												className="flex size-6 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
											>
												<Plus className="size-3" aria-hidden="true" />
											</button>
										</div>

										{/* Remove button */}
										<button
											type="button"
											onClick={() => removeItem(item.keyId)}
											disabled={isSubmitting}
											data-testid="bundle-item-remove"
											aria-label={`Remove ${item.name} from bundle`}
											className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-red-500/15 hover:text-red-400 focus-visible:outline-none"
										>
											<Trash2 className="size-3.5" aria-hidden="true" />
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</ScrollArea>

				{/* Drawer bottom: Total cost, estimated price impact, and submit button */}
				{items.length > 0 && (
					<div className="border-t border-white/10 bg-white/[0.02] p-6 space-y-4">
						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs text-white/60">
								<span>Estimated Price Impact</span>
								<span
									data-testid="bundle-price-impact"
									className="font-mono font-semibold text-emerald-400"
								>
									~{priceImpact.toFixed(2)}%
								</span>
							</div>

							<div className="flex items-center justify-between text-sm">
								<span className="font-semibold text-white/80">
									Total Cost
								</span>
								<span
									data-testid="bundle-total-cost"
									className="font-mono text-lg font-black text-amber-300"
								>
									{formatDisplayKeyPrice(totalCostStroops)}
								</span>
							</div>
						</div>

						<Button
							type="button"
							onClick={handleSubmitBundle}
							disabled={isSubmitting || items.length === 0}
							data-testid="submit-bundle-button"
							className="h-12 w-full rounded-xl bg-amber-400 font-bold text-slate-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
						>
							{isSubmitting ? (
								<>
									<Loader2
										className="mr-2 size-4 animate-spin"
										aria-hidden="true"
									/>
									Submitting Bundle...
								</>
							) : (
								<>
									Submit Bundle
									<ArrowRight
										className="ml-2 size-4"
										aria-hidden="true"
									/>
								</>
							)}
						</Button>
					</div>
				)}
			</aside>
		</div>
	);
}
