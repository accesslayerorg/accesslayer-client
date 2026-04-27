import React, { useRef, useState } from 'react';
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
import VerifiedBadge from '@/components/common/VerifiedBadge';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import WalletConnectCalloutBanner from '@/components/common/WalletConnectCalloutBanner';
import NetworkMismatchBanner from '@/components/common/NetworkMismatchBanner';
import CreatorSocialLinksList from '@/components/common/CreatorSocialLinksList';
import TransactionStatusIcon from '@/components/common/TransactionStatusIcon';
import MiniStatChip from '@/components/common/MiniStatChip';
import Change24hBadge from '@/components/common/Change24hBadge';
import KeySupplyBadge from '@/components/common/KeySupplyBadge';
import { useTransactionTelemetry } from '@/hooks/useTransactionTelemetry';
import { useNetworkMismatch } from '@/hooks/useNetworkMismatch';
import { formatCompactNumber, formatNumber } from '@/utils/numberFormat.utils';

interface CreatorListRowProps {
	creator: Course;
	className?: string;
}

const CreatorListRow: React.FC<CreatorListRowProps> = ({ creator, className }) => {
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
		runPurchaseAttempt();
	};

	return (
		<div
			className={cn(
				'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-300 md:hover:border-amber-500/25 md:hover:bg-white/[0.08] flex flex-col md:flex-row md:items-center gap-6',
				className
			)}
		>
			<div className="relative size-24 shrink-0 overflow-hidden rounded-xl">
				<CreatorInitialsAvatar
					name={creator.title}
					creatorId={creator.id}
					imageSrc={creator.thumbnail}
				/>
				{creator.volume24h !== undefined && (
					<div className="absolute right-1 top-1 z-10 flex items-center gap-1 rounded-full bg-slate-950/75 border border-white/10 px-1.5 py-0.5 backdrop-blur-md">
						<TrendingUp className="size-2.5 text-emerald-400" />
						<span className="text-[0.6rem] font-bold text-white/90">
							{creator.volume24h > 0
								? formatCompactNumber(creator.volume24h)
								: 'New'}
						</span>
					</div>
				)}
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex flex-wrap items-center gap-2">
					<h3 className="font-jakarta text-lg font-bold text-white truncate">
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

				<div className="mt-3 flex flex-wrap gap-2">
					<MiniStatChip label="Price" value={`${formatNumber(creator.price)} ETH`} />
					<MiniStatChip
						label="Category"
						value={creator.category || 'General'}
					/>
					<MiniStatChip label="Level" value={creator.level || 'Open'} />
				</div>
			</div>

			<div className="flex flex-col items-end gap-3 shrink-0">
				<div className="flex items-center gap-3">
					<CreatorSocialLinksList
						handle={creator.socialHandle}
						className="mt-0"
					/>
					<AsyncButton
						onClick={handleBuy}
						variant={isConnected ? 'default' : 'outline'}
						size="sm"
						isPending={transactionState === 'submitting'}
						pendingText="Processing..."
						disabled={isNetworkMismatch}
						className={cn(
							'rounded-xl font-bold px-6',
							!isConnected && 'border-white/10 hover:bg-white/5'
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
								? 'Retry'
								: 'Buy Key'}
					</AsyncButton>
				</div>
				
				{isNetworkMismatch && isConnected && (
					<p className="text-[0.65rem] text-amber-400 font-medium">
						Switch to {expectedChainName}
					</p>
				)}
			</div>

			{transactionState === 'failed' && (
				<div className="absolute inset-x-0 bottom-0 px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-[0.7rem] text-red-200/80">
					Purchase failed. Insufficient balance.
				</div>
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

export default CreatorListRow;
