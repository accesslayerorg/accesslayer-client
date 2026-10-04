import { Link } from 'react-router';
import { Clock, Package, Tag } from 'lucide-react';
import type { MarketplaceBundle } from '@/types/bundles';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import {
    formatBundleCountdown,
    isBundleExpired,
} from '@/utils/bundleCountdown.utils';

export interface BundleCardProps {
    bundle: MarketplaceBundle;
    className?: string;
}

/**
 * Marketplace card for a creator key bundle (issue #981).
 *
 * Shows: bundle name, key count, a compact list of the included creators,
 * the discount percentage, and an expiry countdown. When the bundle is
 * expired, the card renders in a muted "unavailable" state and the link
 * target is dropped so the expired bundle can't be navigated to.
 */
const BundleCard: React.FC<BundleCardProps> = ({ bundle, className }) => {
    const expired = isBundleExpired(bundle.expiresAt);
    const countdown = formatBundleCountdown(bundle.expiresAt);
    const totalKeys = bundle.keys.reduce((sum, k) => sum + k.quantity, 0);
    const previewCreators = bundle.keys.slice(0, 3);
    const extraCreators = bundle.keys.length - previewCreators.length;

    const cardBody = (
        <div
            className={cn(
                'flex h-full flex-col gap-4 rounded-2xl border bg-card p-5 transition-shadow',
                expired
                    ? 'border-border/50 opacity-60'
                    : 'border-border shadow-sm hover:shadow-md',
                className
            )}
        >
            <header className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-foreground">
                        {bundle.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {formatNumber(totalKeys)} keys across {bundle.keys.length} creators
                    </p>
                </div>
                {expired ? (
                    <span
                        className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                        aria-label="Expired bundle"
                    >
                        Expired
                    </span>
                ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                        -{bundle.discountPercent}%
                    </span>
                )}
            </header>

            <ul className="flex flex-wrap gap-2 text-xs">
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
                    <span className="text-lg font-semibold text-foreground">
                        {(bundle.bundlePriceStroops / 10_000_000).toFixed(2)} XLM
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                        {(bundle.individualTotalStroops / 10_000_000).toFixed(2)} XLM
                    </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    <span>save {(bundle.discountStroops / 10_000_000).toFixed(2)} XLM</span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {countdown}
                    </span>
                </div>
            </footer>
        </div>
    );

    if (expired) {
        return (
            <div aria-disabled="true" data-testid="bundle-card-expired">
                {cardBody}
            </div>
        );
    }

    return (
        <Link
            to={`/bundles/${bundle.id}`}
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`View bundle ${bundle.name}`}
        >
            {cardBody}
        </Link>
    );
};

export default BundleCard;