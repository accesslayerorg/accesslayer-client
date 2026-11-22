import { useState } from 'react';
import { useParams } from 'react-router';
import BundleDetailPanel from '@/components/common/BundleDetailPanel';
import BundleSuccessState from '@/components/common/BundleSuccessState';
import EmptyState from '@/components/common/EmptyState';
import { useMarketplaceBundle, useBuyMarketplaceBundle } from '@/hooks/useBundles';
import type { BuyMarketplaceBundleResult } from '@/types/bundles';

/**
 * Bundle detail + purchase page (issue #981).
 *
 * Owns the buy flow: once `useBuyBundle` resolves, the panel is replaced
 * by the success state listing the received keys and tx hash. On error,
 * the panel renders the message inline and the button stays clickable.
 */
const BundleDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { data: bundle, isLoading } = useMarketplaceBundle(id);
    const buyMutation = useBuyMarketplaceBundle();
    const [purchase, setPurchase] = useState<BuyMarketplaceBundleResult | null>(null);

    if (isLoading) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-8">
                <p className="text-sm text-muted-foreground">Loading bundle…</p>
            </main>
        );
    }

    if (!bundle) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-8">
                <EmptyState
                    title="Bundle not found"
                    description="The bundle you are looking for does not exist or was removed."
                />
            </main>
        );
    }

    if (purchase) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-8">
                <BundleSuccessState result={purchase} />
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-3xl px-4 py-8">
            <BundleDetailPanel
                bundle={bundle}
                isBuying={buyMutation.isPending}
                buyError={buyMutation.error?.message ?? null}
                onBuy={() => {
                    buyMutation.mutate(
                        { id: bundle.id },
                        { onSuccess: result => setPurchase(result) }
                    );
                }}
            />
        </main>
    );
};

export default BundleDetailPage;