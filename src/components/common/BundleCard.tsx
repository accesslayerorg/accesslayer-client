import { Link } from 'react-router';
import { Clock, Package, Tag } from 'lucide-react';
import type { MarketplaceBundle } from '@/types/bundles';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import {
	formatBundleCountdown,
	isBundleExpired,
} from '@/utils/bundleCountdown.utils';
import { computeBundleDiscountPercent } from '@/utils/bundlePurchase.utils';

export interface BundleCardProps {
	bundle: MarketplaceBundle;
	className?: string;
	onClick?: () => void;
	onOpen?: () => void;
	onSelect?: (bundle: MarketplaceBundle) => void;
}

/**
 * Marketplace card for a creator key bundle (issue #981).
 *
 * Shows: bundle name, key count, a compact list of the included creators,
 * the discount percentage, and an expiry countdown. When the bundle is
 * expired, the card renders in a muted "unavailable" state and the link
 * target is dropped so the expired bundle can't be navigated to.
 */
const BundleCard: React.FC<BundleCardProps> = ({
	bundle,
	className,
	onClick,
	onOpen,
	onSelect,
}) => {
	const expired = isBundleExpired(bundle.expiresAt);
	const countdown = formatBundleCountdown(bundle.expiresAt);
	const keys = Array.isArray(bundle.keys) ? bundle.keys : [];
	const totalKeys = keys.reduce((sum, k) => sum + (Number(k?.quantity) || 0), 0);
	const previewCreators = keys.slice(0, 3);
	const extraCreators = keys.length - previewCreators.length;
	const discountPercent =
		typeof bundle.discountPercent === 'number' &&
		Number.isFinite(bundle.discountPercent)
			? bundle.discountPercent
			: computeBundleDiscountPercent(bundle);
	const bundlePriceStroops = Number.isFinite(bundle.bundlePriceStroops)
		? bundle.bundlePriceStroops
		: 0;
	const individualTotalStroops = Number.isFinite(bundle.individualTotalStroops)
		? bundle.individualTotalStroops
		: 0;
	const discountStroops = Number.isFinite(bundle.discountStroops)
		? bundle.discountStroops
		: Math.max(0, individualTotalStroops - bundlePriceStroops);

	const handleOpen = () => {
		onClick?.();
		onOpen?.();
		onSelect?.(bundle);
	};

	const cardBody = (
		<div
			className={cn(
				'flex h-full flex-col gap-4 rounded-2xl border bg-card p-5 transition-shadow',
				expired
					? 'border-border/50 opacity-60'
					: 'border-border shadow-sm hover:shadow-md',
				className
			)}
			data-testid="bundle-card-body"
		>
			<header className="flex items-start justify-between gap-3">
				<div>
					<h3
						className="text-base font-semibold text-foreground"
						data-testid="bundle-card-title"
					>
						{bundle.name}
					</h3>
					<p className="mt-1 text-xs text-muted-foreground">
						{formatNumber(totalKeys)} keys across {keys.length} creators
					</p>
				</div>
				{expired ? (
					<span
						className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
						aria-label="Expired bundle"
						data-testid="bundle-card-expired-badge"
					>
						Expired
					</span>
				) : (
					<span
						className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"
						data-testid="bundle-card-discount"
					>
						-{discountPercent}%
					</span>
				)}
			</header>

			<ul className="flex flex-wrap gap-2 text-xs" data-testid="bundle-card-creators">
				{previewCreators.map(key => (
					<li
						key={key.creatorId}
						className="flex items-center gap-1 rounded-full bg-muted px-2 py-1"
					>
						<Package className="h-3 w-3" aria-hidden="true" />
						<span>{key.creatorName}</span>
						<span className="text-muted-foreground">x{key.quantity}</span>
					</li>
				))}
				{extraCreators > 0 && (
					<li className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
						+{extraCreators} more
					</li>
				)}
			</ul>

			<footer className="mt-auto flex items-center justify-between gap-3 pt-2">
				<div className="flex items-baseline gap-2">
					<span
						className="text-lg font-semibold text-foreground"
						data-testid="bundle-card-price"
					>
						{(bundlePriceStroops / 10_000_000).toFixed(2)} XLM
					</span>
					<span
						className="text-xs text-muted-foreground line-through"
						data-testid="bundle-card-individual-total"
					>
						{(individualTotalStroops / 10_000_000).toFixed(2)} XLM
					</span>
				</div>

				<div className="flex items-center gap-3 text-xs text-muted-foreground">
					<Tag className="h-3 w-3" aria-hidden="true" />
					<span>save {(discountStroops / 10_000_000).toFixed(2)} XLM</span>
					<span
						className="flex items-center gap-1"
						data-testid="bundle-card-countdown"
					>
						<Clock className="h-3 w-3" aria-hidden="true" />
						{countdown}
					</span>
				</div>
			</footer>
		</div>
	);

	if (expired) {
		return (
			<div
				aria-disabled="true"
				data-testid="bundle-card-expired"
				data-bundle-card="expired"
			>
				{cardBody}
			</div>
		);
	}

	if (onClick || onOpen || onSelect) {
		return (
			<button
				type="button"
				className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				aria-label={`View bundle ${bundle.name}`}
				data-testid="bundle-card"
				onClick={handleOpen}
			>
				{cardBody}
			</button>
		);
	}

	return (
		<Link
			to={`/bundles/${bundle.id}`}
			className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			aria-label={`View bundle ${bundle.name}`}
			data-testid="bundle-card"
		>
			{cardBody}
		</Link>
	);
};

export default BundleCard;
