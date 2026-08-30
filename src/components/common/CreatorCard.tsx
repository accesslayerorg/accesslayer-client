import { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { useAccount } from 'wagmi';
import type { Course } from '@/services/course.service';
import { cn } from '@/lib/utils';
import {
	ShoppingCart,
	Link as LinkIcon,
	TrendingUp,
	MoreVertical,
	Copy,
	Share2,
	ExternalLink,
} from 'lucide-react';
import { Sparkline } from '@/components/ui/sparkline';
import SectionErrorBoundary from '@/components/common/SectionErrorBoundary';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import RecentActivityBadge from '@/components/common/RecentActivityBadge';
import toast from 'react-hot-toast';
import showToast from '@/utils/toast.util';
import { formatCompactNumber } from '@/utils/numberFormat.utils';
import { formatCreatorKeyPriceDisplay } from '@/utils/keyPriceDisplay.utils';
import {
	formatCreatorHandle,
	truncateHandle,
} from '@/utils/handleDisplay.utils';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import { getCreatorPriceChartAccessibilityCopy } from '@/utils/creatorPriceChartAccessibility.utils';
import { formatJoinDate } from '@/utils/formatJoinDate';
import { useSystemTheme } from '@/utils/useSystemTheme';
import { Tooltip } from '@/components/ui/tooltip';
import { AsyncButton } from '@/components/ui/async-button';
import { useNetworkMismatch } from '@/hooks/useNetworkMismatch';
import { useTransactionTelemetry } from '@/hooks/useTransactionTelemetry';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import TransactionRetryNotice from '@/components/common/TransactionRetryNotice';
import TransactionFailureDrawer from '@/components/common/TransactionFailureDrawer';
import type { TransactionFailureDetails } from '@/components/common/TransactionFailureDrawer';
import CardMetaRow from '@/components/common/CardMetaRow';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import WalletConnectCalloutBanner from '@/components/common/WalletConnectCalloutBanner';
import NetworkMismatchBanner from '@/components/common/NetworkMismatchBanner';
import CreatorSocialLinksList from '@/components/common/CreatorSocialLinksList';
import TransactionStatusIcon from '@/components/common/TransactionStatusIcon';
import { buildStellarExpertTxUrl, truncateTxHash } from '@/constants/stellar';
import { env } from '@/utils/env.utils';
import MiniStatChip from '@/components/common/MiniStatChip';
import Change24hBadge from '@/components/common/Change24hBadge';
import KeySupplyBadge from '@/components/common/KeySupplyBadge';
import CreatorListRowDivider from '@/components/common/CreatorListRowDivider';
import BuyActionHelperText from '@/components/common/BuyActionHelperText';
import NetworkFeeHint from '@/components/common/NetworkFeeHint';
import CreatorBio from '@/components/common/CreatorBio';
import CreatorDropCountdown from '@/components/common/CreatorDropCountdown';
import CreatorHandleHoverCard from '@/components/common/CreatorHandleHoverCard';
import { CREATOR_CARD_MEDIA_RADIUS_CLASS } from '@/utils/creatorCardTokens';

interface CreatorCardProps {
	creator: Course;
	className?: string;
	/**
	 * When true, render the price with a subtle refreshing indicator (#305).
	 * Layout is preserved — the indicator overlays / sits next to the value
	 * without changing the badge's box.
	 */
	isPriceRefreshing?: boolean;
}

const creatorBadgeRowClass = 'mt-2 flex items-center gap-1.5';

const CreatorCard: React.FC<CreatorCardProps> = ({
	creator,
	className,
	isPriceRefreshing = false,
}) => {
	const { isDarkMode } = useSystemTheme();
	// Display-normalised handles. Raw values stay on `creator` for any
	// equality / URL logic downstream.
	const displayInstructorHandle =
		formatCreatorHandle(creator.instructorId) || '@creator';
	const displaySocialHandle = formatCreatorHandle(creator.socialHandle);
	const truncatedInstructorHandle = truncateHandle(displayInstructorHandle);
	const truncatedSocialHandle = truncateHandle(displaySocialHandle);
	const displayCreatorName =
		normalizeCreatorDisplayName(creator.title) || 'Unnamed creator';
	const priceChartAccessibility = getCreatorPriceChartAccessibilityCopy({
		name: displayCreatorName,
		price: creator.price,
		priceStroops: creator.priceStroops,
		change24h: creator.change24h,
	});
	const priceChartDescriptionId = `creator-price-chart-description-${creator.id}`;
	const { isConnected } = useAccount();
	const { isMismatch: isNetworkMismatch, expectedChainName } =
		useNetworkMismatch();
	const [transactionState, setTransactionState] = useState<
		'idle' | 'submitting' | 'failed' | 'success'
	>('idle');
	const [failureDrawerOpen, setFailureDrawerOpen] = useState(false);
	const [failureDetails, setFailureDetails] =
		useState<TransactionFailureDetails>({
			errorMessage: '',
		});
	const hasFailedOnceRef = useRef(false);
	const trackTransactionEvent = useTransactionTelemetry();
	const cardRef = useRef<HTMLDivElement>(null);

	// Keyboard shortcut for quick buy (press 'b' when card is focused)


	const runPurchaseAttempt = useCallback(() => {
		setTransactionState('submitting');
		trackTransactionEvent('tx_submitted', {
			creatorId: creator.id,
			creatorTitle: displayCreatorName,
		});
		showToast.loading(`Purchasing keys for ${displayCreatorName}...`);

		window.setTimeout(() => {
			toast.remove();

			if (!hasFailedOnceRef.current) {
				hasFailedOnceRef.current = true;
				setTransactionState('failed');
				setFailureDetails({
					errorMessage:
						'Transaction failed: Insufficient balance to complete the purchase.',
					errorCode: 'ERR_INSUFFICIENT_BALANCE',
					txHash: '0xabcd1234...failed',
					developerDetails: {
						requiredAmount: '0.05 ETH',
						availableBalance: '0.02 ETH',
						gasEstimate: '0.001 ETH',
					},
					timestamp: Date.now(),
				});
				setFailureDrawerOpen(true);
				return;
			}

			hasFailedOnceRef.current = false;
			setTransactionState('success');
			trackTransactionEvent('tx_confirmed', {
				creatorId: creator.id,
				creatorTitle: displayCreatorName,
			});

			// Simulated transaction hash — replace with the real hash once the
			// on-chain mutation is wired up.
			const mockTxHash =
				'0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
			const explorerUrl = buildStellarExpertTxUrl(
				mockTxHash,
				env.VITE_STELLAR_NETWORK
			);

			showToast.transactionSuccess(
				'Transaction confirmed',
				truncateTxHash(mockTxHash),
				mockTxHash,
				explorerUrl
			);

			window.setTimeout(() => {
				setTransactionState('idle');
			}, 1800);
		}, 1500);
	}, [creator.id, displayCreatorName, trackTransactionEvent, setTransactionState]);

	const isRecentlyActive = (creator.volume24h ?? 0) > 0;
	const keyPriceDisplay = formatCreatorKeyPriceDisplay(creator);

	const handleCopyLink = async () => {
		const url = `${window.location.origin}/creator/${creator.id}`;
		try {
			await copyTextToClipboard(url);
			toast.success('Profile link copied');
		} catch {
			toast.error('Could not copy the profile link. Please copy it manually.');
		}
	};

	const handleShare = async () => {
		const url = `${window.location.origin}/creator/${creator.id}`;
		if (navigator.share) {
			navigator.share({ title: displayCreatorName, url }).catch(() => {});
		} else {
			try {
				await copyTextToClipboard(url);
				toast.success('Link copied to clipboard');
			} catch {
				toast.error(
					'Could not copy the share link. Please copy it manually.'
				);
			}
		}
	};

	const handleBuy = useCallback(() => {
		if (!isConnected) {
			toast.error('Please connect your wallet to purchase keys', {
				duration: 4000,
			});
			return;
		}

		if (isNetworkMismatch) {
			toast.error(`Switch to ${expectedChainName} to purchase keys`, {
				duration: 4000,
			});
			return;
		}

		toast.success(`Purchasing keys for ${displayCreatorName}...`, {
			duration: 3000,
		});
		// Implementation for contract interaction would go here
		runPurchaseAttempt();
	}, [isConnected, isNetworkMismatch, expectedChainName, displayCreatorName, runPurchaseAttempt]);

	const resolvedHolderCount =
		creator.holderCount ?? creator.holdersCount ?? creator.holders ?? creator.creatorShareSupply;

	return (
		<div
			ref={cardRef}
			tabIndex={0}
			className={cn(
				'marketplace-card-surface marketplace-card-surface-hover group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none motion-safe:md:hover:-translate-y-0.5 motion-safe:md:hover:border-amber-500/25 motion-safe:md:hover:shadow-[0_12px_32px_-20px_rgba(251,191,36,0.5)] motion-reduce:md:hover:translate-y-0 motion-reduce:md:hover:border-amber-500/35 motion-reduce:md:hover:bg-white/[0.05] motion-reduce:md:hover:shadow-[0_0_0_1px_rgba(251,191,36,0.12)]',
				className
			)}
		>
			<div className="absolute right-3 top-3 z-20">
				<DropdownMenu>
					<DropdownMenuTrigger
						aria-label={`More actions for ${displayCreatorName}`}
						className="flex size-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
					>
						<MoreVertical className="size-4" aria-hidden="true" />
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						className="w-48 border-white/10 bg-slate-900/95 backdrop-blur-xl"
					>
						<DropdownMenuLabel className="text-xs text-white/50">
							{displayCreatorName}
						</DropdownMenuLabel>
						<DropdownMenuSeparator className="bg-white/10" />
						<DropdownMenuItem
							onSelect={handleCopyLink}
							className="cursor-pointer gap-2 text-white/70 focus:bg-white/10 focus:text-white"
						>
							<Copy className="size-3.5" aria-hidden="true" />
							Copy profile link
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={handleShare}
							className="cursor-pointer gap-2 text-white/70 focus:bg-white/10 focus:text-white"
						>
							<Share2 className="size-3.5" aria-hidden="true" />
							Share creator
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={() => {}}
							className="cursor-pointer gap-2 text-white/70 focus:bg-white/10 focus:text-white"
						>
							<ExternalLink className="size-3.5" aria-hidden="true" />
							View profile
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<div
				className={cn(
					'relative mb-4 aspect-square overflow-hidden',
					CREATOR_CARD_MEDIA_RADIUS_CLASS
				)}
				role="img"
				aria-labelledby={`creator-name-${creator.id}`}
			>
				<CreatorInitialsAvatar
					name={displayCreatorName}
					creatorId={creator.id}
					imageSrc={creator.thumbnail}
					imageClassName={cn(
						'transition-transform duration-500 motion-reduce:transition-none motion-safe:md:group-hover:scale-[1.03] motion-reduce:md:group-hover:scale-100',
						isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
					)}
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 motion-reduce:transition-none motion-safe:md:group-hover:opacity-100 motion-reduce:md:group-hover:opacity-100" />
				{creator.volume24h !== undefined && (
					// #313: the .creator-card-overlay-text class swaps this
					// pill to system high-contrast tokens (Canvas / CanvasText
					// / ButtonBorder) when forced-colors mode is active so
					// the text stays legible over the image overlay.
					<div className="creator-card-overlay-text absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-slate-950/75 border border-white/10 px-2.5 py-1 backdrop-blur-md">
						<TrendingUp className="creator-action-icon text-emerald-400" />
						<span className="text-xs font-bold text-white/90">
							{creator.volume24h > 0
								? `${formatCompactNumber(creator.volume24h)} ETH`
								: 'New'}
						</span>
					</div>
				)}
			</div>

			<div className="mb-4">
				<div className="flex items-center gap-2 flex-wrap">
					<h3
						id={`creator-name-${creator.id}`}
						className="font-jakarta text-lg font-bold text-white"
					>
						<Link
							to={`/creator/${creator.id}`}
							data-testid="creator-profile-link"
							className="hover:underline"
						>
							{displayCreatorName}
						</Link>
					</h3>
					<VerifiedBadge
						verified={Boolean(creator.isVerified)}
						reserveSpace={true}
					/>
					<Change24hBadge change={creator.change24h} />
					<KeySupplyBadge supply={creator.creatorShareSupply} />
					{isRecentlyActive && <RecentActivityBadge />}
				</div>
				<p className="marketplace-label-muted font-jakarta text-sm">
					<CreatorHandleHoverCard
						handle={displayInstructorHandle}
						volume24h={creator.volume24h}
						change24h={creator.change24h}
						creatorShareSupply={creator.creatorShareSupply}
						isVerified={creator.isVerified}
					>
						{truncatedInstructorHandle}
					</CreatorHandleHoverCard>
				</p>

				<CreatorBio
					bio={creator.description}
					variant="card"
					className="mt-2"
				/>

				{creator.nextDropAt ? (
					<CreatorDropCountdown nextDropAt={creator.nextDropAt} />
				) : null}

				{creator.socialHandle ? (
					<div className="marketplace-label-muted mt-2 flex items-center gap-1.5 text-xs">
						<LinkIcon className="creator-action-icon text-amber-500/70" />
						<CreatorHandleHoverCard
							handle={displaySocialHandle}
							volume24h={creator.volume24h}
							change24h={creator.change24h}
							creatorShareSupply={creator.creatorShareSupply}
							isVerified={creator.isVerified}
						>
							<span className="truncate">{truncatedSocialHandle}</span>
						</CreatorHandleHoverCard>
					</div>
				) : (
					<div
						className={cn(
							creatorBadgeRowClass,
							'text-xs text-white/30 italic'
						)}
					>
						<LinkIcon className="creator-action-icon opacity-50" />
						<span>No public handle</span>
					</div>
				)}

			{/* Price history sparkline */}
			{creator.priceHistory && creator.priceHistory.length >= 2 && (() => {
				const latest = creator.priceHistory[creator.priceHistory.length - 1];
				const earliest = creator.priceHistory[0];
				let lineColor = '#fbbf24';
				if (latest > earliest) lineColor = '#22c55e';
				else if (latest < earliest) lineColor = '#ef4444';

				return (
					<SectionErrorBoundary
						sectionName="bonding curve chart"
						title="Chart unavailable — try refreshing"
						description=""
						minHeight={40}
					>
						<div className="mt-3">
							<Sparkline
								data={creator.priceHistory}
								color={lineColor}
							/>
							<table id={priceChartDescriptionId} className="sr-only">
								<caption>{priceChartAccessibility.summary}</caption>
								<thead>
									<tr>
										<th scope="col">Point</th>
										<th scope="col">Key price</th>
									</tr>
								</thead>
								<tbody>
									{priceChartAccessibility.points.map(point => (
										<tr key={point.label}>
											<th scope="row">{point.label}</th>
											<td>{point.value}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</SectionErrorBoundary>
				);
			})()}

				<div className="mt-3 flex flex-wrap gap-2">
					<MiniStatChip label="Price" value={keyPriceDisplay} />
					<MiniStatChip
						label="Category"
						value={creator.category || 'General'}
					/>
					<MiniStatChip label="Level" value={creator.level || 'Open'} />
				</div>
				<CreatorListRowDivider className="my-4" />
				<div className="mt-3 space-y-2">
					{creator.joinedAt && (
						<CardMetaRow
							label="Join Date"
							value={
								<Tooltip
									content={
										<p>
											{new Date(creator.joinedAt).toLocaleDateString(
												'en-US',
												{
													year: 'numeric',
													month: 'long',
													day: 'numeric',
												}
											)}
										</p>
									}
								>
									<span className="text-white/75 cursor-default truncate">
										{formatJoinDate(creator.joinedAt)}
									</span>
								</Tooltip>
							}
						/>
					)}
					<CardMetaRow
						label={
							<span className="inline-flex items-center gap-1.5">
								<LinkIcon className="creator-action-icon text-amber-500/70" />
								Handle
							</span>
						}
						value={
							creator.socialHandle
								? truncatedSocialHandle
								: 'No public handle'
						}
						valueTitle={
							creator.socialHandle ? displaySocialHandle : undefined
						}
						valueClassName={
							creator.socialHandle
								? 'text-white/75'
								: 'italic text-white/35'
						}
					/>
					<CardMetaRow
						label="Key Price"
						// During a background price refresh (#305) the value
						// stays visible — we only swap to a muted style and add
						// an `aria-busy` marker so assistive tech announces that
						// the figure may change. Wrapping the text in a fixed-
						// width container preserves layout so the badge does
						// not shift while refreshing.
						value={
							<span
								aria-busy={isPriceRefreshing || undefined}
								data-testid="creator-card-price-badge"
								className={cn(
									'inline-flex min-w-[6.5rem] items-center gap-1.5 tabular-nums',
									isPriceRefreshing && 'opacity-60'
								)}
							>
								{isPriceRefreshing && (
									<span
										aria-hidden="true"
										data-testid="creator-card-price-refresh-indicator"
										className="inline-block size-3 shrink-0 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400"
									/>
								)}
								<span>{keyPriceDisplay}</span>
								{isPriceRefreshing && (
									<span className="sr-only">Refreshing price</span>
								)}
							</span>
						}
						truncateValue={false}
						valueClassName="font-grotesque text-base font-black text-amber-400"
					/>
					{resolvedHolderCount != null && (
						<CardMetaRow
							label="Holders"
							value={
								<span data-testid="creator-card-holders">
									{`${resolvedHolderCount} holders`}
								</span>
							}
							valueClassName="text-white/75"
						/>
					)}
				</div>
				<CreatorListRowDivider className="my-4" />
				<CreatorSocialLinksList
					handle={creator.socialHandle}
					className="mt-4"
				/>
			</div>
			<CreatorListRowDivider className="mt-4 mb-2" />

			{/* #354: grouped purchase actions share one sr-only label for context. */}
			<div
				role="group"
				aria-labelledby={`creator-card-actions-label-${creator.id}`}
				className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<span
					id={`creator-card-actions-label-${creator.id}`}
					className="sr-only"
				>
					Purchase actions for {displayCreatorName}
				</span>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<NetworkFeeHint className="shrink-0" />
					<span className="hidden sm:inline text-xs text-white/40">
						Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono">B</kbd> to quick buy
					</span>
				</div>
				<AsyncButton
					onClick={handleBuy}
					variant={isConnected ? 'default' : 'outline'}
					size="sm"
					isPending={transactionState === 'submitting'}
					pendingText="Processing..."
					disabled={isNetworkMismatch}
					className={cn(
						'rounded-xl font-bold',
						!isConnected && 'border-white/10  hover:bg-white/5'
					)}
				>
					{transactionState === 'success' && (
						<TransactionStatusIcon status="success" />
					)}
					{transactionState === 'submitting' && (
						<TransactionStatusIcon status="pending" />
					)}
					{transactionState === 'failed' && (
						<TransactionStatusIcon status="failed" />
					)}
					<ShoppingCart className="creator-action-icon" />
					{transactionState === 'submitting'
						? 'Processing...'
						: transactionState === 'success'
							? 'Completed'
							: transactionState === 'failed'
								? 'Retry Purchase'
								: 'Buy Key'}
				</AsyncButton>
			</div>

			<BuyActionHelperText
				state={transactionState}
				className="mt-4"
				disabledReason={
					isNetworkMismatch
						? `Switch to ${expectedChainName} to enable purchases.`
						: undefined
				}
			/>

			{!isConnected && <WalletConnectCalloutBanner className="mt-4" />}

			{isConnected && isNetworkMismatch && (
				<NetworkMismatchBanner className="mt-4" />
			)}

			{transactionState === 'failed' && (
				<TransactionRetryNotice
					className="mt-4"
					message="The previous purchase attempt failed before confirmation. Retry the Stellar action to try again."
					retryLabel="Retry Purchase"
					onRetry={runPurchaseAttempt}
				/>
			)}

			<TransactionFailureDrawer
				open={failureDrawerOpen}
				onOpenChange={setFailureDrawerOpen}
				failureDetails={failureDetails}
				onRetry={runPurchaseAttempt}
				onDismiss={() => setFailureDrawerOpen(false)}
			/>
		</div>
	);
};

export default CreatorCard;
