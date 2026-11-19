import React, { useEffect, useRef, useState } from 'react';
import type {
	BuyMarketplaceBundleResult,
	MarketplaceBundle,
} from '@/types/bundles';
import { cn } from '@/lib/utils';
import BundleCard from '@/components/common/BundleCard';
import BundleDetailDrawer from '@/components/common/BundleDetailDrawer';
import BundleSuccessState from '@/components/common/BundleSuccessState';
import { useBuyMarketplaceBundle, useMarketplaceBundles } from '@/hooks/useBundles';
import { filterDiscoverableBundles } from '@/utils/bundlePurchase.utils';

export interface BundleDiscoverySectionProps {
	bundles?: MarketplaceBundle[] | null;
	className?: string;
	heading?: string;
	walletAddress?: string;
	onBundleSelect?: (bundle: MarketplaceBundle) => void;
}

const DiscoveryPurchaseRunner: React.FC<{
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

const DiscoveryContent: React.FC<
	BundleDiscoverySectionProps & {
		bundles: MarketplaceBundle[];
		isLoading?: boolean;
		isError?: boolean;
	}
> = ({
	bundles,
	className,
	heading = 'Creator bundles',
	onBundleSelect,
	isLoading = false,
	isError = false,
}) => {
	const [selected, setSelected] = useState<MarketplaceBundle | null>(null);
	const [pendingBundle, setPendingBundle] = useState<MarketplaceBundle | null>(null);
	const [purchase, setPurchase] = useState<BuyMarketplaceBundleResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	const discoverable = filterDiscoverableBundles(bundles);

	const openDrawer = (bundle: MarketplaceBundle) => {
		setError(null);
		setSelected(bundle);
		onBundleSelect?.(bundle);
	};

	return (
		<section
			className={cn('flex flex-col gap-4', className)}
			aria-labelledby="bundle-discovery-heading"
			data-testid="bundle-discovery-section"
		>
			<div className="flex flex-col gap-1">
				<h2
					id="bundle-discovery-heading"
					className="text-xl font-semibold text-foreground"
					data-testid="bundle-discovery-title"
				>
					{heading}
				</h2>
				<p className="text-sm text-muted-foreground">
					Buy a discounted set of keys in one transaction.
				</p>
			</div>

			{isLoading && (
				<div
					className="text-sm text-muted-foreground"
					data-testid="bundle-discovery-loading"
					aria-live="polite"
				>
					Loading bundles…
				</div>
			)}

			{isError && (
				<p
					role="alert"
					className="text-sm text-destructive"
					data-testid="bundle-discovery-error"
				>
					Could not load bundles.
				</p>
			)}

			<ul
				className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
				aria-label="Bundle listings"
				data-testid="bundle-discovery-grid"
			>
				{discoverable.map(bundle => (
					<li key={bundle.id} data-testid="bundle-discovery-item">
						<BundleCard bundle={bundle} onClick={() => openDrawer(bundle)} />
					</li>
				))}
			</ul>

			{!isLoading && !isError && discoverable.length === 0 && !purchase && (
				<p
					className="text-sm text-muted-foreground"
					data-testid="bundle-discovery-empty"
				>
					No bundles available right now. Check back soon.
				</p>
			)}

			{purchase && (
				<div data-testid="bundle-discovery-success">
					<BundleSuccessState result={purchase} />
				</div>
			)}

			<BundleDetailDrawer
				bundle={selected}
				open={Boolean(selected)}
				onClose={() => setSelected(null)}
				isBuying={Boolean(pendingBundle)}
				buyError={error}
				onConfirmBuy={bundle => {
					setError(null);
					setPendingBundle(bundle);
				}}
			/>

			{pendingBundle && (
				<DiscoveryPurchaseRunner
					bundle={pendingBundle}
					onSuccess={result => {
						setPurchase(result);
						setPendingBundle(null);
						setSelected(null);
					}}
					onError={message => {
						setError(message);
						setPendingBundle(null);
					}}
				/>
			)}
		</section>
	);
};

const ConnectedBundleDiscoverySection: React.FC<BundleDiscoverySectionProps> = props => {
	const query = useMarketplaceBundles();
	const bundles = Array.isArray(query.data) ? query.data : [];
	return (
		<DiscoveryContent
			{...props}
			bundles={bundles}
			isLoading={Boolean(query.isLoading)}
			isError={Boolean(query.isError)}
		/>
	);
};

/**
 * Reusable creator-bundle discovery section (issue #1274).
 *
 * Cards open a detail drawer; the drawer's buy action opens a separate
 * confirmation dialog before any contract call or marketplace write occurs.
 */
export const BundleDiscoverySection: React.FC<BundleDiscoverySectionProps> = props => {
	if (props.bundles) return <DiscoveryContent {...props} bundles={props.bundles} />;
	return <ConnectedBundleDiscoverySection {...props} />;
};

export default BundleDiscoverySection;
