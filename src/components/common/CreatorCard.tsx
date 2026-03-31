import { useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import type { Course } from '@/services/course.service';
import { cn } from '@/lib/utils';
import { ShoppingCart, Link as LinkIcon, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import showToast from '@/utils/toast.util';
import TransactionRetryNotice from '@/components/common/TransactionRetryNotice';
import CardMetaRow from '@/components/common/CardMetaRow';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import WalletConnectCalloutBanner from '@/components/common/WalletConnectCalloutBanner';
import CreatorSocialLinksList from '@/components/common/CreatorSocialLinksList';
import TransactionStatusIcon from '@/components/common/TransactionStatusIcon';
import MiniStatChip from '@/components/common/MiniStatChip';
import Change24hBadge from '@/components/common/Change24hBadge';
import KeySupplyBadge from '@/components/common/KeySupplyBadge';
import CreatorListRowDivider from '@/components/common/CreatorListRowDivider';
import BuyActionHelperText from '@/components/common/BuyActionHelperText';
import CreatorLabeledStatRow from '@/components/common/CreatorLabeledStatRow';
import NetworkFeeHint from '@/components/common/NetworkFeeHint';

interface CreatorCardProps {
	creator: Course;
	className?: string;
}

const CreatorCard: React.FC<CreatorCardProps> = ({ creator, className }) => {
	const { isConnected } = useAccount();
	const [transactionState, setTransactionState] = useState<
		'idle' | 'submitting' | 'failed' | 'success'
	>('idle');
	const hasFailedOnceRef = useRef(false);

	const runPurchaseAttempt = () => {
		setTransactionState('submitting');
		showToast.loading(`Purchasing keys for ${creator.title}...`);

		window.setTimeout(() => {
			toast.remove();

			if (!hasFailedOnceRef.current) {
				hasFailedOnceRef.current = true;
				setTransactionState('failed');
				return;
			}

			hasFailedOnceRef.current = false;
			setTransactionState('success');
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

		runPurchaseAttempt();
	};

	return (
		<div
			className={cn(
				'group relative overflow-hidden rounded-2xl border cursor-pointer border-white/10 bg-white/5 p-4 transition-all duration-300 md:hover:-translate-y-0.5 md:hover:border-amber-500/25 md:hover:bg-white/[0.08] md:hover:shadow-[0_12px_32px_-20px_rgba(251,191,36,0.5)]',
				className
			)}
		>
			<div className="relative mb-4 aspect-square overflow-hidden rounded-xl">
				<CreatorInitialsAvatar
					name={creator.title}
					imageSrc={creator.thumbnail}
					imageClassName="transition-transform duration-500 md:group-hover:scale-[1.03]"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 md:group-hover:opacity-100" />
				{creator.volume24h !== undefined && (
					<div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-slate-950/75 border border-white/10 px-2.5 py-1 backdrop-blur-md">
						<TrendingUp className="size-3 text-emerald-400" />
						<span className="text-xs font-bold text-white/90">
							{creator.volume24h > 0
								? `${creator.volume24h} ETH`
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
				<p className="font-jakarta text-sm text-white/50">
					@{creator.instructorId || 'creator'}
				</p>

				{creator.socialHandle ? (
					<div className="mt-2 flex items-center gap-1.5 text-xs text-white/60">
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
					<MiniStatChip label="Price" value={`${creator.price} ETH`} />
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
								? `${creator.creatorShareSupply} shares`
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
						value={`${creator.price} ETH`}
						truncateValue={false}
						valueClassName="font-grotesque text-base font-black text-amber-400"
					/>
				</div>
				<CreatorSocialLinksList
					handle={creator.socialHandle}
					className="mt-4"
				/>
			</div>

			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<NetworkFeeHint className="shrink-0" />
				<Button
					onClick={handleBuy}
					variant={isConnected ? 'default' : 'outline'}
					size="sm"
					disabled={transactionState === 'submitting'}
					className={cn(
						'rounded-xl font-bold cursor-pointer ',
						!isConnected && 'border-white/10  hover:bg-white/5'
					)}
				>
					{transactionState === 'success' && (
						<TransactionStatusIcon status="success" className="mr-2" />
					)}
					{transactionState === 'submitting' && (
						<TransactionStatusIcon status="pending" className="mr-2" />
					)}
					{transactionState === 'failed' && (
						<TransactionStatusIcon status="failed" className="mr-2" />
					)}
					<ShoppingCart className="mr-2 size-4" />
					{transactionState === 'submitting'
						? 'Processing...'
						: transactionState === 'success'
							? 'Completed'
							: transactionState === 'failed'
								? 'Retry Purchase'
								: 'Buy Key'}
				</Button>
			</div>

			<BuyActionHelperText state={transactionState} className="mt-4" />

			{!isConnected && <WalletConnectCalloutBanner className="mt-4" />}

			{transactionState === 'failed' && (
				<TransactionRetryNotice
					className="mt-4"
					message="The previous purchase attempt failed before confirmation. Retry the Stellar action to try again."
					retryLabel="Retry Purchase"
					onRetry={runPurchaseAttempt}
				/>
			)}
		</div>
	);
};

export default CreatorCard;
