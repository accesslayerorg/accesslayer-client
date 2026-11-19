import { useMemo } from 'react';
import { ArrowLeft, Clock, Package } from 'lucide-react';
import { Link } from 'react-router';
import type { MarketplaceBundle } from '@/types/bundles';
import { Button } from '@/components/ui/button';
import { AsyncButton } from '@/components/ui/async-button';
import { cn } from '@/lib/utils';
import {
	formatBundleCountdown,
	isBundleExpired,
} from '@/utils/bundleCountdown.utils';
import {
	computeBundleDiscountPercent,
	computeBundleSavingsStroops,
} from '@/utils/bundlePurchase.utils';

export interface BundleDetailPanelProps {
	bundle: MarketplaceBundle;
	onBuy: () => void;
	isBuying: boolean;
	buyError?: string | null;
	className?: string;
}

const XLM_PER_STROOP = 10_000_000;

function toXlm(stroops: number): string {
	return (stroops / XLM_PER_STROOP).toFixed(2);
}

function finiteOr(value: number | undefined, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Detail view for a single bundle (issue #981).
 *
 * Renders the price breakdown (bundle price vs. individual total vs. the
 * discount), the key list, and the buy button. The buy button is disabled
 * when the bundle is expired.
 */
const BundleDetailPanel: React.FC<BundleDetailPanelProps> = ({
	bundle,
	onBuy,
	isBuying,
	buyError,
	className,
}) => {
	const expired = useMemo(() => isBundleExpired(bundle.expiresAt), [bundle.expiresAt]);
	const countdown = useMemo(() => formatBundleCountdown(bundle.expiresAt), [bundle.expiresAt]);
	const keys = useMemo(
		() => (Array.isArray(bundle.keys) ? bundle.keys : []),
		[bundle.keys]
	);
	const totalKeys = useMemo(
		() => keys.reduce((sum, k) => sum + (Number(k?.quantity) || 0), 0),
		[keys]
	);
	const individualTotal = finiteOr(
		bundle.individualTotalStroops,
		computeBundleSavingsStroops(bundle) +
			finiteOr(bundle.bundlePriceStroops, 0)
	);
	const bundlePrice = finiteOr(
		bundle.bundlePriceStroops,
		Math.max(0, individualTotal - computeBundleSavingsStroops(bundle))
	);
	const discount = finiteOr(
		bundle.discountStroops,
		computeBundleSavingsStroops(bundle)
	);
	const discountPercent = finiteOr(
		bundle.discountPercent,
		computeBundleDiscountPercent(bundle)
	);

	return (
		<section
			className={cn('flex flex-col gap-6', className)}
			aria-labelledby="bundle-detail-heading"
			data-testid="bundle-detail-panel"
		>
			<Link
				to="/bundles"
				className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				data-testid="bundle-detail-back"
			>
				<ArrowLeft className="h-4 w-4" aria-hidden="true" />
				Back to bundles
			</Link>

			<header className="flex flex-col gap-2">
				<h1
					id="bundle-detail-heading"
					className="text-2xl font-semibold text-foreground"
					data-testid="bundle-detail-title"
				>
					{bundle.name}
				</h1>
				<p className="text-sm text-muted-foreground">{bundle.description}</p>
				<div className="flex items-center gap-3 text-xs text-muted-foreground">
					<span className="flex items-center gap-1">
						<Package className="h-3 w-3" aria-hidden="true" />
						{totalKeys} keys · {keys.length} creators
					</span>
					<span className="flex items-center gap-1">
						<Clock className="h-3 w-3" aria-hidden="true" />
						{expired ? 'Expired' : `Expires in ${countdown}`}
					</span>
				</div>
			</header>

			<div className="grid gap-6 md:grid-cols-2">
				<section
					aria-labelledby="bundle-includes-heading"
					className="rounded-2xl border border-border bg-card p-5"
					data-testid="bundle-detail-includes"
				>
					<h2
						id="bundle-includes-heading"
						className="mb-3 text-sm font-semibold text-foreground"
					>
						What's included
					</h2>
					<ul className="flex flex-col gap-2">
						{keys.map(key => (
							<li
								key={key.creatorId}
								className="flex items-center justify-between text-sm"
								data-testid="bundle-detail-key-row"
							>
								<span className="text-foreground">{key.creatorName}</span>
								<span className="text-muted-foreground">
									{key.quantity} × {toXlm(key.individualPriceStroops)} XLM
								</span>
							</li>
						))}
					</ul>
				</section>

				<section
					aria-labelledby="bundle-price-heading"
					className="rounded-2xl border border-border bg-card p-5"
					data-testid="bundle-detail-price-breakdown"
				>
					<h2
						id="bundle-price-heading"
						className="mb-3 text-sm font-semibold text-foreground"
					>
						Price breakdown
					</h2>
					<dl className="flex flex-col gap-2 text-sm">
						<div className="flex items-center justify-between">
							<dt className="text-muted-foreground">Individual total</dt>
							<dd
								className="text-foreground line-through"
								data-testid="bundle-detail-individual-total"
							>
								{toXlm(individualTotal)} XLM
							</dd>
						</div>
						<div className="flex items-center justify-between">
							<dt className="text-muted-foreground">Bundle discount</dt>
							<dd
								className="text-emerald-700"
								data-testid="bundle-detail-discount"
							>
								−{toXlm(discount)} XLM ({discountPercent}%)
							</dd>
						</div>
						<div className="mt-1 flex items-center justify-between border-t border-border pt-3 text-base">
							<dt className="font-semibold text-foreground">You pay</dt>
							<dd
								className="font-semibold text-foreground"
								data-testid="bundle-detail-price"
							>
								{toXlm(bundlePrice)} XLM
							</dd>
						</div>
					</dl>
				</section>
			</div>

			{buyError && (
				<p
					role="alert"
					className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
					data-testid="bundle-detail-buy-error"
				>
					{buyError}
				</p>
			)}

			{expired ? (
				<Button disabled aria-disabled="true" data-testid="bundle-detail-expired">
					Bundle expired
				</Button>
			) : isBuying ? (
				<AsyncButton
					isPending
					pendingText="Purchasing…"
					data-testid="bundle-detail-buy"
				>
					Buy bundle
				</AsyncButton>
			) : (
				<Button onClick={onBuy} data-testid="bundle-detail-buy">
					Buy bundle for {toXlm(bundlePrice)} XLM
				</Button>
			)}
		</section>
	);
};

export default BundleDetailPanel;
