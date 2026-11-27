import { useEffect, useMemo, useState } from 'react';
import { useConnectedWallet, useWatchlist } from '@/hooks/useWatchlist';
import CreatorCard from '@/components/common/CreatorCard';
import EmptyState from '@/components/common/EmptyState';
import MarketplaceSidebar from '@/components/common/MarketplaceSidebar';
import PriceAlertButton from '@/components/common/PriceAlertButton';
import SectionHeading from '@/components/common/SectionHeading';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import {
	keyPriceSocket,
	type KeyPriceUpdate,
} from '@/services/realtime.service';
import { resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';

interface LivePrice {
	priceStroops: number;
	change24h?: number | null;
}

function WatchlistPageContent() {
	const walletKey = useConnectedWallet(state => state.walletKey);
	const bookmarked = useWatchlist(state => state.getWatchlist(walletKey));
	const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({});
	const watchedKeyIds = useMemo(
		() => bookmarked.map(creator => creator.id),
		[bookmarked]
	);

	useEffect(() => {
		if (watchedKeyIds.length === 0) return;

		const unsubscribe = watchedKeyIds.map(keyId =>
			keyPriceSocket.subscribe(keyId, (update: KeyPriceUpdate) => {
				setLivePrices(current => ({
					...current,
					[keyId]: {
						priceStroops: update.priceStroops,
						change24h: update.change24h,
					},
				}));
			})
		);

		return () => {
			unsubscribe.forEach(stop => stop());
		};
	}, [watchedKeyIds]);

	const watchlist = useMemo(
		() =>
			bookmarked.map(creator => {
				const live = livePrices[creator.id];
				if (!live) return creator;
				return {
					...creator,
					priceStroops: live.priceStroops,
					price: live.priceStroops / STROOPS_PER_XLM,
					change24h: live.change24h ?? creator.change24h,
				};
			}),
		[bookmarked, livePrices]
	);

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(160deg,#08111f_0%,#10213b_45%,#f0b14d_160%)] px-6 pt-24 pb-28 md:px-12 md:pb-12">
			<MarketplaceSidebar />
			<div className="relative z-10 mx-auto max-w-7xl">
				<SectionHeading
					as="h1"
					eyebrow="Your saved keys"
					title="Watchlist"
					supportingText="Track the keys you care about, follow their price and 24h change, and set alerts so you never miss a move."
				/>

				{watchlist.length === 0 ? (
					<EmptyState
						title="Your watchlist is empty"
						description="Bookmark creator keys you're interested in so you can find them again without buying. Start by browsing the marketplace."
						cta={{ label: 'Browse Marketplace', href: '/' }}
					/>
				) : (
					<div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{watchlist.map(creator => (
							<div key={creator.id} className="flex flex-col gap-3">
								<CreatorCard creator={creator} />
								<PriceAlertButton
									keyId={creator.id}
									keyName={creator.title || creator.name || 'Creator key'}
									currentPrice={
										resolveCreatorKeyPriceStroops(creator) ?? 0
									}
									className="w-full justify-center"
								/>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

export default function WatchlistPage() {
	return <WatchlistPageContent />;
}
