import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { LayoutGroup, motion } from 'framer-motion';
import { useSearchParams } from 'react-router';
import {
	courseService,
	type Course,
	type CourseSortOption,
} from '@/services/course.service';
import SkipToContent from '@/components/common/SkipToContent';
import { cn } from '@/lib/utils';
import SearchBar from '@/components/common/SearchBar';
import StickyFilterBar from '@/components/common/StickyFilterBar';
import CreatorCard from '@/components/common/CreatorCard';
import {
	CreatorHoldingsListSkeleton,
	CreatorProfileHeaderSkeleton,
} from '@/components/common/CreatorSkeleton';
import { CreatorCardGridSkeleton } from '@/components/common/CreatorCardSkeleton';
import EmptyState from '@/components/common/EmptyState';
import HoldingsEmptyState from '@/components/common/HoldingsEmptyState';
import PortfolioHoldingRow from '@/components/common/PortfolioHoldingRow';
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
import { FeaturedCreatorAudienceChip } from '@/components/common/FeaturedCreatorAudienceChip';
import MarketplaceSection from '@/components/common/MarketplaceSection';
import { ProfileTabPillGroup } from '@/components/common/ProfileTabPill';
import CreatorBreadcrumb from '@/components/common/CreatorBreadcrumb';
import CreatorProfileHeader from '@/components/common/CreatorProfileHeader';
import CreatorProfileErrorState from '@/components/common/CreatorProfileErrorState';
import TransactionRetryNotice from '@/components/common/TransactionRetryNotice';
import EmptyTransactionTimelineState from '@/components/common/EmptyTransactionTimelineState';
import TradeDialog, { type TradeSide } from '@/components/common/TradeDialog';
import type { FeeBreakdown } from '@/utils/pricePreview.utils';
import type { SlippageBounds } from '@/utils/slippageTolerance.utils';
import TradePanelErrorBoundary from '@/components/common/TradePanelErrorBoundary';
import NetworkMismatchBanner from '@/components/common/NetworkMismatchBanner';
import StellarConnectionQualityBadge from '@/components/common/StellarConnectionQualityBadge';
import { useAccount } from 'wagmi';
import { useNetworkMismatch } from '@/hooks/useNetworkMismatch';
import {
	useTradeMutation,
	useWalletHoldings,
	useReinvestDividendMutation,
	useRedeemDeprecatedKeyMutation,
} from '@/hooks/useWallet';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import { formatCompactNumber, formatNumber } from '@/utils/numberFormat.utils';
import { formatOwnershipPercent } from '@/utils/ownership.utils';
import {
	calculatePortfolioValue,
	formatPortfolioValueDisplay,
	getPortfolioValueHelperText,
	sortHoldingsByTotalValue,
	calculatePnLSummary,
	formatPnLDisplay,
	formatPnLPercentage,
} from '@/utils/portfolioValue.utils';
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
	resolveCreatorKeyPriceStroops,
	formatDisplayKeyPrice,
} from '@/utils/keyPriceDisplay.utils';
import { estimateReinvest } from '@/utils/reinvestDividend.utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CREATOR_LIST_SORT_LAYOUT_TRANSITION } from '@/utils/creatorListSortTransition';
import { creatorListKey } from '@/utils/creatorListKey.utils';
import { Check, ChevronDown, Copy, RefreshCw } from 'lucide-react';
import ClearedFiltersEmptyState from '@/components/common/ClearedFiltersEmptyState';
import CreatorListPagination from '@/components/common/CreatorListPagination';
import CreatorListGroupSeparator from '@/components/common/CreatorListGroupSeparator';
import MarketplaceSidebar from '@/components/common/MarketplaceSidebar';
import { copyTextToClipboard } from '@/utils/clipboard.utils';

const FEATURED_CREATOR_FACTS = [
	{ label: 'Membership', value: 'Collectors Circle' },
	{ label: 'Drop cadence', value: 'Weekly releases' },
	{ label: 'Focus', value: 'Illustration and motion' },
	{ label: 'Community', value: 'Private behind-the-scenes notes' },
];

const FEATURED_CREATOR_FOLLOWER_COUNT: number | null = null;
const FEATURED_CREATOR_KEY_HOLDER_COUNT = 0;
const FEATURED_CREATOR_STELLAR_ADDRESS =
	'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const FEATURED_CREATOR_NAME = 'Alex Rivers';

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

const CREATOR_PAGE_KEY = 'accesslayer.creator-page';
const CREATOR_SCROLL_KEY = 'accesslayer.creator-scrollY';
const CREATOR_LIST_MODE_KEY = 'accesslayer.creator-list-mode';
const CREATOR_VISIBLE_COUNT_KEY = 'accesslayer.creator-visibleCount';
const MAX_CREATOR_FETCH_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 800;
const PAGE_SIZE = 6;
const FETCH_RETRY_ACTION_LABEL = 'Try again';
const DEMO_HELD_KEY_QUANTITIES = [0, 2, 1] as const;
const DEMO_WALLET_ADDRESS = 'demo-wallet-address';
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

const isTradeShortcut = (event: KeyboardEvent) =>
	!event.ctrlKey &&
	!event.metaKey &&
	!event.altKey &&
	!event.shiftKey &&
	event.key.toLowerCase() === 't';

const toPriceFilterValue = (value: string) => {
	if (!value.trim()) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const getCreatorListKey = (creator: Course) => creatorListKey(creator.id);

type CreatorListMode = 'pagination' | 'infinite';

function LandingPage() {
	useNavigationTiming('portfolio');
	useDocumentTitle('Marketplace — AccessLayer');

	const [creators, setCreators] = useState<Course[]>([]);
	// Creators used for wallet holdings; kept separate from the marketplace
	// list so an empty API holdings response can show zero positions while
	// the browse grid still falls back to demo creators.
	const [holdingsCreators, setHoldingsCreators] = useState<Course[]>([]);
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
	const [searchQuery, setSearchQuery] = useState(() => {
		return searchParams.get('search') ?? searchParams.get('q') ?? '';
	});
	const debouncedSearchQuery = useDebounce(searchQuery, 300);
	const [minPriceFilter, setMinPriceFilter] = useState('');
	const [maxPriceFilter, setMaxPriceFilter] = useState('');
	const searchQueryRef = useRef<string>('');
	const [categoryFilter, setCategoryFilter] = useState<string>(() => {
		const category = searchParams.get('category');
		return category || '';
	});
	const sortOptionRef = useRef<CourseSortOption>('volume_desc');
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
	const [stellarAddressCopied, setStellarAddressCopied] = useState(false);
	const prefersReducedMotion = usePrefersReducedMotion();
	const [sortOption, setSortOption] = useState<CourseSortOption>(() => {
		const sort = searchParams.get('sort') as CourseSortOption | null;
		if (
			sort &&
			['volume_desc', 'price_asc', 'price_desc', 'newest'].includes(sort)
		) {
			sortOptionRef.current = sort;
			return sort;
		}
		return 'volume_desc';
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
	// Infinite scroll is an alternative to pagination for browsing the
	// creator list; the chosen mode is remembered across visits.
	const [listMode, setListMode] = useState<CreatorListMode>(() => {
		if (typeof window === 'undefined') return 'pagination';
		const saved = window.localStorage.getItem(CREATOR_LIST_MODE_KEY);
		return saved === 'infinite' ? 'infinite' : 'pagination';
	});
	// Persisted like `page` so infinite-scroll progress survives navigating
	// away and back (#639) instead of resetting to the first page.
	const [visibleCount, setVisibleCount] = useState(() => {
		if (typeof window === 'undefined') return PAGE_SIZE;
		const saved = window.sessionStorage.getItem(CREATOR_VISIBLE_COUNT_KEY);
		const parsed = saved ? Number(saved) : PAGE_SIZE;
		return Number.isFinite(parsed) && parsed >= PAGE_SIZE
			? parsed
			: PAGE_SIZE;
	});
	const pendingScrollRestoreRef = useRef<number | null>(null);
	const shortcutConfirmationTimerRef = useRef<number | null>(null);

	// Keep refs in sync with state
	searchQueryRef.current = searchQuery;
	sortOptionRef.current = sortOption;

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
		const newParams = new URLSearchParams(searchParams);
		let changed = false;

		const trimmedSearch = searchQuery.trim();
		const currentSearch = searchParams.get('search') ?? searchParams.get('q');

		if (trimmedSearch) {
			if (currentSearch !== trimmedSearch || searchParams.has('q')) {
				newParams.set('search', trimmedSearch);
				newParams.delete('q');
				changed = true;
			}
		} else {
			if (searchParams.has('search') || searchParams.has('q')) {
				newParams.delete('search');
				newParams.delete('q');
				changed = true;
			}
		}

		const currentSort = searchParams.get('sort');
		if (currentSort !== sortOption) {
			newParams.set('sort', sortOption);
			changed = true;
		}

		const currentCategory = searchParams.get('category');
		if (categoryFilter) {
			if (currentCategory !== categoryFilter) {
				newParams.set('category', categoryFilter);
				changed = true;
			}
		} else {
			if (searchParams.has('category')) {
				newParams.delete('category');
				changed = true;
			}
		}

		if (changed) {
			setSearchParams(newParams, { replace: true });
		}
	}, [searchQuery, sortOption, categoryFilter, searchParams, setSearchParams]);

	useEffect(() => {
		const searchVal =
			searchParams.get('search') ?? searchParams.get('q') ?? '';
		if (searchVal !== searchQueryRef.current) {
			setSearchQuery(searchVal);
		}
		const sort = searchParams.get('sort') as CourseSortOption | null;
		const validSort: CourseSortOption =
			sort &&
			['volume_desc', 'price_asc', 'price_desc', 'newest'].includes(sort)
				? (sort as CourseSortOption)
				: 'volume_desc';
		if (validSort !== sortOptionRef.current) {
			sortOptionRef.current = validSort;
			setSortOption(validSort);
		}

		const category = searchParams.get('category');
		if (category !== categoryFilter) {
			setCategoryFilter(category || '');
		}
	}, [searchParams, categoryFilter]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		window.sessionStorage.setItem(CREATOR_PAGE_KEY, String(page));
	}, [page]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		window.sessionStorage.setItem(
			CREATOR_VISIBLE_COUNT_KEY,
			String(visibleCount)
		);
	}, [visibleCount]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(CREATOR_LIST_MODE_KEY, listMode);
	}, [listMode]);

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
				const minPrice = toPriceFilterValue(minPriceFilter);
				const maxPrice = toPriceFilterValue(maxPriceFilter);
				const params = {
					...(minPrice !== undefined ? { min_price: minPrice } : {}),
					...(maxPrice !== undefined ? { max_price: maxPrice } : {}),
					...(debouncedSearchQuery.trim()
						? { search: debouncedSearchQuery.trim() }
						: {}),
					sort: sortOption,
				};
				const data = await courseService.getCourses(
					Object.keys(params).length > 0 ? params : undefined
				);
				if (data && data.length > 0) {
					setCreators(data);
					setHoldingsCreators(data);
				} else {
					setCreators(DEMO_CREATORS);
					setHoldingsCreators([]);
				}
				// Track the last successful fetch so the stale-data warning
				// has a baseline to compare against (#301).
				setCreatorsFetchedAt(Date.now());
				setFetchRetryAttempt(0);
			} catch {
				if (fetchRetryAttempt === 0) {
					showToast.error(
						'Unable to load creators. Check your connection and try again.'
					);
				}
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
				setHoldingsCreators(DEMO_CREATORS);
			} finally {
				setIsLoading(false);
			}
		};

		fetchCreators();
	}, [
		fetchRetryAttempt,
		fetchRequestId,
		maxPriceFilter,
		minPriceFilter,
		debouncedSearchQuery,
		sortOption,
	]);

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

		// Apply category filter
		const categoryFiltered = categoryFilter
			? filtered.filter(
					creator =>
						creator.category?.toLowerCase() ===
						categoryFilter.toLowerCase()
				)
			: filtered;

		const sorted = [...categoryFiltered];
		const priceOf = (creator: Course) =>
			resolveCreatorKeyPriceStroops(creator) ?? 0;

		switch (sortOption) {
			case 'price_asc':
				sorted.sort((a, b) => priceOf(a) - priceOf(b));
				break;
			case 'price_desc':
				sorted.sort((a, b) => priceOf(b) - priceOf(a));
				break;
			case 'newest':
				sorted.sort((a, b) => {
					const dateA = a.nextDropAt
						? new Date(a.nextDropAt).getTime()
						: 0;
					const dateB = b.nextDropAt
						? new Date(b.nextDropAt).getTime()
						: 0;
					return dateB - dateA;
				});
				break;
			case 'volume_desc':
			default:
				sorted.sort(
					(a, b) =>
						(b.creatorShareSupply ?? 0) - (a.creatorShareSupply ?? 0)
				);
				break;
		}
		return sorted;
	}, [
		creators,
		trimmedSearchQuery,
		hasInvalidSearchInput,
		sortOption,
		categoryFilter,
	]);

	// Add loading state for filter changes
	useEffect(() => {
		if (creators.length === 0) return; // Don't show filter loading during initial load

		setIsFilterLoading(true);
		const timer = setTimeout(() => {
			setIsFilterLoading(false);
		}, 300); // Short delay to show loading indicator

		return () => clearTimeout(timer);
	}, [trimmedSearchQuery, sortOption, categoryFilter, creators.length]);

	// Resets pagination when the search/sort criteria actually change. Skips
	// the initial mount so restoring a persisted page/visibleCount (#639)
	// isn't immediately clobbered by this effect's first run.
	const isFirstSearchSortRenderRef = useRef(true);
	useEffect(() => {
		if (isFirstSearchSortRenderRef.current) {
			isFirstSearchSortRenderRef.current = false;
			return;
		}
		setPage(0);
		setVisibleCount(PAGE_SIZE);
	}, [trimmedSearchQuery, sortOption, categoryFilter]);

	// Switching modes starts the newly active view from the top of the
	// filtered results rather than wherever the other mode left off. Skips
	// the initial mount so restoring a persisted page/visibleCount (#639)
	// isn't immediately clobbered by this effect's first run.
	const isFirstListModeRenderRef = useRef(true);
	useEffect(() => {
		if (isFirstListModeRenderRef.current) {
			isFirstListModeRenderRef.current = false;
			return;
		}
		setPage(0);
		setVisibleCount(PAGE_SIZE);
	}, [listMode]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredCreators.length / PAGE_SIZE)
	);
	const safePage = Math.min(page, totalPages - 1);
	const pagedCreators = useMemo(() => {
		const start = safePage * PAGE_SIZE;
		return filteredCreators.slice(start, start + PAGE_SIZE);
	}, [filteredCreators, safePage]);
	const safeVisibleCount = Math.min(
		Math.max(visibleCount, PAGE_SIZE),
		Math.max(filteredCreators.length, PAGE_SIZE)
	);
	const infiniteCreators = useMemo(
		() => filteredCreators.slice(0, safeVisibleCount),
		[filteredCreators, safeVisibleCount]
	);
	const hasMoreInfinite = safeVisibleCount < filteredCreators.length;
	const visibleCreators =
		listMode === 'infinite' ? infiniteCreators : pagedCreators;

	const handleLoadMoreInfinite = useCallback(() => {
		setVisibleCount(count =>
			Math.min(count + PAGE_SIZE, filteredCreators.length)
		);
	}, [filteredCreators.length]);

	const infiniteScrollSentinelRef = useInfiniteScroll<HTMLDivElement>({
		enabled: listMode === 'infinite' && !isLoading && !isFilterLoading,
		hasMore: hasMoreInfinite,
		onLoadMore: handleLoadMoreInfinite,
	});
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

	const handleResetSearch = () => {
		setSearchQuery('');
		setCategoryFilter('');
	};
	const handleClearPriceFilters = () => {
		setMinPriceFilter('');
		setMaxPriceFilter('');
	};

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

	const { address: connectedAddress } = useAccount();
	const activeWalletAddress = connectedAddress || DEMO_WALLET_ADDRESS;

	const tradeMutation = useTradeMutation(activeWalletAddress);
	const reinvestMutation = useReinvestDividendMutation(activeWalletAddress);
	const redeemMutation = useRedeemDeprecatedKeyMutation(activeWalletAddress);
	const { data: cachedHoldings = [] } = useWalletHoldings(activeWalletAddress);

	// Merged: keep total-value sorting (feature/holdings-sorting-tests) while
	// also zeroing out the demo baseline quantities once a real wallet is
	// connected (dev), so a connected wallet only shows genuine cached
	// holdings rather than the seeded demo amounts.
	const heldKeyPositions = useMemo(
		() =>
			sortHoldingsByTotalValue(
				holdingsCreators.map((creator, index) => {
					const cached = cachedHoldings.find(
						h => h.creatorId === creator.id
					);
					const defaultBaseQuantity =
						index === 0
							? featuredHoldings
							: (DEMO_HELD_KEY_QUANTITIES[index] ?? 0);
					const baseQuantity = connectedAddress ? 0 : defaultBaseQuantity;
					return {
						creatorId: creator.id,
						quantity: cached?.quantity ?? baseQuantity,
						priceStroops: creator.priceStroops,
						price: creator.price,
						isPriceLoading: isPriceRefreshing,
						isPriceStale: creatorsAreStale,
						pending: cached?.pending ?? false,
						unclaimedDividend: cached?.unclaimedDividend ?? 0,
					};
				})
			),
		[
			holdingsCreators,
			creatorsAreStale,
			featuredHoldings,
			isPriceRefreshing,
			cachedHoldings,
			connectedAddress,
		]
	);
	const portfolioValue = useMemo(
		() => calculatePortfolioValue(heldKeyPositions),
		[heldKeyPositions]
	);
	const pnlSummary = useMemo(
		() => calculatePnLSummary(heldKeyPositions),
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

	const openTradeDialog = useCallback((side: TradeSide) => {
		setTradeSide(side);
		setTradeDialogOpen(true);
	}, []);

	// Issue 554: T key opens the trade panel from the creator profile page.
	useEffect(() => {
		const handleTradeShortcut = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.repeat ||
				!isTradeShortcut(event) ||
				isEditableShortcutTarget(event.target)
			) {
				return;
			}

			event.preventDefault();
			openTradeDialog('buy');
		};

		window.addEventListener('keydown', handleTradeShortcut);
		return () => window.removeEventListener('keydown', handleTradeShortcut);
	}, [openTradeDialog]);

	const handleCopyStellarAddress = async () => {
		try {
			await copyTextToClipboard(FEATURED_CREATOR_STELLAR_ADDRESS);
			setStellarAddressCopied(true);
			showToast.success('Address copied to clipboard', { duration: 2000 });
			setTimeout(() => setStellarAddressCopied(false), 2000);
		} catch {
			showToast.error(
				'Could not copy the Stellar address. Please copy it manually.'
			);
		}
	};

	const handleConfirmTrade = async (
		amount: number,
		_pricePreview?: FeeBreakdown | null,
		slippage?: SlippageBounds | null
	) => {
		setTradeSubmitting(true);
		try {
			if (tradeSide === 'buy') {
				showToast.loading(
					`Submitting buy for ${amount} key${amount === 1 ? '' : 's'}...`
				);
				const urlRef = new URL(window.location.href).searchParams.get(
					'ref'
				);
				await tradeMutation.mutateAsync({
					creatorId: '1',
					amount,
					priceStroops: resolveCreatorKeyPriceStroops(featuredCreator),
					price: featuredCreator?.price,
					ref: urlRef,
					maxPriceStroops: slippage?.maxPriceStroops ?? null,
				});
				setFeaturedHoldings(current => current + amount);
				showToast.transactionSuccess(
					'Trade confirmed',
					`Bought ${formatNumber(amount)} key${amount === 1 ? '' : 's'} from ${FEATURED_CREATOR_NAME}`
				);
			} else {
				showToast.loading(
					`Submitting sell for ${amount} key${amount === 1 ? '' : 's'}...`
				);
				await tradeMutation.mutateAsync({
					creatorId: '1',
					amount: -amount,
					priceStroops: resolveCreatorKeyPriceStroops(featuredCreator),
					price: featuredCreator?.price,
					minPriceStroops: slippage?.minPriceStroops ?? null,
				});
				setFeaturedHoldings(current => Math.max(0, current - amount));
				showToast.transactionSuccess(
					'Trade confirmed',
					`Sold ${formatNumber(amount)} key${amount === 1 ? '' : 's'} from ${FEATURED_CREATOR_NAME}`
				);
			}
			setTradeDialogOpen(false);
		} catch (error) {
			if (process.env.NODE_ENV !== 'test') {
				console.debug('[trade-confirmation-failure]', {
					creator_name: FEATURED_CREATOR_NAME,
					side: tradeSide,
					quantity: amount,
					error:
						error instanceof Error
							? `${error.name}: ${error.message}`
							: String(error),
					timestamp: new Date().toISOString(),
				});
			}
			if (tradeSide === 'sell') {
				showToast.error(getSignatureErrorMessage(error));
			}
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
						showReset={
							searchQuery.length > 0 || categoryFilter.length > 0
						}
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
										setSortOption(e.target.value as CourseSortOption)
									}
									className="h-9 rounded-lg border border-white/15 bg-slate-950/80 px-3 text-sm text-white outline-none focus:border-amber-400/60"
								>
									<option value="volume_desc">
										Volume: High to low
									</option>
									<option value="price_asc">Price: Low to high</option>
									<option value="price_desc">
										Price: High to low
									</option>
									<option value="newest">Newest</option>
								</select>
							</div>
							<div className="flex items-center gap-3">
								<label
									htmlFor="creator-category"
									className="marketplace-label-muted text-xs font-semibold uppercase tracking-[0.16em]"
								>
									Category
								</label>
								<select
									id="creator-category"
									value={categoryFilter}
									onChange={e => setCategoryFilter(e.target.value)}
									className="h-9 rounded-lg border border-white/15 bg-slate-950/80 px-3 text-sm text-white outline-none focus:border-amber-400/60"
								>
									<option value="">All categories</option>
									{Array.from(
										new Set(
											creators
												.map(c => c.category)
												.filter((cat): cat is string =>
													Boolean(cat)
												)
										)
									)
										.sort()
										.map(category => (
											<option key={category} value={category}>
												{category}
											</option>
										))}
								</select>
							</div>
							<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
								<div>
									<label
										htmlFor="min-price"
										className="marketplace-label-muted text-xs font-semibold uppercase tracking-[0.16em]"
									>
										Min price
									</label>
									<input
										id="min-price"
										type="number"
										min="0"
										step="0.01"
										inputMode="decimal"
										value={minPriceFilter}
										onChange={event =>
											setMinPriceFilter(event.target.value)
										}
										className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 text-sm text-white outline-none focus:border-amber-400/60"
									/>
								</div>
								<div>
									<label
										htmlFor="max-price"
										className="marketplace-label-muted text-xs font-semibold uppercase tracking-[0.16em]"
									>
										Max price
									</label>
									<input
										id="max-price"
										type="number"
										min="0"
										step="0.01"
										inputMode="decimal"
										value={maxPriceFilter}
										onChange={event =>
											setMaxPriceFilter(event.target.value)
										}
										className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 text-sm text-white outline-none focus:border-amber-400/60"
									/>
								</div>
								<Button
									type="button"
									variant="outline"
									onClick={handleClearPriceFilters}
									disabled={!minPriceFilter && !maxPriceFilter}
									className="h-10 rounded-lg border-white/10 bg-white/5 px-4 text-xs font-bold uppercase tracking-[0.16em] text-white"
								>
									Clear
								</Button>
							</div>
							<div
								aria-label={`${CREATOR_REFRESH_SHORTCUT_LABEL} refreshes creator list data`}
								className="flex flex-wrap items-center gap-2 text-xs text-white/55"
							>
								<span className="font-semibold uppercase tracking-[0.16em] text-white/40">
									Shortcut
								</span>
								<span
									className="inline-flex items-center gap-1"
									aria-hidden="true"
								>
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
							{showRetryBanner && (
								<TransactionRetryNotice
									title="Loading live creators"
									message={getFetchRetryHelperCopy(
										fetchRetryAttempt + 1,
										MAX_CREATOR_FETCH_RETRIES + 1
									)}
									retryLabel={FETCH_RETRY_ACTION_LABEL}
									onRetry={handleRetryCreatorFetch}
									className="mb-6"
								/>
							)}
							{finalFetchError && (
								<div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
									{finalFetchError}
								</div>
							)}

							{isLoading ? (
								// #421: replace the generic grid skeleton with
								// CreatorCardGridSkeleton so each placeholder
								// mirrors CreatorCard's dimensions and prevents
								// layout shift when real cards arrive.
								<CreatorCardGridSkeleton count={6} />
							) : isFilterLoading ? (
								<div className="space-y-4">
									<div className="flex items-center justify-center gap-2 py-8">
										<div className="size-4 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400" />
										<span className="text-sm text-white/60">
											Updating results...
										</span>
									</div>
									<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 opacity-50">
										{visibleCreators.map(creator => (
											<CreatorCard
												key={getCreatorListKey(creator)}
												creator={creator}
												isPriceRefreshing={isPriceRefreshing}
											/>
										))}
									</div>
								</div>
							) : filteredCreators.length > 0 ? (
								<div className="space-y-4">
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
									<div className="flex items-center justify-center gap-2">
										<span className="marketplace-label-muted text-xs font-semibold uppercase tracking-[0.16em]">
											List mode
										</span>
										<div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
											<button
												type="button"
												onClick={() => setListMode('pagination')}
												aria-pressed={listMode === 'pagination'}
												className={cn(
													'rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-colors',
													listMode === 'pagination'
														? 'bg-amber-400 text-slate-950'
														: 'text-white/60 hover:text-white'
												)}
											>
												Pages
											</button>
											<button
												type="button"
												onClick={() => setListMode('infinite')}
												aria-pressed={listMode === 'infinite'}
												className={cn(
													'rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-colors',
													listMode === 'infinite'
														? 'bg-amber-400 text-slate-950'
														: 'text-white/60 hover:text-white'
												)}
											>
												Infinite scroll
											</button>
										</div>
									</div>
									<LayoutGroup>
										<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
											{/* Render pinned creators first */}
											{visibleCreators
												.filter(creator => creator.isPinned)
												.map((creator, index) => (
													// #300: staggered entry animation; the
													// helper no-ops on prefers-reduced-motion.
													// #355: layout transition when sort order changes.
													<motion.div
														key={getCreatorListKey(creator)}
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
															isPriceRefreshing={
																isPriceRefreshing
															}
														/>
													</motion.div>
												))}

											{/* Separator between pinned and unpinned */}
											{visibleCreators.some(
												creator => creator.isPinned
											) &&
												visibleCreators.some(
													creator => !creator.isPinned
												) && (
													<CreatorListGroupSeparator label="Other creators" />
												)}

											{/* Render unpinned creators */}
											{visibleCreators
												.filter(creator => !creator.isPinned)
												.map((creator, index) => (
													<motion.div
														key={getCreatorListKey(creator)}
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
															isPriceRefreshing={
																isPriceRefreshing
															}
														/>
													</motion.div>
												))}
										</div>
									</LayoutGroup>
									{listMode === 'pagination' ? (
										<>
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
										</>
									) : (
										<>
											{/* Invisible sentinel that triggers the next
											page load once it scrolls into view. The
											visible button beneath it is the accessible
											fallback for keyboard users and browsers
											without IntersectionObserver support. */}
											{hasMoreInfinite && (
												<div
													ref={infiniteScrollSentinelRef}
													aria-hidden="true"
													className="h-px w-full"
												/>
											)}
											<div
												role="status"
												aria-live="polite"
												className="mt-8 flex flex-col items-center gap-3"
											>
												{hasMoreInfinite ? (
													<>
														<span className="sr-only">
															Loading more creators
														</span>
														<div
															className="size-5 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400"
															aria-hidden="true"
														/>
														<Button
															type="button"
															variant="outline"
															onClick={handleLoadMoreInfinite}
															className="rounded-full border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white"
														>
															<ChevronDown
																className="size-4"
																aria-hidden="true"
															/>
															Load more creators
														</Button>
													</>
												) : (
													<p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
														{`You've reached the end — ${formatNumber(filteredCreators.length)} creator${filteredCreators.length === 1 ? '' : 's'} shown.`}
													</p>
												)}
											</div>
										</>
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
								<span
									data-testid="holdings-header-entry-count"
									className="sr-only"
								>
									{displayedPortfolioValue.heldPositionCount}
								</span>
							</div>
						</div>
						{pnlSummary.status === 'ready' &&
							pnlSummary.totalInvested > 0 && (
								<div
									data-testid="pnl-summary-card"
									className="mt-4 rounded-xl border border-white/10 bg-slate-950/30 px-4 py-3"
								>
									<div className="flex items-center gap-6 text-sm">
										<div>
											<span className="text-white/45">
												Total Invested
											</span>
											<span className="ml-2 font-grotesque font-bold text-white">
												{formatPnLDisplay(pnlSummary.totalInvested)}
											</span>
										</div>
										<div>
											<span className="text-white/45">
												Current Value
											</span>
											<span className="ml-2 font-grotesque font-bold text-white">
												{formatPnLDisplay(pnlSummary.currentValue)}
											</span>
										</div>
										<div>
											<span className="text-white/45">
												Unrealised PnL
											</span>
											<span
												className={`ml-2 font-grotesque font-bold ${
													pnlSummary.unrealisedPnL > 0
														? 'text-emerald-400'
														: pnlSummary.unrealisedPnL < 0
															? 'text-red-400'
															: 'text-white'
												}`}
											>
												{formatPnLDisplay(pnlSummary.unrealisedPnL)}{' '}
												(
												{formatPnLPercentage(
													pnlSummary.pnlPercentage
												)}
												)
											</span>
										</div>
									</div>
								</div>
							)}
						{isLoading ? (
							<CreatorHoldingsListSkeleton className="mt-6" />
						) : heldKeyPositions.filter(
								position => position.quantity && position.quantity > 0
						  ).length === 0 ? (
							// Settled empty only — skeleton covers loading so this never flashes.
							<HoldingsEmptyState />
						) : (
							<div className="mt-6 grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
											<PortfolioHoldingRow
												key={position.creatorId}
												position={position}
												creator={creator}
												onBuy={() => openTradeDialog('buy')}
												onSell={() => openTradeDialog('sell')}
												onReinvest={async creatorId => {
													const pos = heldKeyPositions.find(
														p => p.creatorId === creatorId
													);
													const keyPriceStroops =
														resolveCreatorKeyPriceStroops(
															pos ?? {}
														);
													const estimate = estimateReinvest(
														pos?.unclaimedDividend ?? 0,
														keyPriceStroops
													);
													if (!estimate) {
														showToast.error(
															'Reinvest estimate unavailable. Please refresh prices and try again.'
														);
														return;
													}
													await reinvestMutation.mutateAsync({
														keyId: creatorId,
														amount: pos?.unclaimedDividend ?? 0,
														keys: estimate.wholeKeys,
													});
													showToast.success(
														`Reinvested ${formatDisplayKeyPrice(estimate.unclaimedStroops)} — received ${formatNumber(estimate.wholeKeys)} keys`
													);
												}}
												onRedeem={async creatorId => {
													const pos = heldKeyPositions.find(
														p => p.creatorId === creatorId
													);
													await redeemMutation.mutateAsync({
														creatorId,
														quantity: pos?.quantity ?? 0,
													});
													showToast.success(
														`Redeemed your ${creator?.title ?? 'deprecated'} key position`
													);
												}}
												isSubmitting={tradeSubmitting}
												isReinvesting={reinvestMutation.isPending}
												isRedeeming={redeemMutation.isPending}
												isNetworkMismatch={isNetworkMismatch}
											/>
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
							<CreatorProfileErrorState
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
											<FeaturedCreatorAudienceChip
												creatorId="featured-creator"
												fetchHolderCount={() =>
													Promise.resolve(
														FEATURED_CREATOR_KEY_HOLDER_COUNT
													)
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
									{/* Issue 557: Stellar address with copy button */}
									<div className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
										<div className="min-w-0 flex-1">
											<p className="mb-0.5 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/40">
												Stellar Address
											</p>
											<p
												className="truncate font-mono text-xs text-white/70"
												title={FEATURED_CREATOR_STELLAR_ADDRESS}
											>
												{FEATURED_CREATOR_STELLAR_ADDRESS}
											</p>
										</div>
										<button
											type="button"
											onClick={handleCopyStellarAddress}
											aria-label={
												stellarAddressCopied
													? 'Stellar address copied'
													: 'Copy Stellar address'
											}
											className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
										>
											{stellarAddressCopied ? (
												<Check
													className="size-4 text-emerald-400"
													aria-hidden="true"
												/>
											) : (
												<Copy
													className="size-4"
													aria-hidden="true"
												/>
											)}
										</button>
									</div>
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

			<TradePanelErrorBoundary>
				<TradeDialog
					open={tradeDialogOpen}
					side={tradeSide}
					creatorName={FEATURED_CREATOR_NAME}
					availableHoldings={featuredHoldings}
					keyPriceStroops={resolveCreatorKeyPriceStroops(featuredCreator)}
					protocolFeeBps={250}
					creatorFeeBps={250}
					maxBuyQuantity={featuredCreator?.maxBuyQuantity ?? null}
					isSubmitting={tradeSubmitting}
					onOpenChange={setTradeDialogOpen}
					onConfirm={handleConfirmTrade}
				/>
			</TradePanelErrorBoundary>
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
