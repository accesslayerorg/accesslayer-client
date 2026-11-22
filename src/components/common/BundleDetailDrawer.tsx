import React, { useEffect, useRef, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import type {
	BuyMarketplaceBundleResult,
	MarketplaceBundle,
} from '@/types/bundles';
import {
	computeBundleSavingsStroops,
	getMarketplaceKeyDiscountedStroops,
} from '@/utils/bundlePurchase.utils';
import { useBuyMarketplaceBundle, useMarketplaceBundle } from '@/hooks/useBundles';
import BundlePurchaseConfirmModal from '@/components/common/BundlePurchaseConfirmModal';
import BundleSuccessState from '@/components/common/BundleSuccessState';

export interface BundleDetailDrawerProps {
	bundle?: MarketplaceBundle | null;
	bundleId?: string;
	open?: boolean;
	onClose?: () => void;
	onConfirmBuy?: (bundle: MarketplaceBundle) => void | Promise<void>;
	isBuying?: boolean;
	buyError?: string | null;
	className?: string;
}

const BundlePurchaseRunner: React.FC<{
	bundle: MarketplaceBundle;
	onSuccess: (result: BuyMarketplaceBundleResult) => void;
	onError: (message: string) => void;
}> = ({ bundle, onSuccess, onError }) => {
	const mutation = useBuyMarketplaceBundle();
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;
		mutation.mutate(
			{ id: bundle.id },
			{
				onSuccess: result => onSuccess(result),
				onError: error => onError(error.message),
			}
		);
	}, [bundle.id, mutation, onSuccess, onError]);

	return null;
};

const DrawerContent: React.FC<BundleDetailDrawerProps & { bundle: MarketplaceBundle }> = ({
	bundle,
	open = true,
	onClose,
	onConfirmBuy,
	isBuying = false,
	buyError,
	className,
}) => {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [internalPurchase, setInternalPurchase] = useState(false);
	const [purchase, setPurchase] = useState<BuyMarketplaceBundleResult | null>(null);
	const [internalError, setInternalError] = useState<string | null>(null);

	const keys = Array.isArray(bundle.keys) ? bundle.keys : [];
	const bundlePrice = Number.isFinite(bundle.bundlePriceStroops)
		? bundle.bundlePriceStroops
		: 0;
	const individualTotal = Number.isFinite(bundle.individualTotalStroops)
		? bundle.individualTotalStroops
		: 0;
	const savings = computeBundleSavingsStroops(bundle);
	const resolvedError = buyError ?? internalError;

	const handleConfirm = () => {
		setConfirmOpen(false);
		if (onConfirmBuy) {
			void onConfirmBuy(bundle);
			return;
		}
		setInternalPurchase(true);
	};

	if (!open) return null;

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={nextOpen => {
					if (!nextOpen) onClose?.();
				}}
			>
				<DialogContent
					aria-label="Bundle details"
					className={cn('sm:max-w-xl', className)}
					data-testid="bundle-detail-drawer"
				>
					<DialogHeader>
						<DialogTitle>Bundle details</DialogTitle>
						<DialogDescription>{bundle.description}</DialogDescription>
					</DialogHeader>

					{purchase ? (
						<div data-testid="bundle-drawer-success">
							<BundleSuccessState result={purchase} />
						</div>
					) : (
						<>
							<div className="flex flex-col gap-1">
								<h3 className="text-lg font-semibold text-foreground">
									{bundle.name}
								</h3>
								<p className="text-sm text-muted-foreground" data-testid="bundle-drawer-summary">
									{keys.length} creators included · individual total{' '}
									{formatXlmPrice(individualTotal)}
								</p>
							</div>

							<ul
								className="flex flex-col divide-y divide-border rounded-xl border border-border"
								data-testid="bundle-drawer-keys"
							>
								{keys.map((key, index) => {
									const individual = Number.isFinite(key?.individualPriceStroops)
										? key.individualPriceStroops
										: 0;
									const discounted = getMarketplaceKeyDiscountedStroops(key, bundle);
									return (
										<li
											key={`${key.creatorId}-${index}`}
											className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
											data-testid="bundle-drawer-key-row"
										>
											<span
												className="font-medium text-foreground"
												data-testid="bundle-drawer-key-name"
											>
												{key.creatorName}
											</span>
											<span className="text-muted-foreground" data-testid="bundle-drawer-key-quantity">
												Qty {key.quantity}
											</span>
											<span
												className="text-muted-foreground line-through"
												data-testid="bundle-drawer-key-individual"
											>
												Individual {formatXlmPrice(individual)}
											</span>
											<span
												className="font-semibold text-emerald-700"
												data-testid="bundle-drawer-key-discounted"
											>
												Bundle {formatXlmPrice(discounted)}
											</span>
										</li>
									);
								})}
							</ul>

							<div className="flex flex-col gap-1 rounded-xl bg-muted/30 p-4 text-sm">
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Individual total</span>
									<span data-testid="bundle-drawer-individual-total">
										{formatXlmPrice(individualTotal)}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Savings</span>
									<span className="text-emerald-700" data-testid="bundle-drawer-savings">
										{formatXlmPrice(savings)}
									</span>
								</div>
								<div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
									<span>Total</span>
									<span data-testid="bundle-drawer-total">
										{formatXlmPrice(bundlePrice)}
									</span>
								</div>
							</div>

							{resolvedError && (
								<p
									role="alert"
									className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
									data-testid="bundle-drawer-error"
								>
									{resolvedError}
								</p>
							)}

							<DialogFooter>
								<Button type="button" variant="outline" onClick={onClose}>
									Close
								</Button>
								<Button
									type="button"
									onClick={() => setConfirmOpen(true)}
									disabled={isBuying}
									data-testid="bundle-drawer-buy"
								>
									Buy Bundle
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>

			<BundlePurchaseConfirmModal
				open={confirmOpen}
				bundle={bundle}
				onConfirm={handleConfirm}
				onOpenChange={setConfirmOpen}
				isPending={isBuying}
				buyError={resolvedError}
			/>

			{internalPurchase && (
				<BundlePurchaseRunner
					bundle={bundle}
					onSuccess={result => {
						setPurchase(result);
						setInternalPurchase(false);
					}}
					onError={message => {
						setInternalError(message);
						setInternalPurchase(false);
					}}
				/>
			)}
		</>
	);
};

const ConnectedBundleDetailDrawer: React.FC<BundleDetailDrawerProps> = props => {
	const { data } = useMarketplaceBundle(props.bundleId);
	if (!data) return null;
	return <DrawerContent {...props} bundle={data} />;
};

/**
 * Discovery drawer for a single marketplace bundle (issue #1274).
 *
 * The Buy Bundle button only opens the confirmation dialog; the actual
 * contract call and marketplace write happen from the confirmation callback.
 */
export const BundleDetailDrawer: React.FC<BundleDetailDrawerProps> = props => {
	if (props.bundle) return <DrawerContent {...props} bundle={props.bundle} />;
	if (props.bundleId) return <ConnectedBundleDetailDrawer {...props} />;
	return null;
};

export default BundleDetailDrawer;
