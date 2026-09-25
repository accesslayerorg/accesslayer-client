/**
 * BatchBuyBasket (#954)
 *
 * Slide-in panel that lists all creator keys the user has added to their
 * batch purchase basket.  Each row shows the creator name/avatar, a quantity
 * stepper clamped to BUY_QUANTITY_BOUNDS, the per-item cost, and a remove
 * button.  The footer shows the total cost and opens the confirmation dialog.
 *
 * Layout strategy:
 *  - Desktop (≥ sm): fixed right-side drawer anchored below the sticky nav.
 *  - Mobile: uses a BottomSheet so the platform drag-to-dismiss gesture works.
 *
 * The component is purely presentational — transaction state lives in
 * BatchBuyConfirmDialog.
 */

import { useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, ShoppingBasket, X, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import {
	useBatchBuyStore,
	selectTotalCostStroops,
	selectHasItems,
	selectItemCount,
} from '@/hooks/useBatchBuyStore';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { BATCH_BUY, BUY_QUANTITY_BOUNDS } from '@/constants/fees';
import { useShallow } from 'zustand/react/shallow';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BatchBuyBasketProps {
	open: boolean;
	onClose: () => void;
	onCheckout: () => void;
}

// ---------------------------------------------------------------------------
// QuantityStepper — +/− inline stepper for a single basket item
// ---------------------------------------------------------------------------

interface QuantityStepperProps {
	value: number;
	creatorId: string;
	creatorName: string;
	onChange: (id: string, qty: number) => void;
}

function QuantityStepper({
	value,
	creatorId,
	creatorName,
	onChange,
}: QuantityStepperProps) {
	const atMin = value <= BUY_QUANTITY_BOUNDS.MIN_QTY;
	const atMax = value >= BUY_QUANTITY_BOUNDS.MAX_QTY;

	return (
		<div
			className="flex items-center gap-1"
			role="group"
			aria-label={`Quantity for ${creatorName}`}
		>
			<button
				type="button"
				onClick={() => onChange(creatorId, value - 1)}
				disabled={atMin}
				aria-label={`Decrease quantity for ${creatorName}`}
				className={cn(
					'flex size-6 items-center justify-center rounded-md border border-white/10 text-white/60',
					'transition-colors hover:border-white/20 hover:text-white',
					'disabled:pointer-events-none disabled:opacity-30',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60'
				)}
			>
				<Minus className="size-3" aria-hidden="true" />
			</button>

			<span
				className="w-8 text-center text-sm font-semibold tabular-nums text-white"
				aria-live="polite"
				aria-atomic="true"
			>
				{value}
			</span>

			<button
				type="button"
				onClick={() => onChange(creatorId, value + 1)}
				disabled={atMax}
				aria-label={`Increase quantity for ${creatorName}`}
				className={cn(
					'flex size-6 items-center justify-center rounded-md border border-white/10 text-white/60',
					'transition-colors hover:border-white/20 hover:text-white',
					'disabled:pointer-events-none disabled:opacity-30',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60'
				)}
			>
				<Plus className="size-3" aria-hidden="true" />
			</button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const BatchBuyBasket: React.FC<BatchBuyBasketProps> = ({
	open,
	onClose,
	onCheckout,
}) => {
	const { items, updateQuantity, removeItem, clearBasket } = useBatchBuyStore(
		useShallow(s => ({
			items: s.items,
			updateQuantity: s.updateQuantity,
			removeItem: s.removeItem,
			clearBasket: s.clearBasket,
		}))
	);
	const totalStroops = useBatchBuyStore(selectTotalCostStroops);
	const hasItems = useBatchBuyStore(selectHasItems);
	const itemCount = useBatchBuyStore(selectItemCount);
	const atCap = itemCount >= BATCH_BUY.MAX_BASKET_ITEMS;

	const handleQuantityChange = useCallback(
		(id: string, qty: number) => {
			updateQuantity(id, qty);
		},
		[updateQuantity]
	);

	return (
		<AnimatePresence>
			{open && (
				<>
					{/* Backdrop — clicking it closes the basket */}
					<motion.div
						key="basket-backdrop"
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
						key="basket-panel"
						role="dialog"
						aria-label="Batch buy basket"
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
								<ShoppingBasket
									className="size-5 text-amber-400"
									aria-hidden="true"
								/>
								<h2 className="text-base font-bold text-white">
									Batch basket
								</h2>
								{itemCount > 0 && (
									<span
										className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300"
										aria-label={`${itemCount} item${itemCount !== 1 ? 's' : ''} in basket`}
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
										onClick={clearBasket}
										className="text-white/40 hover:text-red-400"
									>
										Clear all
									</Button>
								)}
								<button
									type="button"
									onClick={onClose}
									aria-label="Close basket"
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

						{/* Cap warning */}
						{atCap && (
							<div className="border-b border-amber-500/20 bg-amber-500/10 px-5 py-2.5">
								<p className="text-xs text-amber-300">
									Batch cap reached ({BATCH_BUY.MAX_BASKET_ITEMS} creators
									max). Remove an item to add another.
								</p>
							</div>
						)}

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
										<ShoppingBasket
											className="size-10 text-white/20"
											aria-hidden="true"
										/>
										<p className="text-sm text-white/40">
											Your basket is empty.
										</p>
										<p className="max-w-[18rem] text-xs text-white/30">
											Hit{' '}
											<span className="font-semibold text-amber-400/70">
												Add to basket
											</span>{' '}
											on any creator card to start building your batch
											order.
										</p>
									</motion.div>
								) : (
									<ul
										className="divide-y divide-white/[0.06] px-5"
										aria-label="Basket items"
									>
										{items.map(item => (
											<motion.li
												key={item.creatorId}
												layout
												initial={{ opacity: 0, y: -8 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, height: 0, marginBottom: 0 }}
												transition={{ duration: 0.2 }}
												className="flex items-center gap-3 py-4"
											>
												{/* Avatar */}
												<div className="size-10 shrink-0 overflow-hidden rounded-xl">
													<CreatorInitialsAvatar
														name={item.creatorName}
														creatorId={item.creatorId}
														imageSrc={item.thumbnail}
													/>
												</div>

												{/* Name + individual price */}
												<div className="min-w-0 flex-1">
													<p
														className="truncate text-sm font-semibold text-white"
														title={item.creatorName}
													>
														{item.creatorName}
													</p>
													<p className="mt-0.5 text-xs text-white/45 tabular-nums">
														{formatDisplayKeyPrice(item.priceStroops)} ×{' '}
														{item.quantity} ={' '}
														<span className="font-semibold text-amber-300/90">
															{formatDisplayKeyPrice(
																item.priceStroops * item.quantity
															)}
														</span>
													</p>
												</div>

												{/* Quantity stepper */}
												<QuantityStepper
													value={item.quantity}
													creatorId={item.creatorId}
													creatorName={item.creatorName}
													onChange={handleQuantityChange}
												/>

												{/* Remove */}
												<button
													type="button"
													onClick={() => removeItem(item.creatorId)}
													aria-label={`Remove ${item.creatorName} from basket`}
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

						{/* Footer — total + checkout */}
						<div className="border-t border-white/10 px-5 py-4 space-y-3">
							{hasItems && (
								<div
									className="flex items-center justify-between"
									aria-live="polite"
									aria-atomic="true"
								>
									<span className="text-sm text-white/60">
										Estimated total
									</span>
									<span className="font-bold tabular-nums text-amber-300">
										{formatDisplayKeyPrice(totalStroops)}
									</span>
								</div>
							)}
							<Button
								onClick={onCheckout}
								disabled={!hasItems}
								className="w-full rounded-xl font-bold"
								aria-label={
									hasItems
										? `Review and confirm batch purchase of ${itemCount} creator key${itemCount !== 1 ? 's' : ''}`
										: 'Add items to your basket to continue'
								}
							>
								<ShoppingBasket className="size-4" aria-hidden="true" />
								Review &amp; confirm
							</Button>
						</div>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	);
};

export default BatchBuyBasket;
