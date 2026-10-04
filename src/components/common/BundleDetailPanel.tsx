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
    const totalKeys = useMemo(
        () => bundle.keys.reduce((sum, k) => sum + k.quantity, 0),
        [bundle.keys]
    );

    return (
        <section
            className={cn('flex flex-col gap-6', className)}
            aria-labelledby="bundle-detail-heading"
        >
            <Link
                to="/bundles"
                className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to bundles
            </Link>

            <header className="flex flex-col gap-2">
                <h1
                    id="bundle-detail-heading"
                    className="text-2xl font-semibold text-foreground"
                >
                    {bundle.name}
                </h1>
                <p className="text-sm text-muted-foreground">{bundle.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" aria-hidden="true" />
                        {totalKeys} keys · {bundle.keys.length} creators
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
                >
                    <h2
                        id="bundle-includes-heading"
                        className="mb-3 text-sm font-semibold text-foreground"
                    >
                        What's included
                    </h2>
                    <ul className="flex flex-col gap-2">
                        {bundle.keys.map(key => (
                            <li
                                key={key.creatorId}
                                className="flex items-center justify-between text-sm"
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
                            <dd className="text-foreground line-through">
                                {toXlm(bundle.individualTotalStroops)} XLM
                            </dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">Bundle discount</dt>
                            <dd className="text-emerald-700">
                                −{toXlm(bundle.discountStroops)} XLM ({bundle.discountPercent}%)
                            </dd>
                        </div>
                        <div className="mt-1 flex items-center justify-between border-t border-border pt-3 text-base">
                            <dt className="font-semibold text-foreground">You pay</dt>
                            <dd className="font-semibold text-foreground">
                                {toXlm(bundle.bundlePriceStroops)} XLM
                            </dd>
                        </div>
                    </dl>
                </section>
            </div>

            {buyError && (
                <p
                    role="alert"
                    className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {buyError}
                </p>
            )}

            {expired ? (
                <Button disabled aria-disabled="true">
                    Bundle expired
                </Button>
            ) : isBuying ? (
                <AsyncButton isPending pendingText="Purchasing…">
                    Buy bundle
                </AsyncButton>
            ) : (
                <Button onClick={onBuy}>Buy bundle for {toXlm(bundle.bundlePriceStroops)} XLM</Button>
            )}
        </section>
    );
};

export default BundleDetailPanel;