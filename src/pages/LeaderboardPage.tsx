import { useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw, Star } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { useLeaderboardRatings } from '@/hooks/useLeaderboardRatings';
import { useLeaderboardVolume } from '@/hooks/useLeaderboardVolume';
import type {
        RatingLeaderboardSort,
        VolumeWindow,
} from '@/services/leaderboard.service';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import {
        formatNumber,
        formatPercent,
        formatXlmPrice,
} from '@/utils/numberFormat.utils';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import { cn } from '@/lib/utils';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type LeaderboardView = 'ratings' | 'volume';

const VOLUME_WINDOWS: { value: VolumeWindow; label: string }[] = [
        { value: '24h', label: '24h' },
        { value: '7d', label: '7d' },
];

const RATING_SORT_OPTIONS: { value: RatingLeaderboardSort; label: string }[] = [
        { value: 'rating', label: 'Rating score' },
        { value: 'reviews', label: 'Review count' },
];

const MINIMUM_REVIEW_OPTIONS = [1, 5, 10, 25];

const skeletonBlockClass =
        'rounded-md bg-white/12 skeleton-shimmer motion-reduce:bg-white/18 motion-reduce:ring-1 motion-reduce:ring-white/15';

function formatRatingScore(value: number) {
        return formatNumber(value, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
        });
}

function getActiveView(searchParams: URLSearchParams): LeaderboardView {
        return searchParams.get('view') === 'volume' ? 'volume' : 'ratings';
}

function RatingStars({ rating }: { rating: number }) {
        const filledStars = Math.max(0, Math.min(5, Math.round(rating)));

        return (
                <div className="flex items-center gap-0.5" aria-hidden="true">
                        {Array.from({ length: 5 }).map((_, index) => (
                                <Star
                                        key={index}
                                        className={cn(
                                                'size-3.5',
                                                index < filledStars
                                                        ? 'fill-amber-400 text-amber-400'
                                                        : 'text-white/20'
                                        )}
                                />
                        ))}
                </div>
        );
}

function RatingsSkeletonRow() {
        return (
                <div className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-b-0">
                        <div className={cn('h-4 w-5 shrink-0', skeletonBlockClass)} />
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className={cn('size-9 shrink-0 rounded-full', skeletonBlockClass)} />
                                <div className="min-w-0 flex-1 space-y-2">
                                        <div className={cn('h-4 w-32', skeletonBlockClass)} />
                                        <div className={cn('h-3 w-20 sm:hidden', skeletonBlockClass)} />
                                </div>
                        </div>
                        <div className={cn('hidden h-4 w-28 shrink-0 sm:block', skeletonBlockClass)} />
                        <div className={cn('h-4 w-16 shrink-0', skeletonBlockClass)} />
                        <div className={cn('hidden h-4 w-20 shrink-0 md:block', skeletonBlockClass)} />
                </div>
        );
}

function VolumeSkeletonRow() {
        return (
                <div className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-b-0">
                        <div className={cn('h-4 w-5 shrink-0', skeletonBlockClass)} />
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className={cn('size-9 shrink-0 rounded-full', skeletonBlockClass)} />
                                <div className={cn('h-4 w-32', skeletonBlockClass)} />
                        </div>
                        <div className={cn('hidden h-4 w-16 shrink-0 sm:block', skeletonBlockClass)} />
                        <div className={cn('hidden h-4 w-14 shrink-0 md:block', skeletonBlockClass)} />
                        <div className={cn('hidden h-4 w-14 shrink-0 md:block', skeletonBlockClass)} />
                        <div className={cn('h-4 w-12 shrink-0', skeletonBlockClass)} />
                </div>
        );
}

function RatingsHeaderRow() {
        return (
                <div
                        aria-hidden="true"
                        className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                        <span className="w-5 shrink-0 text-right">#</span>
                        <span className="min-w-0 flex-1">Creator</span>
                        <span className="hidden w-28 shrink-0 sm:block">Rating</span>
                        <span className="w-16 shrink-0 text-right">Reviews</span>
                        <span className="hidden w-20 shrink-0 text-right md:block">Price</span>
                </div>
        );
}

function VolumeHeaderRow({ window }: { window: VolumeWindow }) {
        return (
                <div
                        aria-hidden="true"
                        className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                        <span className="w-5 shrink-0 text-right">#</span>
                        <span className="min-w-0 flex-1">Creator</span>
                        <span className="hidden w-20 shrink-0 text-right sm:block">Price</span>
                        <span className="hidden w-16 shrink-0 text-right md:block">24h Vol</span>
                        <span className="hidden w-16 shrink-0 text-right md:block">7d Vol</span>
                        <span className="w-16 shrink-0 text-right">Change ({window})</span>
                </div>
        );
}

interface RatingsRowProps {
        rank: number;
        name: string;
        thumbnail?: string;
        creatorId: string;
        price: number;
        averageRating: number;
        reviewCount: number;
}

function RatingsRow({
        rank,
        name,
        thumbnail,
        creatorId,
        price,
        averageRating,
        reviewCount,
}: RatingsRowProps) {
        return (
                <Link
                        to={`/creator/${creatorId}`}
                        className="flex items-center gap-4 border-b border-border px-4 py-3.5 transition-colors hover:bg-accent/40 last:border-b-0"
                        aria-label={`${name} — ${formatRatingScore(averageRating)} stars from ${formatNumber(
                                reviewCount
                        )} reviews`}
                >
                        <span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                                {rank}
                        </span>

                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className="size-9 shrink-0 overflow-hidden rounded-full bg-muted">
                                        <CreatorInitialsAvatar
                                                name={name}
                                                creatorId={creatorId}
                                                imageSrc={thumbnail}
                                        />
                                </div>
                                <div className="min-w-0 flex-1">
                                        <span className="block truncate font-jakarta text-sm font-medium">
                                                {name}
                                        </span>
                                        <span className="text-xs text-muted-foreground sm:hidden">
                                                {formatRatingScore(averageRating)} stars
                                        </span>
                                </div>
                        </div>

                        <div
                                className="hidden w-28 shrink-0 sm:block"
                                aria-label={`${formatRatingScore(averageRating)} out of 5 stars`}
                        >
                                <div className="flex items-center gap-2">
                                        <RatingStars rating={averageRating} />
                                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                                {formatRatingScore(averageRating)}
                                        </span>
                                </div>
                        </div>

                        <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                                {formatNumber(reviewCount)}
                        </span>

                        <span className="hidden w-20 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground md:block">
                                {formatXlmPrice(price)}
                        </span>
                </Link>
        );
}

interface VolumeRowProps {
        rank: number;
        name: string;
        thumbnail?: string;
        creatorId: string;
        price: number;
        volume24h: number;
        volume7d: number;
        change24h: number;
        activeWindow: VolumeWindow;
}

function VolumeRow({
        rank,
        name,
        thumbnail,
        creatorId,
        price,
        volume24h,
        volume7d,
        change24h,
        activeWindow,
}: VolumeRowProps) {
        const changeColor =
                change24h > 0
                        ? 'text-emerald-600'
                        : change24h < 0
                                ? 'text-red-500'
                                : 'text-muted-foreground';

        return (
                <Link
                        to={`/creator/${creatorId}`}
                        className="flex items-center gap-4 border-b border-border px-4 py-3.5 transition-colors hover:bg-accent/40 last:border-b-0"
                        aria-label={`${name} — rank ${rank}`}
                >
                        <span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                                {rank}
                        </span>

                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className="size-9 shrink-0 overflow-hidden rounded-full bg-muted">
                                        <CreatorInitialsAvatar
                                                name={name}
                                                creatorId={creatorId}
                                                imageSrc={thumbnail}
                                        />
                                </div>
                                <span className="min-w-0 truncate font-jakarta text-sm font-medium">
                                        {name}
                                </span>
                        </div>

                        <span className="hidden w-20 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground sm:block">
                                {formatXlmPrice(price)}
                        </span>

                        <span
                                className={cn(
                                        'hidden w-16 shrink-0 text-right font-mono text-xs tabular-nums md:block',
                                        activeWindow === '24h'
                                                ? 'font-semibold text-foreground'
                                                : 'text-muted-foreground'
                                )}
                        >
                                {formatNumber(volume24h, { style: 'compact' })}
                        </span>

                        <span
                                className={cn(
                                        'hidden w-16 shrink-0 text-right font-mono text-xs tabular-nums md:block',
                                        activeWindow === '7d'
                                                ? 'font-semibold text-foreground'
                                                : 'text-muted-foreground'
                                )}
                        >
                                {formatNumber(volume7d, { style: 'compact' })}
                        </span>

                        <span
                                className={cn(
                                        'w-16 shrink-0 text-right font-mono text-xs tabular-nums',
                                        changeColor
                                )}
                        >
                                {formatPercent(change24h, { signed: true })}
                        </span>
                </Link>
        );
}

export default function LeaderboardPage() {
        useNavigationTiming('leaderboard');
        useDocumentTitle('Leaderboard — AccessLayer');

        const [searchParams, setSearchParams] = useSearchParams();
        const activeView = getActiveView(searchParams);
        const [activeWindow, setActiveWindow] = useState<VolumeWindow>('24h');
        const [sortBy, setSortBy] = useState<RatingLeaderboardSort>('rating');
        const [minimumReviewCount, setMinimumReviewCount] = useState(5);

        const {
                data: ratingEntries,
                isLoading: isRatingsLoading,
                isFetching: isRatingsFetching,
        } = useLeaderboardRatings({ enabled: activeView === 'ratings' });
        const {
                data: volumeEntries,
                isLoading: isVolumeLoading,
                isFetching: isVolumeFetching,
        } = useLeaderboardVolume(activeWindow, { enabled: activeView === 'volume' });

        const filteredRatingEntries = useMemo(() => {
                return [...(ratingEntries ?? [])]
                        .filter(entry => entry.reviewCount >= minimumReviewCount)
                        .sort((left, right) => {
                                if (sortBy === 'reviews' && right.reviewCount !== left.reviewCount) {
                                        return right.reviewCount - left.reviewCount;
                                }

                                if (right.averageRating !== left.averageRating) {
                                        return right.averageRating - left.averageRating;
                                }

                                if (right.reviewCount !== left.reviewCount) {
                                        return right.reviewCount - left.reviewCount;
                                }

                                return left.title.localeCompare(right.title);
                        })
                        .map((entry, index) => ({
                                ...entry,
                                rank: index + 1,
                        }));
        }, [minimumReviewCount, ratingEntries, sortBy]);

        const isRatingsView = activeView === 'ratings';
        const isLoading = isRatingsView ? isRatingsLoading : isVolumeLoading;
        const isRefreshing = isRatingsView
                ? isRatingsFetching && !isRatingsLoading
                : isVolumeFetching && !isVolumeLoading;
        const hasEntries = isRatingsView
                ? filteredRatingEntries.length > 0
                : (volumeEntries?.length ?? 0) > 0;

        const handleViewChange = (view: LeaderboardView) => {
                const nextSearchParams = new URLSearchParams(searchParams);

                if (view === 'volume') {
                        nextSearchParams.set('view', 'volume');
                } else {
                        nextSearchParams.delete('view');
                }

                setSearchParams(nextSearchParams, { replace: true });
        };

        return (
                <main className="mx-auto max-w-3xl px-6 py-16">
                        <Link
                                to="/"
                                className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                        >
                                <ArrowLeft className="size-3.5" />
                                Back to home
                        </Link>

                        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                                <div>
                                        <h1 className="font-jakarta text-2xl font-semibold">Leaderboard</h1>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                                {isRatingsView
                                                        ? 'Rank creator keys by aggregate holder rating and review depth.'
                                                        : 'Track creator keys by trading volume and price momentum.'}
                                        </p>
                                </div>

                                <span
                                        role="status"
                                        aria-live="polite"
                                        aria-busy={isRefreshing || undefined}
                                        data-testid="leaderboard-refresh-status"
                                        className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                                >
                                        {isRefreshing ? (
                                                <RefreshCw
                                                        className="size-3 animate-spin motion-reduce:animate-none"
                                                        aria-hidden="true"
                                                />
                                        ) : (
                                                <span
                                                        className="size-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none"
                                                        aria-hidden="true"
                                                />
                                        )}
                                        {isRefreshing
                                                ? 'Refreshing…'
                                                : isRatingsView
                                                        ? 'Updates every 5m'
                                                        : 'Updates every 60s'}
                                </span>
                        </div>

                        <div
                                role="tablist"
                                aria-label="Leaderboard view"
                                className="mb-5 inline-flex overflow-hidden rounded-lg border border-border"
                        >
                                <button
                                        type="button"
                                        role="tab"
                                        aria-selected={isRatingsView}
                                        onClick={() => handleViewChange('ratings')}
                                        className={cn(
                                                'px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                isRatingsView
                                                        ? 'bg-foreground text-background'
                                                        : 'text-muted-foreground hover:text-foreground'
                                        )}
                                >
                                        Ratings
                                </button>
                                <button
                                        type="button"
                                        role="tab"
                                        aria-selected={!isRatingsView}
                                        onClick={() => handleViewChange('volume')}
                                        className={cn(
                                                'px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                !isRatingsView
                                                        ? 'bg-foreground text-background'
                                                        : 'text-muted-foreground hover:text-foreground'
                                        )}
                                >
                                        Volume
                                </button>
                        </div>

                        {isRatingsView ? (
                                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                        <div
                                                role="group"
                                                aria-label="Ratings sort"
                                                className="inline-flex overflow-hidden rounded-lg border border-border"
                                        >
                                                {RATING_SORT_OPTIONS.map(option => (
                                                        <button
                                                                key={option.value}
                                                                type="button"
                                                                onClick={() => setSortBy(option.value)}
                                                                aria-pressed={sortBy === option.value}
                                                                className={cn(
                                                                        'px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                                        sortBy === option.value
                                                                                ? 'bg-foreground text-background'
                                                                                : 'text-muted-foreground hover:text-foreground'
                                                                )}
                                                        >
                                                                {option.label}
                                                        </button>
                                                ))}
                                        </div>

                                        <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Min reviews
                                                <select
                                                        value={minimumReviewCount}
                                                        onChange={event =>
                                                                setMinimumReviewCount(
                                                                        Number(event.target.value)
                                                                )
                                                        }
                                                        className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                                                        aria-label="Minimum review count"
                                                >
                                                        {MINIMUM_REVIEW_OPTIONS.map(option => (
                                                                <option key={option} value={option}>
                                                                        {option}+
                                                                </option>
                                                        ))}
                                                </select>
                                        </label>
                                </div>
                        ) : (
                                <div
                                        role="group"
                                        aria-label="Volume ranking window"
                                        className="mb-5 inline-flex overflow-hidden rounded-lg border border-border"
                                >
                                        {VOLUME_WINDOWS.map(({ value, label }) => (
                                                <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => setActiveWindow(value)}
                                                        aria-pressed={activeWindow === value}
                                                        className={cn(
                                                                'px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                                activeWindow === value
                                                                        ? 'bg-foreground text-background'
                                                                        : 'text-muted-foreground hover:text-foreground'
                                                        )}
                                                >
                                                        {label}
                                                </button>
                                        ))}
                                </div>
                        )}

                        {isLoading && (
                                <div
                                        role="status"
                                        aria-label="Loading leaderboard"
                                        className="overflow-hidden rounded-xl border border-border"
                                >
                                        <span className="sr-only">Loading leaderboard</span>
                                        {Array.from({ length: 20 }).map((_, index) =>
                                                isRatingsView ? (
                                                        <RatingsSkeletonRow key={index} />
                                                ) : (
                                                        <VolumeSkeletonRow key={index} />
                                                )
                                        )}
                                </div>
                        )}

                        {!isLoading && !hasEntries && (
                                <div className="flex flex-col items-center gap-3 rounded-xl border border-border py-16 text-center">
                                        <p className="text-sm text-muted-foreground">
                                                {isRatingsView
                                                        ? `No keys meet the ${minimumReviewCount}+ review threshold.`
                                                        : 'No leaderboard data available.'}
                                        </p>
                                </div>
                        )}

                        {!isLoading && hasEntries && (
                                <div
                                        className="overflow-hidden rounded-xl border border-border"
                                        aria-label={
                                                isRatingsView
                                                        ? 'Ratings leaderboard'
                                                        : 'Trading volume leaderboard'
                                        }
                                >
                                        {isRatingsView ? (
                                                <>
                                                        <RatingsHeaderRow />
                                                        {filteredRatingEntries.map(entry => (
                                                                <RatingsRow
                                                                        key={entry.id}
                                                                        rank={entry.rank}
                                                                        name={
                                                                                normalizeCreatorDisplayName(
                                                                                        entry.title
                                                                                ) ||
                                                                                'Unnamed creator'
                                                                        }
                                                                        thumbnail={entry.thumbnail}
                                                                        creatorId={entry.id}
                                                                        price={entry.price}
                                                                        averageRating={entry.averageRating}
                                                                        reviewCount={entry.reviewCount}
                                                                />
                                                        ))}
                                                </>
                                        ) : (
                                                <>
                                                        <VolumeHeaderRow window={activeWindow} />
                                                        {volumeEntries?.map(entry => (
                                                                <VolumeRow
                                                                        key={entry.id}
                                                                        rank={entry.rank}
                                                                        name={
                                                                                normalizeCreatorDisplayName(
                                                                                        entry.title
                                                                                ) ||
                                                                                'Unnamed creator'
                                                                        }
                                                                        thumbnail={entry.thumbnail}
                                                                        creatorId={entry.id}
                                                                        price={entry.price}
                                                                        volume24h={
                                                                                entry.volume24h ??
                                                                                entry.totalVolume
                                                                        }
                                                                        volume7d={entry.volume7d ?? 0}
                                                                        change24h={entry.change24h}
                                                                        activeWindow={activeWindow}
                                                                />
                                                        ))}
                                                </>
                                        )}
                                </div>
                        )}
                </main>
        );
}
