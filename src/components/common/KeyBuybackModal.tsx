import { useState, useEffect, useRef } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatAbsoluteDateTime } from '@/utils/time.utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import {
	useKeyBuyback,
	useSubmitKeyBuybackMutation,
	type KeyBuybackReceipt,
} from '@/hooks/useKeyBuyback';
import { CheckCircle2, ShieldCheck, Copy, Check } from 'lucide-react';
import { copyTextToClipboard } from '@/utils/clipboard.utils';

export interface KeyBuybackModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	creatorId: string;
	creatorTitle: string;
	holdingsCount: number;
	buybackPriceStroops?: number;
	expiryDate?: string | null;
	terms?: string | null;
	userAddress?: string;
	onSettled?: (receipt: KeyBuybackReceipt) => void;
}

export const DEFAULT_BUYBACK_TERMS =
	'Guaranteed contract buyback at fixed settlement price. All positions are permanently redeemed and settled in XLM. Action is final and irreversible on the Soroban network.';

export default function KeyBuybackModal({
	open,
	onOpenChange,
	creatorId,
	creatorTitle,
	holdingsCount,
	buybackPriceStroops: explicitPriceStroops,
	expiryDate: explicitExpiryDate,
	terms: explicitTerms,
	userAddress,
	onSettled,
}: KeyBuybackModalProps) {
	const [receipt, setReceipt] = useState<KeyBuybackReceipt | null>(null);
	const [copiedTx, setCopiedTx] = useState(false);
	const triggerElementRef = useRef<HTMLElement | null>(null);

	const { data: contractBuyback } = useKeyBuyback(creatorId, open);
	const buybackPriceStroops =
		explicitPriceStroops != null && explicitPriceStroops > 0
			? explicitPriceStroops
			: (contractBuyback?.buybackPriceStroops ?? 0);
	const expiryDate = explicitExpiryDate ?? contractBuyback?.expiryDate;
	const terms = explicitTerms ?? contractBuyback?.terms;

	const buybackMutation = useSubmitKeyBuybackMutation(userAddress);
	const isSubmitting = buybackMutation.isPending;

	useEffect(() => {
		if (open) {
			triggerElementRef.current = document.activeElement as HTMLElement | null;
		} else {
			// Reset receipt state after closed
			const timer = setTimeout(() => {
				setReceipt(null);
				setCopiedTx(false);
			}, 200);
			return () => clearTimeout(timer);
		}
	}, [open]);

	const totalPayoutStroops = holdingsCount * buybackPriceStroops;
	const totalPayoutXlm = totalPayoutStroops / STROOPS_PER_XLM;

	const handleConfirmBuyback = async () => {
		if (holdingsCount <= 0 || isSubmitting) return;

		try {
			const result = await buybackMutation.mutateAsync({
				creatorId,
				quantity: holdingsCount,
				buybackPriceStroops,
			});
			setReceipt(result);
			onSettled?.(result);
		} catch {
			// Error handled by mutation onError toast
		}
	};

	const handleCopyTx = async (txHash: string) => {
		await copyTextToClipboard(txHash);
		setCopiedTx(true);
		setTimeout(() => setCopiedTx(false), 2000);
	};

	const handleClose = () => {
		if (isSubmitting) return;
		onOpenChange(false);
	};

	const formattedExpiry = expiryDate
		? formatAbsoluteDateTime(expiryDate) ?? expiryDate
		: 'Guaranteed active program';

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				if (!isSubmitting) {
					onOpenChange(next);
				}
			}}
		>
			<DialogContent
				className="max-w-md border-white/10 bg-[#0a1526]/95 text-white backdrop-blur-xl"
				showCloseButton={!isSubmitting}
				showEscapeHint={!isSubmitting}
				data-testid="key-buyback-modal"
				onCloseAutoFocus={event => {
					event.preventDefault();
					triggerElementRef.current?.focus();
				}}
				onEscapeKeyDown={event => {
					if (isSubmitting) event.preventDefault();
				}}
				onInteractOutside={event => {
					if (isSubmitting) event.preventDefault();
				}}
			>
				{receipt ? (
					/* Settled Post-Buyback State */
					<div className="space-y-5 py-2">
						<div className="flex flex-col items-center text-center">
							<div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
								<CheckCircle2 className="size-8" />
							</div>
							<DialogTitle
								className="text-xl font-bold font-grotesque text-white tracking-tight"
								data-testid="buyback-settlement-confirmed"
							>
								Buyback Settlement Confirmed
							</DialogTitle>
							<DialogDescription className="text-sm text-white/70 mt-1">
								Your position in{' '}
								<span className="font-semibold text-white">
									{creatorTitle}
								</span>{' '}
								has been successfully settled at the guaranteed buyback price.
							</DialogDescription>
						</div>

						{/* Settlement Receipt Card */}
						<div
							className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-3 text-sm"
							data-testid="buyback-settlement-receipt"
						>
							<div className="flex items-center justify-between pb-2 border-b border-white/10">
								<span className="text-white/60">Settlement Status</span>
								<span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
									<Check className="size-3" /> Settled
								</span>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-white/60">Keys Redeemed</span>
								<span className="font-semibold text-white tabular-nums">
									{formatNumber(receipt.quantity)}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-white/60">Settlement Price</span>
								<span className="font-semibold text-white tabular-nums">
									{formatDisplayKeyPrice(receipt.buybackPriceStroops)}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-white/60">Total XLM Payout</span>
								<span className="font-bold text-emerald-400 tabular-nums text-base">
									{formatNumber(
										receipt.totalPayoutStroops / STROOPS_PER_XLM,
										{
											minimumFractionDigits: 2,
											maximumFractionDigits: 4,
										}
									)}{' '}
									XLM
								</span>
							</div>

							<div className="flex items-center justify-between pt-1">
								<span className="text-white/60">Settled At</span>
								<span className="text-xs text-white/80 tabular-nums">
									{formatAbsoluteDateTime(receipt.settledAt) ??
										receipt.settledAt}
								</span>
							</div>

							<div className="pt-2 border-t border-white/10">
								<div className="flex items-center justify-between text-xs text-white/60 mb-1">
									<span>Transaction Hash</span>
									<button
										type="button"
										onClick={() => handleCopyTx(receipt.txHash)}
										className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition-colors"
										title="Copy transaction hash"
									>
										{copiedTx ? (
											<>
												<Check className="size-3 text-emerald-400" />
												<span className="text-emerald-400">Copied</span>
											</>
										) : (
											<>
												<Copy className="size-3" />
												<span>Copy</span>
											</>
										)}
									</button>
								</div>
								<p className="font-mono text-xs text-white/80 break-all select-all bg-black/30 p-2 rounded border border-white/5">
									{receipt.txHash}
								</p>
							</div>

							<p className="text-xs text-white/50 text-center pt-1 italic">
								Position cleared. 0 keys remaining in your wallet.
							</p>
						</div>

						<DialogFooter className="sm:justify-end">
							<Button
								type="button"
								onClick={handleClose}
								className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
								data-testid="buyback-done-button"
							>
								Done
							</Button>
						</DialogFooter>
					</div>
				) : (
					/* Review Terms & Confirmation State */
					<div className="space-y-5 py-1">
						<DialogHeader>
							<DialogTitle className="text-xl font-bold font-grotesque text-white tracking-tight">
								Confirm Key Buyback
							</DialogTitle>
							<DialogDescription className="text-sm text-white/70">
								Exit your position in{' '}
								<span className="font-semibold text-white">
									{creatorTitle}
								</span>{' '}
								at the guaranteed contract buyback price.
							</DialogDescription>
						</DialogHeader>

						{/* Breakdown Card */}
						<div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
							<div className="flex items-center justify-between">
								<span className="text-white/60">Keys held to redeem</span>
								<span className="font-semibold text-white tabular-nums">
									{formatNumber(holdingsCount)}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-white/60">Guaranteed buyback price</span>
								<span className="font-semibold text-white tabular-nums">
									{formatDisplayKeyPrice(buybackPriceStroops)}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-white/60">Buyback expiry</span>
								<span className="font-medium text-white/80 tabular-nums text-xs">
									{formattedExpiry}
								</span>
							</div>

							<div className="h-px bg-white/10 my-1" />

							<div className="flex items-center justify-between">
								<span className="font-medium text-white/80">
									Total XLM Payout
								</span>
								<span className="text-base font-bold text-amber-300 tabular-nums">
									{formatNumber(totalPayoutXlm, {
										minimumFractionDigits: 2,
										maximumFractionDigits: 4,
									})}{' '}
									XLM
								</span>
							</div>
						</div>

						{/* Contract Terms Box */}
						<div
							className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1.5"
							data-testid="buyback-terms"
						>
							<div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 uppercase tracking-wider">
								<ShieldCheck className="size-4 text-amber-400" />
								<span>Contract Settlement Terms</span>
							</div>
							<p className="text-xs text-white/75 leading-relaxed">
								{terms || DEFAULT_BUYBACK_TERMS}
							</p>
						</div>

						<DialogFooter className="sm:justify-between gap-3">
							<Button
								type="button"
								variant="ghost"
								onClick={handleClose}
								disabled={isSubmitting}
								className="text-white/70 hover:text-white"
								data-testid="cancel-buyback-button"
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={handleConfirmBuyback}
								disabled={isSubmitting || holdingsCount <= 0}
								aria-busy={isSubmitting || undefined}
								className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
								data-testid="confirm-buyback-button"
							>
								<StableButtonContent
									isLoading={isSubmitting}
									loadingLabel="Settling Buyback…"
								>
									Confirm Buyback
								</StableButtonContent>
							</Button>
						</DialogFooter>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
