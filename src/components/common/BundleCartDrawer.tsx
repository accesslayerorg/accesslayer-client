/**
 * BundleCartDrawer (#1118)
 *
 * Slide-in panel listing every creator key queued for the bundle purchase.
 * Each row shows the key name, an amount input clamped to
 * BUY_QUANTITY_BOUNDS, the estimated per-item cost, and a remove button.
 * The footer shows the total cost, a cost-weighted price impact summary,
 * and the Submit Bundle button that fires the atomic `bundle_buy` call.
 *
 * Layout strategy mirrors BatchBuyBasket (#954): a fixed right-side drawer
 * driven by framer-motion.
 */

import { useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, Package, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	useBundleCartStore,
	selectBundleHasItems,
	selectBundleItemCount,
} from '@/hooks/useBundleCartStore';
import { useBundleBuyMutation } from '@/hooks/useBundleBuy';
import {
	computeBundlePriceImpactSummary,
	estimateBundleItemCost,
	sumBundleTotalCostStroops,
} from '@/utils/bundleCart.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatPriceImpact } from '@/utils/priceImpact.utils';
import { BUY_QUANTITY_BOUNDS } from '@/constants/fees';
import { useShallow } from 'zustand/react/shallow';

export interface BundleCartDrawerProps {
	open: boolean;
	onClose: () => void;
}

/**
 * Bundle cart drawer: per-item amount editing with live cost updates, and a
 * single Submit Bundle action that submits the whole cart atomically.
 */
export const BundleCartDrawer: React.FC<BundleCartDrawerProps> = ({
	open,
	onClose,
}) => {
	const { items, updateQuantity, removeItem, clearCart } = useBundleCartStore(
		useShallow(s => ({
			items: s.items,
			updateQuantity: s.updateQuantity,
			removeItem: s.removeItem,
			clearCart: s.clearCart,
		}))
	);
	const hasItems = useBundleCartStore(selectBundleHasItems);
	const itemCount = useBundleCartStore(selectBundleItemCount);

	const bundleBuy = useBundleBuyMutation();
	const isSubmitting = bundleBuy.isPending;

	const totalCostStroops = sumBundleTotalCostStroops(items);
	const impactSummary = computeBundlePriceImpactSummary(items);

	const handleAmountChange = useCallback(
		(keyId: string, rawValue: string) => {
			const parsed = Number(rawValue);
			if (!Number.isFinite(parsed)) return;
			updateQuantity(keyId, parsed);
		},
		[updateQuantity]
	);

	const handleSubmit = () => {
		if (!hasItems || isSubmitting) return;
		bundleBuy.mutate(undefined, {
			onSettled: () => onClose(),
		});
	};

	return (
		<AnimatePresence>
			{open && (
				<>
					{/* Backdrop — clicking it closes the cart */}
					<motion.div
						key="bundle-cart-backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
						aria-hidden="true"
						onClick={onClose}
					/>

					{/* Drawer panel */}
					<motion.aside
						key="bundle-cart-panel"
						role="dialog"
						aria-label="Bundle cart"
						aria-modal="true"
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
						className={cn(
							'fixed right-0 top-0 z-50 flex h-full w-full flex-col',
							'bg-slate-900 shadow-2xl sm:max-w-md',
							'border-l border-white/10'
						)}
					>
						{/* Header */}
						<div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
							<div className="flex items-center gap-2">
								<Package
									className="size-5 text-amber-400"
									aria-hidden="true"
								/>
								<h2 className="text-base font-bold text-white">
									Bundle cart
								</h2>
								{itemCount > 0 && (
									<span
										className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300"
										aria-label={`${itemCount} item${itemCount !== 1 ? 's' : ''} in bundle cart`}
									>
										{itemCount}
									</span>
								)}
							</div>
							<div className="flex items-center gap-2">
								{hasItems && (
									<Button
										variant="ghost"
										size="xs"
										onClick={clearCart}
										className="text-white/40 hover:text-red-400"
									>
										Clear all
									</Button>
								)}
								<button
									type="button"
									onClick={onClose}
									aria-label="Close bundle cart"
									className={cn(
										'flex size-8 items-center justify-center rounded-full text-white/50',
										'transition-colors hover:bg-white/10 hover:text-white',
										'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60'
									)}
								>
									<X className="size-4" aria-hidden="true" />
								</button>
							</div>
						</div>

						{/* Item list */}
						<ScrollArea className="min-h-0 flex-1">
							<AnimatePresence initial={false}>
								{items.length === 0 ? (
									<motion.div
										key="empty"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										className="flex flex-col items-center justify-center gap-3 py-16 text-center"
									>
										<Package
											className="size-10 text-white/20"
											aria-hidden="true"
										/>
										<p className="text-sm text-white/40">
											Your bundle cart is empty.
										</p>
										<p className="max-w-[18rem] text-xs text-white/30">
											Hit{' '}
											<span className="font-semibold text-amber-400/70">
												Add to Bundle
											</span>{' '}
											on any key to queue it for a single bundle
											purchase.
										</p>
									</motion.div>
								) : (
									<ul
										className="divide-y divide-white/[0.06] px-5"
										aria-label="Bundle items"
									>
										{items.map(item => (
											<motion.li
												key={item.keyId}
												layout
												initial={{ opacity: 0, y: -8 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, height: 0, marginBottom: 0 }}
												transition={{ duration: 0.2 }}
												className="flex items-center gap-3 py-4"
											>
												{/* Name + estimated cost */}
												<div className="min-w-0 flex-1">
													<p
														className="truncate text-sm font-semibold text-white"
														title={item.keyName}
														data-testid="bundle-item-name"
													>
														{item.keyName}
													</p>
													<p
														className="mt-0.5 text-xs text-white/45 tabular-nums"
														data-testid="bundle-item-cost"
													>
														≈{' '}
														{formatDisplayKeyPrice(
															estimateBundleItemCost(item).totalCostStroops
														)}
													</p>
												</div>

												{/* Amount input */}
												<div className="flex items-center gap-2">
													<label
														className="sr-only"
														htmlFor={`bundle-amount-${item.keyId}`}
													>
														Amount for {item.keyName}
													</label>
													<input
														id={`bundle-amount-${item.keyId}`}
														type="number"
														inputMode="numeric"
														min={BUY_QUANTITY_BOUNDS.MIN_QTY}
														max={BUY_QUANTITY_BOUNDS.MAX_QTY}
														value={item.quantity}
														disabled={isSubmitting}
														onChange={event =>
															handleAmountChange(
																item.keyId,
																event.target.value
															)
														}
														data-testid="bundle-item-amount"
														className={cn(
															'w-16 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-center text-sm font-semibold tabular-nums text-white outline-none transition-colors',
															'focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20',
															'disabled:opacity-40'
														)}
													/>
												</div>

												{/* Remove */}
												<button
													type="button"
													onClick={() => removeItem(item.keyId)}
													aria-label={`Remove ${item.keyName} from bundle`}
													className={cn(
														'flex size-7 shrink-0 items-center justify-center rounded-md text-white/30',
														'transition-colors hover:bg-red-500/10 hover:text-red-400',
														'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60'
													)}
												>
													<Trash2
														className="size-3.5"
														aria-hidden="true"
													/>
												</button>
											</motion.li>
										))}
									</ul>
								)}
							</AnimatePresence>
						</ScrollArea>

						{/* Footer — total, price impact, submit */}
						<div className="border-t border-white/10 px-5 py-4 space-y-3">
							{hasItems && (
								<div
									className="flex items-center justify-between"
									aria-live="polite"
									aria-atomic="true"
								>
									<span className="text-sm text-white/60">
										Total cost
									</span>
									<span
										className="font-bold tabular-nums text-amber-300"
										data-testid="bundle-total-cost"
									>
										{formatDisplayKeyPrice(totalCostStroops)}
									</span>
								</div>
							)}

							{hasItems && impactSummary && (
								<div
									className="flex items-center justify-between text-xs"
									data-testid="bundle-price-impact"
								>
									<span className="text-white/50">
										Estimated price impact
									</span>
									<span
										className={cn(
											'font-semibold tabular-nums',
											impactSummary.totalImpactPercent > 5
												? 'text-amber-300'
												: 'text-white/70'
										)}
									>
										{formatPriceImpact(impactSummary.totalImpactPercent)}
									</span>
								</div>
							)}

							<Button
								onClick={handleSubmit}
								disabled={!hasItems || isSubmitting}
								className="w-full rounded-xl font-bold"
								aria-label={
									hasItems
										? `Submit bundle purchase of ${itemCount} key${itemCount !== 1 ? 's' : ''}`
										: 'Add keys to your bundle to continue'
								}
								data-testid="bundle-submit"
							>
								{isSubmitting ? 'Submitting…' : 'Submit Bundle'}
							</Button>
						</div>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	);
};

export default BundleCartDrawer;
