import { useEffect, useState } from 'react';
import { Gift, X } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useReceivedGifts } from '@/hooks/useWallet';
import { formatNumber } from '@/utils/numberFormat.utils';
import type { ReceivedGift } from '@/utils/giftKey.utils';
import { cn } from '@/lib/utils';

export interface GiftReceivedBannerProps {
	className?: string;
}

const lastSeenKey = (address: string) => `accesslayer.gifts.lastSeen.${address}`;

function readLastSeen(address: string): number {
	try {
		return Number(window.localStorage.getItem(lastSeenKey(address))) || 0;
	} catch {
		return 0;
	}
}

function writeLastSeen(address: string, value: number) {
	try {
		window.localStorage.setItem(lastSeenKey(address), String(value));
	} catch {
		// Storage may be unavailable (private mode); the banner then shows all gifts.
	}
}

function shortAddress(address: string) {
	return address.length > 12
		? `${address.slice(0, 6)}…${address.slice(-4)}`
		: address;
}

interface ReceivedGiftNoticeProps {
	address: string;
	className?: string;
}

const ReceivedGiftNotice = ({
	address,
	className,
}: ReceivedGiftNoticeProps) => {
	const { data: gifts = [] } = useReceivedGifts(address);
	const [lastVisit] = useState(() => readLastSeen(address));
	const [dismissed, setDismissed] = useState(false);

	// Record the visit so each gift is announced once.
	useEffect(() => {
		writeLastSeen(address, Date.now());
	}, [address]);

	if (dismissed) return null;

	const received: ReceivedGift[] = gifts
		.filter(gift => gift.receivedAt > lastVisit)
		.sort((a, b) => b.receivedAt - a.receivedAt);

	if (received.length === 0) return null;

	const latest = received[0];
	const sender = latest.fromName?.trim() || shortAddress(latest.from);

	return (
		<div
			role="status"
			className={cn(
				'flex items-start gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4',
				className
			)}
			data-testid="gift-received-banner"
		>
			<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
				<Gift className="size-5" aria-hidden="true" />
			</div>
			<div className="min-w-0 flex-1">
				<p
					className="text-sm font-semibold text-white"
					data-testid="gift-received-summary"
				>
					{sender} sent you {formatNumber(latest.quantity)}{' '}
					{latest.keyName ?? 'key'}
					{latest.quantity === 1 ? '' : 's'}
					{received.length > 1 ? ` (+${received.length - 1} more)` : ''}
				</p>
				{latest.message && (
					<p
						className="mt-1 break-words text-sm text-white/70"
						data-testid="gift-received-message"
					>
						{latest.message}
					</p>
				)}
			</div>
			<button
				type="button"
				onClick={() => setDismissed(true)}
				aria-label="Dismiss gift notification"
				className="shrink-0 rounded-lg p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
				data-testid="gift-received-dismiss"
			>
				<X className="size-4" />
			</button>
		</div>
	);
};

/**
 * Confirms key gifts a wallet received since its last portfolio visit.
 *
 * Rendered only once a wallet is connected so the gift query stays idle
 * (and the banner invisible) for visitors without a session.
 */
const GiftReceivedBanner = ({ className }: GiftReceivedBannerProps) => {
	const { address } = useAccount();

	if (!address) return null;

	return (
		<ReceivedGiftNotice key={address} address={address} className={className} />
	);
};

export default GiftReceivedBanner;
