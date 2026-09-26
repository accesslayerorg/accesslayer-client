import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import makeBlockie from 'ethereum-blockies-base64';
import type { RecentlyViewedKey } from '@/hooks/useRecentlyViewed';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import {
	formatDisplayKeyPrice,
	resolveCreatorKeyPriceStroops,
} from '@/utils/keyPriceDisplay.utils';
import { cn } from '@/lib/utils';

type Props = {
	creator: RecentlyViewedKey;
};

export default function RecentlyViewedKeyCard({ creator }: Props) {
	const name = creator.title || 'Unnamed creator';
	const blockie = creator.walletAddress
		? makeBlockie(creator.walletAddress)
		: undefined;
	const price = formatDisplayKeyPrice(resolveCreatorKeyPriceStroops(creator));

	const hasUp = creator.change24h != null && creator.change24h > 0;
	const hasDown = creator.change24h != null && creator.change24h < 0;

	return (
		<Link
			to={`/creator/${creator.id}`}
			className="group relative flex flex-col rounded-2xl border border-black/8 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm"
			data-testid={`recently-viewed-card-${creator.id}`}
		>
			<div className="flex items-center gap-3">
				{/* Avatar */}
				<div className="size-11 shrink-0 overflow-hidden rounded-full bg-gray-100">
					{blockie ? (
						<img
							src={blockie}
							alt={name}
							className="size-full object-cover"
							style={{ imageRendering: 'pixelated' }}
						/>
					) : (
						<CreatorInitialsAvatar
							name={name}
							creatorId={creator.id}
							imageSrc={creator.avatarUri}
						/>
					)}
				</div>

				{/* Name */}
				<h3 className="min-w-0 flex-1 truncate font-jakarta text-sm font-semibold text-gray-900">
					{name}
				</h3>
			</div>

			{/* Price + change */}
			<div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
				<span className="font-jakarta text-xs font-semibold text-gray-900">
					{price}
				</span>
				{creator.change24h != null ? (
					<span
						className={cn(
							'font-mono text-xs tabular-nums',
							hasUp && 'text-emerald-600',
							hasDown && 'text-red-500',
							!hasUp && !hasDown && 'text-gray-500'
						)}
					>
						{hasUp ? '+' : ''}
						{creator.change24h.toFixed(1)}%
					</span>
				) : null}
			</div>

			<ArrowRight className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
		</Link>
	);
}
