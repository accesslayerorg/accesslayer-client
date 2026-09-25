import { useConnectedWallet, useWatchlist } from '@/hooks/useWatchlist';
import CreatorCard from '@/components/common/CreatorCard';
import EmptyState from '@/components/common/EmptyState';
import MarketplaceSidebar from '@/components/common/MarketplaceSidebar';
import SectionHeading from '@/components/common/SectionHeading';

function WatchlistPageContent() {
	const walletKey = useConnectedWallet(state => state.walletKey);
	const watchlist = useWatchlist(state => state.getWatchlist(walletKey));

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(160deg,#08111f_0%,#10213b_45%,#f0b14d_160%)] px-6 pt-24 pb-28 md:px-12 md:pb-12">
			<MarketplaceSidebar />
			<div className="relative z-10 mx-auto max-w-7xl">
				<SectionHeading
					as="h1"
					eyebrow="Your saved keys"
					title="Watchlist"
					supportingText="Bookmarked creator keys you're interested in, all in one place. Save a creator key from the marketplace or its profile page to add it here."
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
							<CreatorCard key={creator.id} creator={creator} />
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
