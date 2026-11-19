import SkipToContent from '@/components/common/SkipToContent';
import SectionHeading from '@/components/common/SectionHeading';
import BundleCard from '@/components/common/BundleCard';
import EmptyState from '@/components/common/EmptyState';
import { CreatorCardGridSkeleton } from '@/components/common/CreatorCardSkeleton';
import { useMarketplaceBundles } from '@/hooks/useBundles';

/**
 * Bundle listing page (issue #981). Renders every bundle returned by
 * `useMarketplaceBundles()` as a card. Loading state uses the same grid skeleton the
 * creator marketplace uses, so the layout does not jump.
 */
const BundlesPage: React.FC = () => {
    const { data: bundles, isLoading, isError } = useMarketplaceBundles();

    return (
        <main id="main-content" tabIndex={-1} className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
            <SkipToContent targetId="main-content" />
            <SectionHeading
                title="Creator bundles"
                supportingText="Buy a discounted set of keys in one transaction."
            />

            {isLoading && <CreatorCardGridSkeleton count={6} />}

            {isError && (
                <EmptyState
                    title="Could not load bundles"
                    description="Please try again in a moment."
                />
            )}

            {!isLoading && !isError && bundles && bundles.length === 0 && (
                <EmptyState
                    title="No bundles available"
                    description="Check back soon — creators publish new bundles regularly."
                />
            )}

            {!isLoading && !isError && bundles && bundles.length > 0 && (
                <ul
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    aria-label="Bundle listings"
                >
                    {bundles.map(bundle => (
                        <li key={bundle.id}>
                            <BundleCard bundle={bundle} />
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
};

export default BundlesPage;