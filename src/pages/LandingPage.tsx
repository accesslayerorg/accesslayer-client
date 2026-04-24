import { useState, useEffect, useMemo } from 'react';
import { courseService, type Course } from '@/services/course.service';
import SearchBar from '@/components/common/SearchBar';
import StickyFilterBar from '@/components/common/StickyFilterBar';
import CreatorCard from '@/components/common/CreatorCard';
import { CreatorGridSkeleton } from '@/components/common/CreatorSkeleton';
import EmptyState from '@/components/common/EmptyState';
import SectionDivider from '@/components/common/SectionDivider';
import { Button } from '@/components/ui/button';
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

const FEATURED_CREATOR_FACTS = [
	{ label: 'Membership', value: 'Collectors Circle' },
	{ label: 'Drop cadence', value: 'Weekly releases' },
	{ label: 'Focus', value: 'Illustration and motion' },
	{ label: 'Community', value: 'Private behind-the-scenes notes' },
];

// Fallback demo data in case API fails
const DEMO_CREATORS: Course[] = [
	{
		id: '1',
		title: 'Alex Rivers',
		description: 'Digital Artist & Illustrator',
		price: 0.05,
		creatorShareSupply: 120,
		instructorId: 'arivers',
		category: 'Art',
		level: 'BEGINNER',
		isVerified: true,
		thumbnail:
			'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
	},
	{
		id: '2',
		title: 'Sarah Chen',
		description: 'Solidity Developer',
		price: 0.12,
		creatorShareSupply: 64,
		instructorId: 'schen_dev',
		category: 'Tech',
		level: 'ADVANCED',
		isVerified: true,
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
const MAX_CREATOR_FETCH_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 800;

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'supply-desc';

function LandingPage() {
	const [creators, setCreators] = useState<Course[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [activeProfileTab, setActiveProfileTab] = useState('overview');
	const [sortOption, setSortOption] = useState<SortOption>(() => {
		if (typeof window === 'undefined') return 'featured';
		const saved = window.localStorage.getItem(CREATOR_SORT_KEY) as SortOption | null;
		return saved ?? 'featured';
	});
	const [fetchRetryAttempt, setFetchRetryAttempt] = useState(0);
	const [showRetryBanner, setShowRetryBanner] = useState(false);
	const [finalFetchError, setFinalFetchError] = useState('');

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
				setFetchRetryAttempt(0);
			} catch {
				if (fetchRetryAttempt < MAX_CREATOR_FETCH_RETRIES) {
					const nextAttempt = fetchRetryAttempt + 1;
					setShowRetryBanner(true);
					const backoffDelay = Math.min(
						BASE_RETRY_DELAY_MS * 2 ** fetchRetryAttempt,
						5000
					);
					window.setTimeout(() => setFetchRetryAttempt(nextAttempt), backoffDelay);
					return;
				}

				setFinalFetchError(
					'Unable to load live creators right now. Showing fallback creators.'
				);
				setShowRetryBanner(false);
				setFetchRetryAttempt(0);
				setCreators(DEMO_CREATORS);
			} finally {
				setTimeout(() => setIsLoading(false), 800);
			}
		};

		fetchCreators();
	}, [fetchRetryAttempt]);

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
		switch (sortOption) {
			case 'price-asc':
				sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
				break;
			case 'price-desc':
				sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
				break;
			case 'supply-desc':
				sorted.sort(
					(a, b) => (b.creatorShareSupply ?? 0) - (a.creatorShareSupply ?? 0)
				);
				break;
			default:
				break;
		}
		return sorted;
	}, [creators, trimmedSearchQuery, hasInvalidSearchInput, sortOption]);

	const handleResetSearch = () => setSearchQuery('');

	return (
		<main className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(160deg,#08111f_0%,#10213b_45%,#f0b14d_160%)] px-6 py-12 md:px-12">
			<div className="absolute left-[-4rem] top-[10%] size-72 rounded-full bg-amber-300/20 blur-[100px]" />
			<div className="absolute bottom-[8%] right-[-3rem] size-72 rounded-full bg-emerald-300/15 blur-[100px]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,186,73,0.1),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.08),transparent_35%)]" />
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
				</MarketplaceSection>

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
							className="max-w-none shadow-2xl shadow-black/20"
						/>
						<div className="flex items-center gap-3">
							<label
								htmlFor="creator-sort"
								className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60"
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
								<option value="price-desc">Price: High to low</option>
								<option value="supply-desc">Supply: High to low</option>
							</select>
						</div>
					</div>
				</StickyFilterBar>

				<SectionDivider title="Marketplace results" spacing="default" />

				<MarketplaceSection>
					<SectionHeading
						title="Explore creators"
						supportingText="Discover creator profiles and marketplace listings."
						className="mb-7"
						supportingTextClassName="max-w-3xl"
					/>

					{isLoading ? (
						<CreatorGridSkeleton count={6} />
					) : filteredCreators.length > 0 ? (
						<div className="space-y-4">
							{showRetryBanner && (
								<TransactionRetryNotice
									title="Loading live creators"
									message={`Fetch failed, retrying with capped backoff (attempt ${fetchRetryAttempt + 1} of ${MAX_CREATOR_FETCH_RETRIES + 1}).`}
									retryLabel="Retry now"
									onRetry={() => setFetchRetryAttempt(0)}
								/>
							)}
							{finalFetchError && (
								<div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
									{finalFetchError}
								</div>
							)}
							<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
								{filteredCreators.map(creator => (
									<CreatorCard key={creator.id} creator={creator} />
								))}
							</div>
						</div>
					) : (
						<div className="flex justify-center py-12">
							<EmptyState
								image="/images/no-results.png"
								title="No creators found"
								description={`We couldn't find any creators matching "${searchQuery}". Try a different name or handle.`}
								onReset={handleResetSearch}
							/>
						</div>
					)}
				</MarketplaceSection>

				<SectionDivider title="Creator profile pattern" spacing="relaxed" />

				<div className="mb-8 space-y-6">
					<CreatorBreadcrumb
						parentLabel="Marketplace"
						parentHref="/"
						currentLabel="Alex Rivers Portfolio"
					/>
					<CreatorProfileHeader
						name="Alex Rivers"
						handle="arivers"
						isVerified={true}
						avatarUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
					/>
				</div>

				<MarketplaceSection
					spacing="relaxed"
					className="grid gap-8 rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_-60px_rgba(8,17,31,0.95)] backdrop-blur-sm md:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start"
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
							className="mb-4"
						/>
						<CompactSectionSubtitle className="max-w-xl">
							Use the same subtitle pattern beneath headings, then drop
							repeated creator facts into one responsive grid that stays
							tidy on mobile and desktop.
						</CompactSectionSubtitle>
						<div className="mt-5 flex flex-wrap gap-2">
							<MiniStatChip label="Status" value="Verified creator" />
							<MiniStatChip label="Audience" value="12.4K collectors" />
							<MiniStatChip label="Access" value="Member-first drops" />
						</div>
					</div>
					<div className="space-y-3">
						<CreatorProfileInfoGrid items={FEATURED_CREATOR_FACTS} />
						<CreatorLabeledStatRow
							label="Creator Share Supply"
							value="250 shares available"
						/>
					</div>
				</MarketplaceSection>

				<SectionDivider title="Transaction timeline pattern" spacing="relaxed" />
				<MarketplaceSection spacing="relaxed">
					<EmptyTransactionTimelineState />
				</MarketplaceSection>
			</div>
		</main>
	);
}

export default LandingPage;
