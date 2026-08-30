import { useQuery } from '@tanstack/react-query';
import { Users, Star, ArrowRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { courseService, type Course } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import { formatHolderCount } from '@/utils/numberFormat.utils';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import { cn } from '@/lib/utils';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

const skeletonBlockClass =
	'rounded-lg bg-white/12 skeleton-shimmer motion-reduce:bg-white/18 motion-reduce:ring-1 motion-reduce:ring-white/15';

function SpotlightSkeletonCard() {
	return (
		<div
			role="status"
			aria-label="Loading spotlight creator"
			className="relative overflow-hidden rounded-2xl border border-black/8 bg-white p-5"
		>
			<span className="sr-only">Loading spotlight creator</span>

			{/* Rank badge placeholder */}
			<div className={cn('mb-3 h-6 w-16 rounded-full', skeletonBlockClass)} />

			{/* Avatar */}
			<div className={cn('mb-4 aspect-square w-full rounded-xl', skeletonBlockClass)} />

			{/* Name */}
			<div className={cn('mb-2 h-5 w-3/5', skeletonBlockClass)} />

			{/* Stats row */}
			<div className="flex items-center justify-between">
				<div className={cn('h-4 w-20', skeletonBlockClass)} />
				<div className={cn('h-4 w-16', skeletonBlockClass)} />
			</div>
		</div>
	);
}

function SpotlightSkeletonGrid() {
	return (
		<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
			<SpotlightSkeletonCard />
			<SpotlightSkeletonCard />
			<SpotlightSkeletonCard />
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Card                                                              */
/* ------------------------------------------------------------------ */

interface SpotlightCreatorCardProps {
	creator: Course;
	rank: number;
}

function SpotlightCreatorCard({ creator, rank }: SpotlightCreatorCardProps) {
	const name = normalizeCreatorDisplayName(creator.title) || 'Unnamed creator';
	const keyPrice =
		creator.priceStroops != null
			? (creator.priceStroops / STROOPS_PER_XLM).toFixed(2)
			: creator.price.toFixed(2);
	const holderCount = creator.creatorShareSupply ?? 0;

	return (
		<Link
			to={`/creator/${creator.id}`}
			className="group relative block overflow-hidden rounded-2xl border border-black/8 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.15)]"
		>
			{/* Rank badge */}
			<div className="mb-3 flex items-center gap-1.5">
				{rank === 1 ? (
					<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-jakarta text-[10px] font-bold uppercase tracking-wider text-amber-700">
						<Star className="size-3 fill-amber-500 text-amber-500" />
						Top
					</span>
				) : (
					<span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-2.5 py-0.5 font-jakarta text-[10px] font-bold text-gray-500">
						#{rank}
					</span>
				)}
			</div>

			{/* Avatar */}
			<div className="relative mb-4 aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
				<CreatorInitialsAvatar
					name={name}
					creatorId={creator.id}
					imageSrc={creator.thumbnail}
					imageClassName="transition-transform duration-500 group-hover:scale-[1.03]"
				/>
			</div>

			{/* Name */}
			<h3 className="truncate font-jakarta text-base font-semibold text-gray-900">
				{name}
			</h3>

			{/* Stats row */}
			<div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
				{/* Key price */}
				<div className="flex items-center gap-1.5">
					<span className="font-jakarta text-sm font-semibold text-gray-900">
						{keyPrice}
					</span>
					<span className="font-jakarta text-[11px] text-gray-400">XLM</span>
				</div>

				{/* Holder count */}
				<div className="flex items-center gap-1.5 text-gray-400">
					<Users className="size-3.5" />
					<span className="font-mono text-[10px] tabular-nums">
						{formatHolderCount(holderCount)}
					</span>
				</div>
			</div>

			{/* CTA */}
			<div className="mt-3 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-gray-400 transition-colors group-hover:text-gray-900">
				View profile
				<ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
			</div>
		</Link>
	);
}

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export default function CreatorSpotlight() {
	const headingRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);

	const { data: creators, isLoading } = useQuery({
		queryKey: queryKeys.creators.list({ sort: 'volume_desc', limit: 3 }),
		queryFn: () => courseService.getCourses({ sort: 'volume_desc', limit: 3 }),
	});

	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-visible');
						observer.unobserve(entry.target);
					}
				});
			},
			{ threshold: 0.1 }
		);

		if (headingRef.current) observer.observe(headingRef.current);
		if (gridRef.current) observer.observe(gridRef.current);

		return () => observer.disconnect();
	}, []);

	// Hide section when no creators returned (AC: Section hidden when no creators)
	if (!isLoading && (!creators || creators.length < 1)) {
		return null;
	}

	return (
		<section className="bg-gradient-to-b from-white to-gray-50/50 px-6 py-20">
			<div className="mx-auto max-w-5xl">
				{/* Header */}
				<div ref={headingRef} className="scroll-reveal">
					<div className="flex items-center gap-2">
						<span className="size-1.5 rounded-full bg-amber-400" />
						<span className="font-jakarta text-sm font-medium text-amber-600">
							Creator Spotlight
						</span>
					</div>

					<div className="mt-3 flex items-end justify-between gap-6">
						<h2 className="font-pt-serif text-[clamp(1.6rem,3.5vw,2.4rem)] font-normal leading-[1.15]">
							<span className="text-gray-900">
								Most collected creators
							</span>
							<br />
							<span className="text-gray-400">
								discover who has the biggest following.
							</span>
						</h2>
						<Link
							to="/marketplace"
							className="mb-1 hidden shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-900 md:flex"
						>
							View all
							<ArrowRight className="size-3.5" />
						</Link>
					</div>
				</div>

				{/* Grid or Skeleton */}
				{isLoading ? (
					<div className="mt-10">
						<SpotlightSkeletonGrid />
					</div>
				) : (
					<div
						ref={gridRef}
						className="scroll-reveal mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
						style={{ animationDelay: '100ms' }}
					>
						{creators?.map((creator, index) => (
							<SpotlightCreatorCard
								key={creator.id}
								creator={creator}
								rank={index + 1}
							/>
						))}
					</div>
				)}
			</div>
		</section>
	);
}
