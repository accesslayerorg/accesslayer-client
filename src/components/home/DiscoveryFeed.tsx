import { ArrowRight, TrendingUp, Zap, Target } from 'lucide-react';
import { Link } from 'react-router';
import type { Course } from '@/services/course.service';
import { useDiscoveryFeed } from '@/hooks/useKeyDiscovery';
import CreatorCard from '@/components/common/CreatorCard';
import { formatNumber } from '@/utils/numberFormat.utils';

const GRADUATION_SUPPLY = 1000;

interface FeedSectionProps {
	title: string;
	description: string;
	icon: React.ReactNode;
	creators: Course[];
	isLoading: boolean;
	viewAllLink: string;
}

function FeedSection({
	title,
	description,
	icon,
	creators,
	isLoading,
	viewAllLink,
}: FeedSectionProps) {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center rounded-lg bg-amber-400/10 p-2.5">
						{icon}
					</div>
					<div>
						<h3 className="text-sm font-bold uppercase tracking-[0.1em] text-white">
							{title}
						</h3>
						<p className="text-xs text-white/50">{description}</p>
					</div>
				</div>
				<Link
					to={viewAllLink}
					className="shrink-0 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-amber-400 hover:text-amber-300 transition-colors"
				>
					View all
					<ArrowRight className="size-3.5" />
				</Link>
			</div>

			{/* Cards Grid */}
			{isLoading ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
					{[...Array(5)].map((_, i) => (
						<div
							key={i}
							className="h-64 rounded-lg bg-white/5 animate-pulse"
						/>
					))}
				</div>
			) : creators.length === 0 ? (
				<div className="rounded-lg border border-white/10 bg-white/5 px-6 py-8 text-center">
					<p className="text-sm text-white/60">
						No keys available in this section yet.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
					{creators.map(creator => (
						<CreatorCard key={creator.id} creator={creator} />
					))}
				</div>
			)}
		</div>
	);
}

/**
 * Discovery feed component with trending, new launches, and graduating soon sections.
 * Renders on the home page highlighting keys by different metrics.
 */
export default function DiscoveryFeed() {
	const {
		trendingKeys,
		newLaunches,
		graduatingSoon,
		isLoading,
		isRefreshing,
	} = useDiscoveryFeed();

	// Create filter query params for marketplace links
	const sortParam = (sort: string) =>
		`/marketplace?sort=${sort}`;

	return (
		<section className="space-y-8 px-6 py-16 md:px-12">
			<div className="mx-auto max-w-7xl space-y-8">
				{/* Section Header */}
				<div className="flex items-center justify-between gap-4">
					<div>
						<h2 className="text-xl font-bold uppercase tracking-[0.1em] text-white">
							Key Discovery
						</h2>
						<p className="mt-2 text-sm text-white/60">
							Trending by volume, newly launched, and approaching
							graduation
						</p>
					</div>
					{isRefreshing && (
						<div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
							<div className="size-2 rounded-full bg-amber-400 animate-pulse" />
							Updating
						</div>
					)}
				</div>

				{/* Trending Section */}
				<div
					className="rounded-lg border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent p-6"
					aria-live="polite"
					aria-busy={isRefreshing || undefined}
				>
					<FeedSection
						title="Trending"
						description="Top 5 keys by 24h volume"
						icon={<TrendingUp className="size-4 text-amber-400" />}
						creators={trendingKeys}
						isLoading={isLoading}
						viewAllLink={sortParam('volume_desc')}
					/>
				</div>

				{/* New Launches Section */}
				<div
					className="rounded-lg border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent p-6"
					aria-live="polite"
					aria-busy={isRefreshing || undefined}
				>
					<FeedSection
						title="New Launches"
						description="Keys deployed in last 7 days"
						icon={<Zap className="size-4 text-emerald-400" />}
						creators={newLaunches}
						isLoading={isLoading}
						viewAllLink={sortParam('newest')}
					/>
				</div>

				{/* Graduating Soon Section */}
				<div
					className="rounded-lg border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent p-6"
					aria-live="polite"
					aria-busy={isRefreshing || undefined}
				>
					<FeedSection
						title="Graduating Soon"
						description={`Within 10% of ${formatNumber(GRADUATION_SUPPLY)} supply milestone`}
						icon={<Target className="size-4 text-cyan-400" />}
						creators={graduatingSoon}
						isLoading={isLoading}
						viewAllLink="/marketplace"
					/>
					{graduatingSoon.length > 0 && (
						<div className="mt-4 text-xs text-white/50 space-y-2">
							{graduatingSoon.map(creator => {
								const currentSupply = creator.creatorShareSupply ?? 0;
								const remaining = Math.max(
									0,
									GRADUATION_SUPPLY - currentSupply
								);
								const percentRemaining = (
									(remaining / GRADUATION_SUPPLY) *
									100
								).toFixed(1);
								return (
									<div
										key={creator.id}
										className="flex items-center justify-between text-[0.7rem]"
									>
										<span className="truncate">{creator.title}</span>
										<span className="text-amber-400/70">
											{percentRemaining}% to graduation
										</span>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
