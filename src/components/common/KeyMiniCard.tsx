import { Link } from 'react-router';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import Change24hBadge from '@/components/common/Change24hBadge';
import { formatCreatorHandle } from '@/utils/handleDisplay.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatPercent } from '@/utils/numberFormat.utils';
import { cn } from '@/lib/utils';
import type { RelatedKey } from '@/services/relatedKeys.service';

export interface KeyMiniCardProps {
	item: RelatedKey;
	onClick?: (item: RelatedKey) => void;
	className?: string;
}

/**
 * Compact key card (avatar, handle, price, 24h change) linking to the key
 * detail page (#1318).
 */
export default function KeyMiniCard({
	item,
	onClick,
	className,
}: KeyMiniCardProps) {
	const handle = formatCreatorHandle(item.handle);
	const label = item.name?.trim() || handle || 'Unnamed key';

	return (
		<Link
			to={`/creator/${item.id}`}
			onClick={() => onClick?.(item)}
			aria-label={`View ${label}`}
			data-testid="key-mini-card"
			className={cn(
				'flex w-44 shrink-0 snap-start flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition-colors hover:border-amber-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
				className
			)}
		>
			<div className="flex items-center gap-3">
				<div className="size-10 shrink-0 overflow-hidden rounded-full border border-white/15 bg-slate-800">
					<CreatorInitialsAvatar
						name={label}
						creatorId={item.id}
						imageSrc={item.avatarUrl ?? undefined}
						className="size-full text-sm font-bold"
					/>
				</div>
				<p
					data-testid="key-mini-card-handle"
					className="min-w-0 truncate font-mono text-xs text-white/70"
				>
					{handle || label}
				</p>
			</div>
			<div className="flex items-center justify-between gap-2">
				<span
					data-testid="key-mini-card-price"
					className="font-jakarta text-sm font-extrabold text-white"
				>
					{formatDisplayKeyPrice(item.priceStroops)}
				</span>
				<Change24hBadge change={item.change24h ?? undefined} />
			</div>
			{item.holderOverlapPct != null && (
				<p
					data-testid="key-mini-card-overlap"
					className="text-[0.7rem] text-white/45"
				>
					{formatPercent(item.holderOverlapPct, { maximumFractionDigits: 0 })}{' '}
					shared holders
				</p>
			)}
		</Link>
	);
}
