import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { useSearchParams } from 'react-router';
import { courseService, type Course } from '@/services/course.service';
import SkipToContent from '@/components/common/SkipToContent';
import { cn } from '@/lib/utils';
import SearchBar from '@/components/common/SearchBar';
import StickyFilterBar from '@/components/common/StickyFilterBar';
import CreatorCard from '@/components/common/CreatorCard';
import {
	CreatorGridSkeleton,
	CreatorHoldingsListSkeleton,
	CreatorProfileHeaderSkeleton,
} from '@/components/common/CreatorSkeleton';
import EmptyState from '@/components/common/EmptyState';
import EmptySearchSuggestions from '@/components/common/EmptySearchSuggestions';
import SectionDivider from '@/components/common/SectionDivider';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { UnavailableAction } from '@/components/ui/unavailable-action';
import SectionHeading from '@/components/common/SectionHeading';
import CompactSectionSubtitle from '@/components/common/CompactSectionSubtitle';
import CreatorProfileInfoGrid from '@/components/common/CreatorProfileInfoGrid';
import CreatorLabeledStatRow from '@/components/common/CreatorLabeledStatRow';
import MiniStatChip from '@/components/common/MiniStatChip';
import MarketplaceSection from '@/components/common/MarketplaceSection';
import { ProfileTabPillGroup } from '@/components/common/ProfileTabPill';
import CreatorBreadcrumb from '@/components/common/CreatorBreadcrumb';
import CreatorProfileHeader from '@/components/common/CreatorProfileHeader';
import TransactionRetryNotice from '@/components/common/TransactionRetryNotice';
import EmptyTransactionTimelineState from '@/components/common/EmptyTransactionTimelineState';
import TradeDialog, { type TradeSide } from '@/components/common/TradeDialog';
import NetworkMismatchBanner from '@/components/common/NetworkMismatchBanner';
import StellarConnectionQualityBadge from '@/components/common/StellarConnectionQualityBadge';
import { useNetworkMismatch } from '@/hooks/useNetworkMismatch';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import { formatCompactNumber, formatNumber } from '@/utils/numberFormat.utils';
import { formatOwnershipPercent } from '@/utils/ownership.utils';
import PrecisionModeToggle, {
	type PrecisionMode,
} from '@/components/common/PrecisionModeToggle';
import ScrollToTop from '@/components/common/ScrollToTop';
import SectionErrorBoundary from '@/components/common/SectionErrorBoundary';
import StaleDataWarning from '@/components/common/StaleDataWarning';
import { useScrollPreservation } from '@/hooks/useScrollPreservation';
import { useStaleData } from '@/hooks/useStaleData';
import { useIdleRefreshPrompt } from '@/hooks/useIdleRefreshPrompt';
import IdleRefreshPrompt from '@/components/common/IdleRefreshPrompt';
import {
	CREATOR_CARD_ENTRY_CLASS,
	creatorCardEntryStyle,
} from '@/utils/cardEntryAnimation.utils';
import {
	formatDisplayKeyPrice,
	resolveCreatorKeyPriceStroops,
} from '@/utils/keyPriceDisplay.utils';
import {
	calculatePortfolioValue,
	formatPortfolioValueDisplay,
	getPortfolioValueHelperText,
} from '@/utils/portfolioValue.utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { CREATOR_LIST_SORT_LAYOUT_TRANSITION } from '@/utils/creatorListSortTransition';
import { AlertCircle, ChevronDown, RefreshCw } from 'lucide-react';
import ClearedFiltersEmptyState from '@/components/common/ClearedFiltersEmptyState';
import CreatorListPagination from '@/components/common/CreatorListPagination';
import CreatorListGroupSeparator from '@/components/common/CreatorListGroupSeparator';
import MarketplaceSidebar from '@/components/common/MarketplaceSidebar';

const FEATURED_CREATOR_FACTS = [
	{ label: 'Membership', value: 'Collectors Circle' },
	{ label: 'Drop cadence', value: 'Weekly releases' },
	{ label: 'Focus', value: 'Illustration and motion' },
	{ label: 'Community', value: 'Private behind-the-scenes notes' },
];

const FEATURED_CREATOR_FOLLOWER_COUNT: number | null = null;
const FEATURED_CREATOR_KEY_HOLDER_COUNT = 0;

const getFeaturedCreatorKeyHolderCopy = (count: number | null) => {
	if (count == null) {
		return {
			value: 'Key holders unavailable',
			explanation: 'Key holder data is not available yet.',
		};
	}

	if (count === 0) {
		return {
			value: 'No key holders yet',
			explanation:
				'This creator has not unlocked any key holders yet. Be the first to buy a key and start the collector base.',
		};
	}

	return {
		value: `${formatCompactNumber(count)} key holders`,
		explanation: 'Number of wallets that currently hold at least one key.',
	};
};

// Fallback demo data in case API fails
const DEMO_CREATORS: Course[] = [
	{
		id: '1',
		title: 'Alex Rivers',
		description: 'Digital Artist & Illustrator',
		price: 0.05,
		priceStroops: 500_000,
		nextDropAt: new Date(Date.now() + 86_400_000).toISOString(),
		creatorShareSupply: 120,
		instructorId: 'arivers',
		category: 'Art',
		level: 'BEGINNER',
		isVerified: true,
		isPinned: true,
		thumbnail:
			'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
	},
	{
		id: '2',
		title: 'Sarah Chen',
		description: 'Solidity Developer',
		price: 0.12,
		priceStroops: 1_200_000,
		creatorShareSupply: 64,
		instructorId: 'schen_dev',
		category: 'Tech',
		level: 'ADVANCED',
		isVerified: true,
		isPinned: true,
		thumbnail:
			'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
	},
	{
		id: '3',
		title: 'Marcus Thorne',
		description: 'Crypto Strategist',
		price: 0.08,
		creatorShareSupply: 88,
		instructorId: 'mthorne',
		category: 'Finance',
		level: 'INTERMEDIATE',
		isVerified: false,
		thumbnail:
			'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
	},
	{
		id: '4',
		title: 'Elena Vance',
		description: 'UI/UX Designer',
		price: 0.04,
		priceStroops: 400_000,
		nextDropAt: new Date(Date.now() + 3_600_000).toISOString(),
		creatorShareSupply: 150,
		instructorId: 'evance_design',
		category: 'Design',
		level: 'BEGINNER',
		isVerified: true,
		thumbnail:
			'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
	},
	{
		id: '5',
		title: 'David Kojo',
		description: 'Music Producer',
		price: 0.15,
		creatorShareSupply: 42,
		instructorId: 'dkojo_beats',
		category: 'Music',
		level: 'ADVANCED',
		isVerified: false,
		thumbnail:
			'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
	},
	{
		id: '6',
		title: 'Yuki Sato',
		description: 'Motion Designer',
		price: 0.07,
		creatorShareSupply: 96,
		instructorId: 'yuki_s',
		category: 'Design',
		level: 'INTERMEDIATE',
		isVerified: true,
		thumbnail:
			'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
	},
];

const CREATOR_SORT_KEY = 'accesslayer.creator-sort';
const CREATOR_PAGE_KEY = 'accesslayer.creator-page';
const CREATOR_SCROLL_KEY = 'accesslayer.creator-scrollY';
const MAX_CREATOR_FETCH_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 800;
const PAGE_SIZE = 6;
const FETCH_RETRY_ACTION_LABEL = 'Try again';
const DEMO_HELD_KEY_QUANTITIES = [0, 2, 1] as const;
const FINAL_FETCH_ERROR_COPY =
	'Unable to load live creators right now. Showing fallback creators.';
const CREATOR_REFRESH_SHORTCUT_LABEL = 'Ctrl/Cmd + Alt + R';
const CREATOR_REFRESH_SHORTCUT_DURATION_MS = 1800;

const getFetchRetryHelperCopy = (attempt: number, maxAttempts: number) =>
	`We couldn't load live creators yet. Retrying automatically (attempt ${attempt} of ${maxAttempts}).`;

const isEditableShortcutTarget = (target: EventTarget | null) => {
	if (!(target instanceof Element)) return false;

	let element: Element | null = target;
	while (element) {
		if (
			element.matches('input, textarea, select, [role="textbox"]') ||
			(element instanceof HTMLElement && element.isContentEditable)
		) {
			return true;
		}
		element = element.parentElement;
	}

	return false;
};

const isCreatorRefreshShortcut = (event: KeyboardEvent) =>
	(event.ctrlKey || event.metaKey) &&
	event.altKey &&
	!event.shiftKey &&
	event.key.toLowerCase() === 'r';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'supply-desc';

interface CreatorProfileLoadErrorProps {
	onRetry: () => void;
	isRetrying: boolean;
}

const CreatorProfileLoadError: React.FC<CreatorProfileLoadErrorProps> = ({
	onRetry,
	isRetrying,
}) => (
	<div
		role="alert"
		aria-live="polite"
		className="marketplace-card-surface flex min-h-[18rem] flex-col items-center justify-center rounded-[2rem] border p-6 text-center shadow-[0_24px_80px_-60px_rgba(8,17,31,0.95)] md:p-8"
	>
		<div className="mb-4 rounded-full border border-red-400/25 bg-red-500/10 p-3 text-red-200">
			<AlertCircle className="size-6" aria-hidden="true" />
		</div>
		<h2 className="font-grotesque text-2xl font-black tracking-tight text-white">
			Unable to load this creator profile
		</h2>
		<p className="mt-2 max-w-md font-jakarta text-sm leading-relaxed text-white/60">
			We couldn't load the latest profile details. Check your connection and
			try again.
		</p>
		<Button
			type="button"
			variant="outline"
			onClick={onRetry}
			disabled={isRetrying}
			className="mt-5 rounded-xl border-white/10 bg-white/5 px-5 font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10"
		>
			<RefreshCw
				className={isRetrying ? 'size-4 animate-spin' : 'size-4'}
				aria-hidden="true"
			/>
			{isRetrying ? 'Retrying...' : 'Retry'}
		</Button>
	</div>
);

function LandingPage() {
	const [creators, setCreators] = useState<Course[]>([]);
	// Last successful fetch timestamp (#301). `null` means we've never
	// resolved a load yet — the staleness helper treats that as "stale"
	// so the warning surfaces if the load hangs.
	const [creatorsFetchedAt, setCreatorsFetchedAt] = useState<number | null>(
		null
	);
	const { isMismatch: isNetworkMismatch } = useNetworkMismatch();
	const [isLoading, setIsLoading] = useState(true);
	const [isFilterLoading, setIsFilterLoading] = useState(false);
	const [searchParams, setSearchParams] = useSearchParams();
	const [searchQuery, setSearchQuery] = useState('');
	const searchQueryRef = useRef<string>('');
	const sortOptionRef = useRef<SortOption>('featured');
	const PROFILE_TABS = ['overview', 'creations', 'collectors', 'activity'];
	const [activeProfileTab, setActiveProfileTab] = useState(() => {
		if (typeof window === 'undefined') return 'overview';
		const hash = window.location.hash.slice(1);
		return PROFILE_TABS.includes(hash) ? hash : 'overview';
	});
	const [featuredHoldings, setFeaturedHoldings] = useState(3);
	const [precisionMode, setPrecisionMode] = useState<PrecisionMode>('compact');
	const [tradeSide, setTradeSide] = useState<TradeSide>('buy');
	const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
	const [tradeSubmitting, setTradeSubmitting] = useState(false);
	const prefersReducedMotion = usePrefersReducedMotion();
	const [sortOption, setSortOption] = useState<SortOption>(() => {
		const sort = searchParams.get('sort') as SortOption | null;
		if (sort && ['featured', 'price-asc', 'price-desc', 'supply-desc'].includes(sort)) {
			sortOptionRef.current = sort;
			return sort;
		}
		if (typeof window !== 'undefined') {
			const saved = window.localStorage.getItem(
				CREATOR_SORT_KEY
			) as SortOption | null;
			if (saved) {
				sortOptionRef.current = saved;
				return saved;
			}
		}
		return 'featured';
	});
	const [fetchRetryAttempt, setFetchRetryAttempt] = useState(0);
	const [fetchRequestId, setFetchRequestId] = useState(0);
	const [showRetryBanner, setShowRetryBanner] = useState(false);
	const [finalFetchError, setFinalFetchError] = useState('');
	// Simulated background key-price refresh (#305). A real implementation
	// would be driven by a WebSocket or polling hook; here we flip the flag
	// on a fixed cadence so the card's loading state is observable until that
	// pipeline lands. `prefers-reduced-motion` disables the simulation so we
	// don't surface a non-essential animation to users who opted out.
	const [isPriceRefreshing, setIsPriceRefreshing] = useState(false);
	const [showShortcutConfirmation, setShowShortcutConfirmation] =
		useState(false);
	const [page, setPage] = useState(() => {
		if (typeof window === 'undefined') return 0;
		const saved = window.sessionStorage.getItem(CREATOR_PAGE_KEY);
		const parsed = saved ? Number(saved) : 0;
		return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
	});
	const pendingScrollRestoreRef = useRef<number | null>(null);
	const shortcutConfirmationTimerRef = useRef<number | null>(null);

	// Keep refs in sync with state
	useEffect(() => {
		searchQueryRef.current = searchQuery;
	}, [searchQuery]);

	useEffect(() => {
		sortOptionRef.current = sortOption;
	}, [sortOption]);

	// Use scroll preservation for profile tabs
	useScrollPreservation(activeProfileTab, {
		storageKey: 'accesslayer.profile-tab-scroll',
		enabled: true,
		restoreDelay: 100, // Small delay to ensure tab content is rendered
	});

	const trimmedSearchQuery = searchQuery.trim();
	const hasInvalidSearchInput = /[^a-zA-Z0-9_\s-]/.test(trimmedSearchQuery);
	const searchValidationMessage = hasInvalidSearchInput
		? 'Only letters, numbers, spaces, hyphens, and underscores are supported.'
		: undefined;

	useEffect(() => {
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(CREATOR_SORT_KEY, sortOption);
		}
	}, [sortOption]);

	useEffect(() => {
		const newParams = new URLSearchParams(searchParams);
		if (searchQuery.trim()) {
			newParams.set('q', searchQuery.trim());
		} else {
			newParams.delete('q');
		}
		if (sortOption !== 'featured') {
			newParams.set('sort', sortOption);
		} else {
			newParams.delete('sort');
		}
		setSearchParams(newParams, { replace: true });
	}, [searchQuery, sortOption, searchParams, setSearchParams]);

	useEffect(() => {
		const q = searchParams.get('q');
		if (q !== null && q !== searchQueryRef.current) {
			setSearchQuery(q);
		} else if (q === null && searchQueryRef.current !== '') {
			setSearchQuery('');
		}
		const sort = searchParams.get('sort') as SortOption | null;
		if (sort && ['featured', 'price-asc', 'price-desc', 'supply-desc'].includes(sort) && sort !== sortOptionRef.current) {
			setSortOption(sort);
		} else if (sort === null && sortOptionRef.current !== 'featured') {
			setSortOption('featured');
		}
	}, [searchParams]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		window.sessionStorage.setItem(CREATOR_PAGE_KEY, String(page));
	}, [page]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const handleScroll = () => {
			window.sessionStorage.setItem(
				CREATOR_SCROLL_KEY,
				String(window.scrollY)
			);
		};
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const savedScroll = window.sessionStorage.getItem(CREATOR_SCROLL_KEY);
		if (!savedScroll) return;
		const parsed = Number(savedScroll);
		if (!Number.isFinite(parsed)) return;
		window.scrollTo({ top: parsed });
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const reduceMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches;
		if (reduceMotion) return;
		// Every 30s, simulate an ~800ms in-flight refresh.
		const intervalId = window.setInterval(() => {
			setIsPriceRefreshing(true);
			window.setTimeout(() => setIsPriceRefreshing(false), 800);
		}, 30_000);
		return () => window.clearInterval(intervalId);
	}, []);

	useEffect(() => {
		return () => {
			if (shortcutConfirmationTimerRef.current != null) {
				window.clearTimeout(shortcutConfirmationTimerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		const fetchCreators = async () => {
			setIsLoading(true);
			setShowRetryBanner(false);
			setFinalFetchError('');
			try {
				const data = await courseService.getCourses();
				if (data && data.length > 0) {
					setCreators(data);
				} else {
					setCreators(DEMO_CREATORS);
				}
				// Track the last successful fetch so the stale-data warning
				// has a baseline to compare against (#301).
				setCreatorsFetchedAt(Date.now());
				setFetchRetryAttempt(0);
			} catch {
				if (fetchRetryAttempt < MAX_CREATOR_FETCH_RETRIES) {
					const nextAttempt = fetchRetryAttempt + 1;
					setShowRetryBanner(true);
					const backoffDelay = Math.min(
						BASE_RETRY_DELAY_MS * 2 ** fetchRetryAttempt,
						5000
					);
					window.setTimeout(
						() => setFetchRetryAttempt(nextAttempt),
						backoffDelay
					);
					return;
				}

				setFinalFetchError(FINAL_FETCH_ERROR_COPY);
				setShowRetryBanner(false);
				setFetchRetryAttempt(0);
				setCreators(DEMO_CREATORS);
			} finally {
				setTimeout(() => setIsLoading(false), 800);
			}
		};

		fetchCreators();
	}, [fetchRetryAttempt, fetchRequestId]);

	const searchSuggestions = useMemo(() => {
		const fromCategories = creators
			.map(creator => creator.category)
			.filter((category): category is string => Boolean(category));
		// Categories are the most useful prefilled query because they reliably
		// match creator entries; fall back to a sensible default list when the
		// dataset is too sparse to suggest anything contextual.
		if (fromCategories.length > 0) return fromCategories;
		return ['Art', 'Tech', 'Music', 'Design'];
	}, [creators]);

	const filteredCreators = useMemo(() => {
		if (hasInvalidSearchInput) {
			return [];
		}

		const filtered = creators.filter(
			creator =>
				creator.title
					.toLowerCase()
					.includes(trimmedSearchQuery.toLowerCase()) ||
				creator.instructorId
					.toLowerCase()
					.includes(trimmedSearchQuery.toLowerCase())
		);
		const sorted = [...filtered];
		const priceOf = (creator: Course) =>
			resolveCreatorKeyPriceStroops(creator) ?? 0;

		switch (sortOption) {
			case 'price-asc':
				sorted.sort((a, b) => priceOf(a) - priceOf(b));
				break;
			case 'price-desc':
				sorted.sort((a, b) => priceOf(b) - priceOf(a));
				break;
			case 'supply-desc':
				sorted.sort(
					(a, b) =>
						(b.creatorShareSupply ?? 0) - (a.creatorShareSupply ?? 0)
				);
				break;
			default:
				break;
		}
		return sorted;
	}, [creators, trimmedSearchQuery, hasInvalidSearchInput, sortOption]);

	// Add loading state for filter changes
	useEffect(() => {
		if (creators.length === 0) return; // Don't show filter loading during initial load

		setIsFilterLoading(true);
		const timer = setTimeout(() => {
			setIsFilterLoading(false);
		}, 300); // Short delay to show loading indicator

		return () => clearTimeout(timer);
	}, [trimmedSearchQuery, sortOption, creators.length]);

	useEffect(() => {
		setPage(0);
	}, [trimmedSearchQuery, sortOption]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredCreators.length / PAGE_SIZE)
	);
	const safePage = Math.min(page, totalPages - 1);
	const pagedCreators = useMemo(() => {
		const start = safePage * PAGE_SIZE;
		return filteredCreators.slice(start, start + PAGE_SIZE);
	}, [filteredCreators, safePage]);
	const featuredCreatorKeyHolderCopy = getFeaturedCreatorKeyHolderCopy(
		FEATURED_CREATOR_KEY_HOLDER_COUNT
	);

	// Choose the featured creator from live data when available, otherwise
	// fall back to the demo featured creator. This keeps the profile panel
	// reactive to backend updates (supply, price, etc.).
	const featuredCreator = creators.length > 0 ? creators[0] : DEMO_CREATORS[0];

	useEffect(() => {
		if (pendingScrollRestoreRef.current == null) return;
		const target = pendingScrollRestoreRef.current;
		pendingScrollRestoreRef.current = null;
		requestAnimationFrame(() => {
			window.scrollTo({ top: target });
		});
	}, [safePage, pagedCreators.length]);

	const handlePageChange = (nextPage: number) => {
		pendingScrollRestoreRef.current = window.scrollY;
		setPage(nextPage);
	};

	const handleResetSearch = () => setSearchQuery('');

	const handleRetryCreatorFetch = useCallback(() => {
		setFinalFetchError('');
		setShowRetryBanner(false);
		setFetchRetryAttempt(0);
		setFetchRequestId(requestId => requestId + 1);
	}, []);

	const showCreatorRefreshShortcutConfirmation = useCallback(() => {
		if (shortcutConfirmationTimerRef.current != null) {
			window.clearTimeout(shortcutConfirmationTimerRef.current);
		}

		setShowShortcutConfirmation(true);
		shortcutConfirmationTimerRef.current = window.setTimeout(() => {
			setShowShortcutConfirmation(false);
			shortcutConfirmationTimerRef.current = null;
		}, CREATOR_REFRESH_SHORTCUT_DURATION_MS);
	}, []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.repeat ||
				!isCreatorRefreshShortcut(event) ||
				isEditableShortcutTarget(event.target)
			) {
				return;
			}

			event.preventDefault();
			handleRetryCreatorFetch();
			showCreatorRefreshShortcutConfirmation();
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleRetryCreatorFetch, showCreatorRefreshShortcutConfirmation]);

	// Stale-data detection (#301). 60s freshness window; when we cross it,
	// the hook fires a background refresh exactly once until the next
	// successful fetch resets the baseline.
	const { stale: creatorsAreStale, ageMs: creatorsAgeMs } = useStaleData(
		creatorsFetchedAt,
		{
			thresholdMs: 60_000,
			onStale: handleRetryCreatorFetch,
		}
	);

	// Idle-refresh prompt: after 5 minutes of inactivity, show a subtle
	// banner offering to refresh the creator list. Any user interaction
	// dismisses it automatically without refreshing.
	const {
		isPromptVisible: isIdlePromptVisible,
		dismissPrompt: dismissIdlePrompt,
		resetTimer: resetIdleTimer,
	} = useIdleRefreshPrompt({ thresholdMs: 5 * 60 * 1000 });

	const handleIdleRefresh = () => {
		resetIdleTimer();
		handleRetryCreatorFetch();
	};

	const heldKeyPositions = useMemo(
		() =>
			creators.map((creator, index) => ({
				creatorId: creator.id,
				quantity:
					index === 0
						? featuredHoldings
						: (DEMO_HELD_KEY_QUANTITIES[index] ?? 0),
				priceStroops: creator.priceStroops,
				price: creator.price,
				isPriceLoading: isPriceRefreshing,
				isPriceStale: creatorsAreStale,
			})),
		[creators, creatorsAreStale, featuredHoldings, isPriceRefreshing]
	);
	const portfolioValue = useMemo(
		() => calculatePortfolioValue(heldKeyPositions),
		[heldKeyPositions]
	);
	const displayedPortfolioValue = isLoading
		? {
				...portfolioValue,
				status: 'loading' as const,
				totalStroops: null,
			}
		: portfolioValue;
	const portfolioValueDisplay = formatPortfolioValueDisplay(
		displayedPortfolioValue
	);
	const portfolioValueHelperText = getPortfolioValueHelperText(
		displayedPortfolioValue
	);

	const openTradeDialog = (side: TradeSide) => {
		setTradeSide(side);
		setTradeDialogOpen(true);
	};

	const handleConfirmTrade = async (amount: number) => {
		const previousHoldings = featuredHoldings;
		setTradeSubmitting(true);

		try {
			showToast.loading(
				tradeSide === 'buy'
					? `Submitting buy for ${amount} key${amount === 1 ? '' : 's'}...`
					: `Submitting sell for ${amount} key${amount === 1 ? '' : 's'}...`
			);

			await new Promise<void>(resolve => window.setTimeout(resolve, 900));

			setFeaturedHoldings(current =>
				tradeSide === 'buy'
					? current + amount
					: Math.max(0, current - amount)
			);

			await new Promise<void>(resolve => window.setTimeout(resolve, 250));

			showToast.transactionSuccess(
				'Trade confirmed',
				tradeSide === 'buy'
					? `Holdings refreshed: +${formatNumber(amount)} keys.`
					: `Holdings refreshed: -${formatNumber(amount)} keys.`
			);
			setTradeDialogOpen(false);
		} catch (error) {
			setFeaturedHoldings(previousHoldings);
			showToast.error(getSignatureErrorMessage(error));
		} finally {
			setTradeSubmitting(false);
		}
	};

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(160deg,#08111f_0%,#10213b_45%,#f0b14d_160%)] px-6 pt-12 pb-28 md:px-12 md:pb-12">
			<SkipToContent
				targetId="main-creator-list"
				label="Skip to creator list"
			/>
			{showShortcutConfirmation && (
				<div
					role="status"
					aria-live="polite"
					className="fixed right-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-slate-950/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-100 shadow-2xl shadow-black/30 backdrop-blur-md md:right-6 md:top-6"
				>
					<RefreshCw
						className="size-3.5 animate-spin motion-reduce:animate-none"
						aria-hidden="true"
					/>
					Creator list refresh requested
				</div>
			)}
			{/* #306: the outer wrapper is just a decorative shell; the actual
			    landmark structure is a top-level <header> sibling of the <main>
			    below, so screen-reader landmark navigation lands directly on the
			    marketplace content rather than on the brand banner. */}
			<div className="absolute left-[-4rem] top-[10%] size-72 rounded-full bg-amber-300/20 blur-[100px]" />
			<div className="absolute bottom-[8%] right-[-3rem] size-72 rounded-full bg-emerald-300/15 blur-[100px]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,186,73,0.1),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.08),transparent_35%)]" />
			<MarketplaceSidebar />
			<div className="relative z-10 mx-auto max-w-7xl">
				<MarketplaceSection
					as="header"
					spacing="major"
					className="text-center"
				>
					<img
						className="mx-auto mb-8 size-10"
						src="/icons/logo.svg"
						alt="Access Layer logo"
					/>
					<p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-amber-400/80">
						Creator Keys Marketplace
					</p>
					<h1 className="mb-8 font-grotesque text-[clamp(2.5rem,8vw,5rem)] font-extrabold leading-[1.1] tracking-tight text-white">
						Access Layer
					</h1>
					<div className="flex justify-center">
						<UnavailableAction
							disabled={true}
							reason="Feature coming soon"
						>
							<Button>Buy Access</Button>
						</UnavailableAction>
					</div>
					<div className="mt-4 flex justify-center">
						<StellarConnectionQualityBadge />
					</div>
				</MarketplaceSection>

				<main
					id="creator-marketplace-main"
					aria-label="Creator marketplace"
				>
					<SectionDivider title="Discover creators" spacing="relaxed" />

					<StickyFilterBar
						eyebrow="Marketplace filters"
						title="Find creators without losing your place"
						description="Search by creator name or handle while you keep scrolling through the marketplace. The filter shell stays visible and compact so you can refine results without losing your place."
						resultCount={filteredCreators.length}
						onReset={handleResetSearch}
						showReset={searchQuery.length > 0}
					>
						<div className="space-y-3">
							<SearchBar
								value={searchQuery}
								onChange={setSearchQuery}
								validationMessage={searchValidationMessage}
								isLoading={isLoading}
								className="max-w-none shadow-2xl shadow-black/20"
							/>
							<div className="flex items-center gap-3">
								<label
									htmlFor="creator-sort"
									className="marketplace-label-muted text-xs font-semibold uppercase tracking-[0.16em]"
								>
									Sort
								</label>
								<select
									id="creator-sort"
									value={sortOption}
									onChange={e =>
										setSortOption(e.target.value as SortOption)
									}
									className="h-9 rounded-lg border border-white/15 bg-slate-950/80 px-3 text-sm text-white outline-none focus:border-amber-400/60"
								>
									<option value="featured">Featured</option>
									<option value="price-asc">Price: Low to high</option>
									<option value="price-desc">
										Price: High to low
									</option>
									<option value="supply-desc">
										Supply: High to low
									</option>
								</select>
							</div>
							<div
								aria-label={`${CREATOR_REFRESH_SHORTCUT_LABEL} refreshes creator list data`}
								className="flex flex-wrap items-center gap-2 text-xs text-white/55"
							>
								<span className="font-semibold uppercase tracking-[0.16em] text-white/40">
									Shortcut
								</span>
								<span className="inline-flex items-center gap-1" aria-hidden="true">
									<Kbd className="border border-white/10 bg-white/10 text-white/70">
										Ctrl/Cmd
									</Kbd>
									<Kbd className="border border-white/10 bg-white/10 text-white/70">
										Alt
									</Kbd>
									<Kbd className="border border-white/10 bg-white/10 text-white/70">
										R
									</Kbd>
								</span>
								<span>Refresh creators</span>
							</div>
						</div>
					</StickyFilterBar>

					<SectionDivider title="Marketplace results" spacing="default" />

					<SectionErrorBoundary sectionName="Creator List" minHeight={400}>
						<MarketplaceSection id="main-creator-list" tabIndex={-1}>
							<SectionHeading
								title="Explore creators"
								supportingText="Discover creator profiles and marketplace listings."
								className="mb-7"
								supportingTextClassName="max-w-3xl"
							/>

							{isLoading ? (
								<CreatorGridSkeleton count={6} />
							) : isFilterLoading ? (
								<div className="space-y-4">
									<div className="flex items-center justify-center gap-2 py-8">
										<div className="size-4 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400" />
										<span className="text-sm text-white/60">
											Updating results...
										</span>
									</div>
									<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 opacity-50">
										{pagedCreators.map(creator => (
											<CreatorCard
												key={creator.id}
												creator={creator}
												isPriceRefreshing={isPriceRefreshing}
											/>
										))}
									</div>
								</div>
							) : filteredCreators.length > 0 ? (
								<div className="space-y-4">
									{showRetryBanner && (
										<TransactionRetryNotice
											title="Loading live creators"
											message={getFetchRetryHelperCopy(
												fetchRetryAttempt + 1,
												MAX_CREATOR_FETCH_RETRIES + 1
											)}
											retryLabel={FETCH_RETRY_ACTION_LABEL}
											onRetry={handleRetryCreatorFetch}
										/>
									)}
									{finalFetchError && (
										<div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
											{finalFetchError}
										</div>
									)}
									{/* #301: subtle inline stale-data warning that
									appears once the cached creator data is past
									the 60s freshness window. The hook drives a
									background refresh that resets the baseline
									and clears the warning automatically. */}
									{creatorsAreStale && (
										<StaleDataWarning
											stale={creatorsAreStale}
											ageMs={creatorsAgeMs}
											className="self-start"
										/>
									)}
									<LayoutGroup>
										<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
											{/* Render pinned creators first */}
											{pagedCreators
												.filter(creator => creator.isPinned)
												.map((creator, index) => (
													// #300: staggered entry animation; the
													// helper no-ops on prefers-reduced-motion.
													// #355: layout transition when sort order changes.
													<motion.div
														key={creator.id}
														layout={!prefersReducedMotion}
														transition={
															CREATOR_LIST_SORT_LAYOUT_TRANSITION
														}
														className={CREATOR_CARD_ENTRY_CLASS}
														style={creatorCardEntryStyle(index, {
															prefersReducedMotion,
														})}
													>
														<CreatorCard
															creator={creator}
															isPriceRefreshing={isPriceRefreshing}
														/>
													</motion.div>
												))}

											{/* Separator between pinned and unpinned */}
											{pagedCreators.some(creator => creator.isPinned) &&
												pagedCreators.some(creator => !creator.isPinned) && (
													<CreatorListGroupSeparator label="Other creators" />
												)}

											{/* Render unpinned creators */}
											{pagedCreators
												.filter(creator => !creator.isPinned)
												.map((creator, index) => (
													<motion.div
														key={creator.id}
														layout={!prefersReducedMotion}
														transition={
															CREATOR_LIST_SORT_LAYOUT_TRANSITION
														}
														className={CREATOR_CARD_ENTRY_CLASS}
														style={creatorCardEntryStyle(index, {
															prefersReducedMotion,
														})}
													>
														<CreatorCard
															creator={creator}
															isPriceRefreshing={isPriceRefreshing}
														/>
													</motion.div>
												))}
										</div>
									</LayoutGroup>
									<CreatorListPagination
										page={safePage}
										totalPages={totalPages}
										onPageChange={handlePageChange}
										className="mt-8"
									/>
									{safePage < totalPages - 1 && (
										<div className="mt-4 flex justify-center">
											<Button
												type="button"
												variant="outline"
												onClick={() =>
													handlePageChange(safePage + 1)
												}
												aria-label="Load more creators"
												className="sr-only rounded-full border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-none focus:not-sr-only focus:flex focus:items-center focus:gap-2 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
											>
												<ChevronDown
													className="size-4"
													aria-hidden="true"
												/>
												Load more creators
											</Button>
										</div>
									)}
									{safePage >= totalPages - 1 && (
										<p
											role="status"
											aria-live="polite"
											className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/45"
										>
											{`You've reached the end — ${formatNumber(filteredCreators.length)} creator${filteredCreators.length === 1 ? '' : 's'} shown.`}
										</p>
									)}
								</div>
							) : (
								<div className="flex flex-col items-center gap-6 py-12">
									{trimmedSearchQuery.length === 0 ? (
										<ClearedFiltersEmptyState
											onBrowseAll={handleResetSearch}
											className="w-full max-w-xl"
										/>
									) : (
										<>
											<EmptyState
												image="/images/no-results.png"
												title="No creators found"
												description={`We couldn't find any creators matching "${searchQuery}". Try a different name or handle.`}
												onReset={handleResetSearch}
											/>
											{!hasInvalidSearchInput && (
												<EmptySearchSuggestions
													className="w-full max-w-xl"
													suggestions={searchSuggestions}
													onSelect={setSearchQuery}
												/>
											)}
										</>
									)}
								</div>
							)}
						</MarketplaceSection>
					</SectionErrorBoundary>

					<SectionDivider title="Holdings overview" spacing="relaxed" />
					<MarketplaceSection
						aria-labelledby="holdings-overview-heading"
						spacing="default"
						className="marketplace-card-surface rounded-[2rem] border p-6 shadow-[0_24px_80px_-60px_rgba(8,17,31,0.95)] backdrop-blur-sm md:p-8"
					>
						<div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
							<div>
								<p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-amber-300/80">
									Your holdings
								</p>
								<h2
									id="holdings-overview-heading"
									className="font-grotesque text-2xl font-black tracking-tight text-white"
								>
									Total portfolio value
								</h2>
								<p className="mt-2 max-w-2xl font-jakarta text-sm leading-relaxed text-white/60">
									Aggregates every creator key position currently held
									by this wallet using the latest available key prices.
								</p>
							</div>
							<div
								role="status"
								aria-live="polite"
								aria-busy={
									displayedPortfolioValue.status === 'loading' ||
									undefined
								}
								className="rounded-2xl border border-white/10 bg-slate-950/45 px-5 py-4 text-left md:min-w-64"
							>
								<div className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/45">
									Portfolio total
								</div>
								<div className="mt-1 flex items-center gap-2 font-grotesque text-3xl font-black text-white">
									{displayedPortfolioValue.status === 'loading' && (
										<span
											className="size-4 animate-spin rounded-full border-2 border-amber-400/25 border-t-amber-400"
											aria-hidden="true"
										/>
									)}
									{portfolioValueDisplay}
								</div>
								<p className="mt-2 text-xs leading-relaxed text-white/55">
									{portfolioValueHelperText}
								</p>
							</div>
						</div>
						{isLoading ? (
							<CreatorHoldingsListSkeleton className="mt-6" />
						) : (
							<div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{heldKeyPositions
									.filter(
										position =>
											position.quantity && position.quantity > 0
									)
									.map(position => {
										const creator = creators.find(
											item => item.id === position.creatorId
										);
										return (
											<div
												key={position.creatorId}
												className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
											>
												<div className="truncate text-sm font-bold text-white">
													{creator?.title ?? 'Unknown creator'}
												</div>
												<div className="mt-1 text-xs text-white/55">
													{formatNumber(position.quantity)} keys ·{' '}
													{position.isPriceLoading
														? 'Refreshing price'
														: position.isPriceStale
															? 'Price stale'
															: formatDisplayKeyPrice(
																	resolveCreatorKeyPriceStroops(
																		position
																	)
																)}
												</div>
											</div>
										);
									})}
							</div>
						)}
					</MarketplaceSection>

					<SectionDivider
						title="Creator profile pattern"
						spacing="relaxed"
					/>

					<div className="mb-8 space-y-6">
						<CreatorBreadcrumb
							parentLabel="Marketplace"
							parentHref="/"
							currentLabel="Alex Rivers Portfolio"
						/>
						<SectionErrorBoundary
							sectionName="Creator Header"
							minHeight={150}
						>
							{isLoading ? (
								<CreatorProfileHeaderSkeleton />
							) : (
								<CreatorProfileHeader
									name="Alex Rivers"
									handle="arivers"
									creatorId="arivers"
									isVerified={true}
									avatarUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
								/>
							)}
						</SectionErrorBoundary>
					</div>

					<SectionErrorBoundary
						sectionName="Creator Profile"
						minHeight={300}
					>
						{finalFetchError ? (
							<CreatorProfileLoadError
								onRetry={handleRetryCreatorFetch}
								isRetrying={isLoading}
							/>
						) : (
							<MarketplaceSection
								spacing="relaxed"
								className="marketplace-card-surface grid gap-8 rounded-[2rem] border p-6 shadow-[0_24px_80px_-60px_rgba(8,17,31,0.95)] backdrop-blur-sm md:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start"
							>
								<div>
									<SectionHeading
										eyebrow="Profile spotlight"
										title="A reusable profile facts layout for featured creators"
										className="mb-4"
									/>
									<ProfileTabPillGroup
										tabs={[
											{ label: 'Overview', value: 'overview' },
											{ label: 'Creations', value: 'creations' },
											{ label: 'Collectors', value: 'collectors' },
											{ label: 'Activity', value: 'activity' },
										]}
										activeTab={activeProfileTab}
										onTabChange={setActiveProfileTab}
										enableHashRouting
										className="mb-4"
									/>
									<CompactSectionSubtitle className="max-w-xl">
										Use the same subtitle pattern beneath headings,
										then drop repeated creator facts into one
										responsive grid that stays tidy on mobile and
										desktop.
									</CompactSectionSubtitle>
									<div
										id={`profile-panel-${activeProfileTab}`}
										role="tabpanel"
										aria-labelledby={`profile-tab-${activeProfileTab}`}
										tabIndex={0}
									>
										<div className="mt-5 flex flex-wrap gap-2">
											<MiniStatChip
												label="Status"
												value="Verified creator"
												explanation="Creator has completed identity verification with Access Layer."
											/>
											<MiniStatChip
												label="Audience"
												value={featuredCreatorKeyHolderCopy.value}
												explanation={
													featuredCreatorKeyHolderCopy.explanation
												}
											/>
											<MiniStatChip
												label="Access"
												value="Member-first drops"
												explanation="Key holders see new drops a window before the public marketplace."
											/>
										</div>
									</div>
								</div>
								<div className="space-y-3">
									<CreatorProfileInfoGrid
										items={[
											...FEATURED_CREATOR_FACTS,
											{
												label: 'Followers',
												value:
													FEATURED_CREATOR_FOLLOWER_COUNT != null
														? formatCompactNumber(
																FEATURED_CREATOR_FOLLOWER_COUNT
															)
														: 'Not available',
												helperText:
													FEATURED_CREATOR_FOLLOWER_COUNT != null
														? undefined
														: 'Follower count not available yet.',
											},
											{
												label: 'Your holdings',
												value: `${formatNumber(featuredHoldings)} keys${
													formatOwnershipPercent(
														featuredHoldings,
														featuredCreator?.creatorShareSupply,
														{
															maximumFractionDigits:
																precisionMode === 'compact'
																	? 1
																	: 2,
														}
													) !== '—'
														? ` (${formatOwnershipPercent(
																featuredHoldings,
																featuredCreator?.creatorShareSupply,
																{
																	maximumFractionDigits:
																		precisionMode ===
																		'compact'
																			? 1
																			: 2,
																}
															)})`
														: ''
												}`,
											},
										]}
									/>
									<div className="flex items-center justify-between gap-2">
										<span className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
											Metrics display
										</span>
										<PrecisionModeToggle
											mode={precisionMode}
											onChange={setPrecisionMode}
										/>
									</div>
									<CreatorLabeledStatRow
										label="Creator Share Supply"
										value={
											precisionMode === 'compact'
												? `${formatCompactNumber(
														featuredCreator?.creatorShareSupply
													)} shares available`
												: `${formatNumber(
														featuredCreator?.creatorShareSupply
													)} shares available`
										}
									/>
									{isNetworkMismatch && <NetworkMismatchBanner />}
									<div className="relative">
										<div
											className={cn(
												'hidden md:flex items-center gap-3 transition-opacity duration-200',
												tradeSubmitting &&
													'pointer-events-none select-none opacity-60'
											)}
											aria-busy={tradeSubmitting || undefined}
										>
											<Button
												className="rounded-xl"
												onClick={() => openTradeDialog('buy')}
												disabled={
													isNetworkMismatch || tradeSubmitting
												}
											>
												Buy
											</Button>
											<Button
												className="rounded-xl"
												variant="outline"
												onClick={() => openTradeDialog('sell')}
												disabled={
													isNetworkMismatch || tradeSubmitting
												}
											>
												Sell
											</Button>
										</div>
										{tradeSubmitting && (
											<div className="absolute inset-0 hidden items-center justify-center rounded-[1.25rem] border border-white/10 bg-slate-950/65 backdrop-blur-sm md:flex">
												<div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-white/85 shadow-lg">
													<div className="size-3.5 animate-spin rounded-full border-2 border-amber-400/25 border-t-amber-400" />
													Submitting trade
												</div>
											</div>
										)}
									</div>
								</div>
							</MarketplaceSection>
						)}
					</SectionErrorBoundary>

					<div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/85 backdrop-blur-md md:hidden">
						<div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-3">
							<div className="min-w-0">
								<div className="text-xs font-bold uppercase tracking-[0.22em] text-white/40">
									Your holdings
								</div>
								<div
									className="truncate font-jakarta text-sm font-bold text-white/85"
									aria-label={`Wallet holdings: ${formatNumber(
										featuredHoldings
									)} keys${
										formatOwnershipPercent(
											featuredHoldings,
											featuredCreator?.creatorShareSupply
										) !== '—'
											? ` (${formatOwnershipPercent(featuredHoldings, featuredCreator?.creatorShareSupply)})`
											: ''
									}`}
								>
									{formatNumber(featuredHoldings)} keys
									{formatOwnershipPercent(
										featuredHoldings,
										featuredCreator?.creatorShareSupply
									) !== '—' && (
										<span className="ml-2 text-xs font-normal text-white/60">
											(
											{formatOwnershipPercent(
												featuredHoldings,
												featuredCreator?.creatorShareSupply
											)}
											)
										</span>
									)}
								</div>
							</div>
							<div className="flex items-center gap-2">
								<div className="relative">
									<div
										className={cn(
											'flex items-center gap-2 transition-opacity duration-200',
											tradeSubmitting &&
												'pointer-events-none select-none opacity-60'
										)}
										aria-busy={tradeSubmitting || undefined}
									>
										<Button
											className="rounded-xl"
											size="sm"
											onClick={() => openTradeDialog('buy')}
											disabled={isNetworkMismatch || tradeSubmitting}
										>
											Buy
										</Button>
										<Button
											className="rounded-xl"
											size="sm"
											variant="outline"
											onClick={() => openTradeDialog('sell')}
											disabled={isNetworkMismatch || tradeSubmitting}
										>
											Sell
										</Button>
									</div>
									{tradeSubmitting && (
										<div className="absolute inset-0 flex items-center justify-center rounded-xl border border-white/10 bg-slate-950/65 px-3 backdrop-blur-sm">
											<div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-[11px] font-bold text-white/85 shadow-lg">
												<div className="size-3 animate-spin rounded-full border-2 border-amber-400/25 border-t-amber-400" />
												Submitting trade
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					<SectionDivider
						title="Transaction timeline pattern"
						spacing="relaxed"
						isEmpty={false}
					/>
					<MarketplaceSection spacing="relaxed">
						<EmptyTransactionTimelineState />
					</MarketplaceSection>
				</main>
			</div>

			<TradeDialog
				open={tradeDialogOpen}
				side={tradeSide}
				creatorName="Alex Rivers"
				availableHoldings={featuredHoldings}
				keyPriceStroops={resolveCreatorKeyPriceStroops(featuredCreator)}
				isSubmitting={tradeSubmitting}
				onOpenChange={setTradeDialogOpen}
				onConfirm={handleConfirmTrade}
			/>
			<ScrollToTop />
			<IdleRefreshPrompt
				visible={isIdlePromptVisible}
				onRefresh={handleIdleRefresh}
				onDismiss={dismissIdlePrompt}
			/>
		</div>
	);
}

export default LandingPage;
