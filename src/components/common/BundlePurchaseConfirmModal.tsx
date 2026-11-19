import React from 'react';
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
import type { MarketplaceBundle } from '@/types/bundles';
import { computeBundleSavingsStroops } from '@/utils/bundlePurchase.utils';

export interface BundlePurchaseConfirmModalProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onClose?: () => void;
	bundle?: MarketplaceBundle | null;
	onConfirm: () => void | Promise<void>;
	isPending?: boolean;
	buyError?: string | null;
	className?: string;
}

const BundlePurchaseConfirmModal: React.FC<BundlePurchaseConfirmModalProps> = ({
	open = true,
	onOpenChange,
	onClose,
	bundle,
	onConfirm,
	isPending = false,
	buyError,
	className,
}) => {
	const savings = bundle ? computeBundleSavingsStroops(bundle) : 0;
	const bundlePrice = bundle?.bundlePriceStroops ?? 0;

	const handleCancel = () => {
		onOpenChange?.(false);
		onClose?.();
	};

	const handleConfirm = () => {
		void onConfirm();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				aria-label="Confirm bundle purchase"
				className={cn('sm:max-w-md', className)}
				data-testid="bundle-purchase-confirm-modal"
				showCloseButton={false}
				showEscapeHint={false}
			>
				<DialogHeader>
					<DialogTitle>Confirm bundle purchase</DialogTitle>
					<DialogDescription>
						{bundle
							? `Review the purchase of ${bundle.name} before signing.`
							: 'Review this bundle purchase before signing.'}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Bundle price</span>
						<span className="font-semibold text-foreground" data-testid="bundle-confirm-total">
							{formatXlmPrice(bundlePrice)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Net savings</span>
						<span className="font-semibold text-emerald-700" data-testid="bundle-net-savings">
							{formatXlmPrice(savings)}
						</span>
					</div>
				</div>

				{buyError && (
					<p
						role="alert"
						className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
						data-testid="bundle-purchase-confirm-error"
					>
						{buyError}
					</p>
				)}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={handleCancel}
						data-testid="bundle-cancel-purchase"
					>
						Cancel
					</Button>
					<Button
						type="button"
						aria-label="Buy bundle"
						onClick={handleConfirm}
						disabled={isPending}
						data-testid="bundle-confirm-buy"
					>
						{isPending ? 'Purchasing…' : 'Buy bundle'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default BundlePurchaseConfirmModal;
