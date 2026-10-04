import type { ReactNode } from 'react';
import { useWalletHoldings } from '@/hooks/useWallet';
import { useProfileStore } from '@/hooks/useProfileStore';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface SubscriptionAccessGateProps {
	creatorId: string;
	minimumHolding?: number;
	children: ReactNode;
	onBuyClick?: () => void;
}

export default function SubscriptionAccessGate({
	creatorId,
	minimumHolding = 1,
	children,
	onBuyClick,
}: SubscriptionAccessGateProps) {
	const profile = useProfileStore(state => state.profile);
	const userAddress = profile?.id;
	const { data: holdings = [], isLoading } = useWalletHoldings(
		userAddress ?? ''
	);

	const userPosition = holdings.find(h => h.creatorId === creatorId);
	const quantity = userPosition?.quantity ?? 0;
	const isUnlocked = quantity >= minimumHolding;

	// Mock expiry countdown for now (e.g. 30 days from last buy, defaulting to 30 days from now if not present)
	const expiryDate = userPosition?.last_buy_timestamp
		? new Date(
				new Date(userPosition.last_buy_timestamp).getTime() +
					30 * 24 * 60 * 60 * 1000
		  )
		: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

	if (!userAddress) {
		return (
			<div className="rounded-2xl border border-white/10 bg-[#06111f] p-8 text-center" data-testid="subscription-gate-unconnected">
				<h3 className="mb-2 text-xl font-bold text-white">Wallet Not Connected</h3>
				<p className="mb-4 text-white/70">
					Connect your wallet to verify your key holdings and access this content.
				</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50 animate-pulse" data-testid="subscription-gate-loading">
				Checking subscription status...
			</div>
		);
	}

	if (!isUnlocked) {
		return (
			<div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center" data-testid="subscription-gate-locked">
				<div className="mb-4 text-rose-400">
					<svg
						className="mx-auto h-12 w-12"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						/>
					</svg>
				</div>
				<h3 className="mb-2 text-xl font-bold text-white">Content Locked</h3>
				<p className="mb-6 text-white/70">
					You need at least {minimumHolding} key{minimumHolding === 1 ? '' : 's'}{' '}
					to access this creator's gated content. You currently hold {quantity}.
				</p>
				{onBuyClick && (
					<Button onClick={onBuyClick} variant="default" className="font-bold">
						Buy Keys to Unlock
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-6" data-testid="subscription-gate-unlocked">
			<div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3">
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
						<svg
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div>
						<h4 className="font-bold text-emerald-400">Active Subscription</h4>
						<p className="text-xs text-emerald-400/80">
							You hold {quantity} key{quantity === 1 ? '' : 's'}
						</p>
					</div>
				</div>
				{expiryDate && (
					<div className="text-right">
						<p className="text-xs uppercase tracking-wider text-emerald-400/70">
							Expires
						</p>
						<p className="font-mono text-sm font-semibold text-emerald-400">
							{formatDistanceToNow(expiryDate, { addSuffix: true })}
						</p>
					</div>
				)}
			</div>
			{children}
		</div>
	);
}
