import { useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { AsyncButton } from '@/components/ui/async-button';
import type { Course } from '@/services/course.service';
import { cn } from '@/lib/utils';
import { ShoppingCart, Link as LinkIcon, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import showToast from '@/utils/toast.util';
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
import MiniStatChip from '@/components/common/MiniStatChip';
import Change24hBadge from '@/components/common/Change24hBadge';
import KeySupplyBadge from '@/components/common/KeySupplyBadge';
import CreatorListRowDivider from '@/components/common/CreatorListRowDivider';
import BuyActionHelperText from '@/components/common/BuyActionHelperText';
import CreatorLabeledStatRow from '@/components/common/CreatorLabeledStatRow';
import CreatorBio from '@/components/common/CreatorBio';
import { useTransactionTelemetry } from '@/hooks/useTransactionTelemetry';
import { useNetworkMismatch } from '@/hooks/useNetworkMismatch';
import { formatCompactNumber, formatNumber } from '@/utils/numberFormat.utils';

interface CreatorCardProps {
	creator: Course;
	className?: string;
}

const CreatorCard: React.FC<CreatorCardProps> = ({ creator, className }) => {
	const { isConnected } = useAccount();
	const { isMismatch: isNetworkMismatch, expectedChainName } = useNetworkMismatch();
	const [transactionState, setTransactionState] = useState<
		'idle' | 'submitting' | 'failed' | 'success'
	>('idle');
	const [failureDrawerOpen, setFailureDrawerOpen] = useState(false);
	const [failureDetails, setFailureDetails] = useState<TransactionFailureDetails>({
		errorMessage: '',
	});
	const hasFailedOnceRef = useRef(false);
	const trackTransactionEvent = useTransactionTelemetry();

	const runPurchaseAttempt = () => {
		setTransactionState('submitting');
		trackTransactionEvent('tx_submitted', { creatorId: creator.id, creatorTitle: creator.title });
		showToast.loading(`Purchasing keys for ${creator.title}...`);

		window.setTimeout(() => {
			toast.remove();

			if (!hasFailedOnceRef.current) {
				hasFailedOnceRef.current = true;
				setTransactionState('failed');
				setFailureDetails({
					errorMessage: 'Transaction failed: Insufficient balance to complete the purchase.',
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
			trackTransactionEvent('tx_confirmed', { creatorId: creator.id, creatorTitle: creator.title });
			showToast.transactionSuccess(
				'Purchase Successful!',
				`You successfully bought a key for ${creator.title}`,
				'0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
				'https://stellar.expert/explorer/testnet/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
			);

			window.setTimeout(() => {
				setTransactionState('idle');
			}, 1800);
		}, 1500);
	};

	const handleBuy = () => {
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

		toast.success(`Purchasing keys for ${creator.title}...`, {
			duration: 3000,
		});
		// Implementation for contract interaction would go here
		runPurchaseAttempt();
	};

	return (
		<div
			className={cn(
				'marketplace-card-surface marketplace-card-surface-hover group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 focus-within:ring-2 focus-within:ring-amber-400/40 focus-within:ring-offset-2 focus-within:ring-offset-slate-950 md:hover:-translate-y-0.5 md:hover:border-amber-500/25 md:hover:shadow-[0_12px_32px_-20px_rgba(251,191,36,0.5)]',
				className
			)}
		>
			<div className="relative mb-4 aspect-square overflow-hidden rounded-xl">
				<CreatorInitialsAvatar
					name={creator.title}
					creatorId={creator.id}
					imageSrc={creator.thumbnail}
					imageClassName="transition-transform duration-500 md:group-hover:scale-[1.03]"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 md:group-hover:opacity-100" />
				{creator.volume24h !== undefined && (
					<div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-slate-950/75 border border-white/10 px-2.5 py-1 backdrop-blur-md">
						<TrendingUp className="size-3 text-emerald-400" />
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
					<h3 className="font-jakarta text-lg font-bold text-white">
						{creator.title}
					</h3>
					<VerifiedBadge
						verified={Boolean(creator.isVerified)}
						reserveSpace={true}
					/>
					<Change24hBadge change={creator.change24h} />
					<KeySupplyBadge supply={creator.creatorShareSupply} />
				</div>
				<p className="marketplace-label-muted font-jakarta text-sm">
					@{creator.instructorId || 'creator'}
				</p>

				<CreatorBio bio={creator.description} variant="card" className="mt-2" />

				{creator.socialHandle ? (
					<div className="marketplace-label-muted mt-2 flex items-center gap-1.5 text-xs">
						<LinkIcon className="size-3 text-amber-500/70" />
						<span className="truncate">@{creator.socialHandle}</span>
					</div>
				) : (
					<div className="mt-2 flex items-center gap-1.5 text-xs text-white/30 italic">
						<LinkIcon className="size-3 opacity-50" />
						<span>No public handle</span>
					</div>
				)}

				{/*  Sparkline placeholder */}
				<div className="mt-3">
					<div className="h-10 w-full rounded-lg bg-white/10 animate-pulse" />
				</div>

				<div className="mt-3 flex flex-wrap gap-2">
					<MiniStatChip label="Price" value={`${formatNumber(creator.price)} ETH`} />
					<MiniStatChip
						label="Category"
						value={creator.category || 'General'}
					/>
					<MiniStatChip label="Level" value={creator.level || 'Open'} />
				</div>
				<CreatorListRowDivider className="my-4" />
				<div className="mt-3 space-y-1.5">
					<CreatorLabeledStatRow
						label="Creator Share Supply"
						value={
							creator.creatorShareSupply
								? `${formatCompactNumber(creator.creatorShareSupply)} shares`
								: 'Supply pending'
						}
						className="px-3 py-3"
						labelClassName="text-[0.6rem]"
						valueClassName="text-sm md:text-sm"
					/>
					<CardMetaRow
						label={
							<span className="inline-flex items-center gap-1.5">
								<LinkIcon className="size-3 text-amber-500/70" />
								Handle
							</span>
						}
						value={
							creator.socialHandle
								? `@${creator.socialHandle}`
								: 'No public handle'
						}
						valueTitle={
							creator.socialHandle
								? `@${creator.socialHandle}`
								: undefined
						}
						valueClassName={
							creator.socialHandle
								? 'text-white/75'
								: 'italic text-white/35'
						}
					/>
					<CardMetaRow
						label="Key Price"
						value={`${formatNumber(creator.price)} ETH`}
						truncateValue={false}
						valueClassName="font-grotesque text-base font-black text-amber-400"
					/>
				</div>
				<CreatorSocialLinksList
					handle={creator.socialHandle}
					className="mt-4"
				/>
			</div>

			<div className="flex items-center justify-end gap-4">
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
						<TransactionStatusIcon status="success" className="mr-2" />
					)}
					{transactionState === 'failed' && (
						<TransactionStatusIcon status="failed" className="mr-2" />
					)}
					<ShoppingCart className="mr-2 size-4" />
					{transactionState === 'success'
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
