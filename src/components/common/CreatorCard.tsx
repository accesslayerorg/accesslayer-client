import { useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import type { Course } from '@/services/course.service';
import { cn } from '@/lib/utils';
import { ShoppingCart, Wallet, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import showToast from '@/utils/toast.util';
import TransactionRetryNotice from '@/components/common/TransactionRetryNotice';
import CardMetaRow from '@/components/common/CardMetaRow';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import CompactEmptyWalletState from '@/components/common/CompactEmptyWalletState';

interface CreatorCardProps {
	creator: Course;
	className?: string;
}

const CreatorCard: React.FC<CreatorCardProps> = ({ creator, className }) => {
	const { isConnected } = useAccount();
	const [transactionState, setTransactionState] = useState<
		'idle' | 'submitting' | 'failed'
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
			setTransactionState('idle');
			showToast.transactionSuccess(
				'Purchase Successful!',
				`You successfully bought a key for ${creator.title}`
			);
		}, 1500);
	};

	const handleBuy = () => {
		if (!isConnected) {
			toast.error('Please connect your wallet to purchase keys', {
				icon: <Wallet className="size-5 text-amber-500" />,
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
				<img
					src={creator.thumbnail || '/icons/avatar.png'}
					alt={creator.title}
					className="size-full object-cover transition-transform duration-500 md:group-hover:scale-[1.03]"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 md:group-hover:opacity-100" />
			</div>

			<div className="mb-4">
				<div className="flex items-center gap-2">
					<h3 className="font-jakarta text-lg font-bold text-white">
						{creator.title}
					</h3>
					<VerifiedBadge
						verified={Boolean(creator.isVerified)}
						reserveSpace={true}
					/>
				</div>
				<p className="font-jakarta text-sm text-white/50">
					@{creator.instructorId || 'creator'}
				</p>
				<div className="mt-3 space-y-1.5">
					<CardMetaRow
						label={
							<span className="inline-flex items-center gap-1.5">
								<LinkIcon className="size-3 text-amber-500/70" />
								Handle
							</span>
						}
						value={creator.socialHandle ? `@${creator.socialHandle}` : 'No public handle'}
						valueTitle={creator.socialHandle ? `@${creator.socialHandle}` : undefined}
						valueClassName={creator.socialHandle ? 'text-white/75' : 'italic text-white/35'}
					/>
					<CardMetaRow
						label="Key Price"
						value={`${creator.price} ETH`}
						truncateValue={false}
						valueClassName="font-grotesque text-base font-black text-amber-400"
					/>
				</div>
			</div>

			<div className="flex items-center justify-end gap-4">
				<Button
					onClick={handleBuy}
					variant={isConnected ? 'default' : 'outline'}
					size="sm"
					disabled={transactionState === 'submitting'}
					className={cn(
						'rounded-xl font-bold cursor-pointer ',
						!isConnected &&
							'border-white/10  hover:bg-white/5'
					)}
				>
					<ShoppingCart className="mr-2 size-4" />
					{transactionState === 'submitting' ? 'Processing...' : 'Buy Key'}
				</Button>
			</div>

			{!isConnected && (
				<div className="mt-4 space-y-3">
					<div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-amber-500/70">
						<Wallet className="size-3" />
						Wallet Required
					</div>
					<CompactEmptyWalletState />
				</div>
			)}

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
