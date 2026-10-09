import { Link } from 'react-router';
import { Coins, Star, TrendingUp, Users } from 'lucide-react';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import { cn } from '@/lib/utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatCompactNumber } from '@/utils/numberFormat.utils';
import type {
	CreatorKeyStatus,
	CreatorKeySummary,
} from '@/types/creatorProfile';

const STATUS_LABELS: Record<CreatorKeyStatus, string> = {
	live: 'Live',
	scheduled: 'Scheduled',
	deprecated: 'Deprecated',
};

const STATUS_STYLES: Record<CreatorKeyStatus, string> = {
	live: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
	scheduled: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
	deprecated: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
};

interface DeployedCreatorKeyCardProps {
	keySummary: CreatorKeySummary;
	className?: string;
}

/**
 * One deployed creator key on the public profile grid (#1054): live status,
 * current price and an invest CTA that opens the key's detail page.
 */
const DeployedCreatorKeyCard: React.FC<DeployedCreatorKeyCardProps> = ({
	keySummary,
	className,
}) => {
	const { id, title, handle, avatarUrl, category, priceStroops, status } =
		keySummary;

	const metrics = [
		{
			id: 'holders',
			icon: Users,
			label: 'Holders',
			value: formatCompactNumber(keySummary.holderCount),
		},
		{
			id: 'volume',
			icon: TrendingUp,
			label: 'Volume',
			value: formatDisplayKeyPrice(keySummary.volumeStroops),
		},
		{
			id: 'rating',
			icon: Star,
			label: 'Rating',
			value:
				keySummary.rating != null
					? keySummary.rating.toFixed(1)
					: 'Unrated',
		},
	];

	return (
		<article
			data-testid="deployed-key-card"
			className={cn(
				'group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/40 hover:bg-white/[0.06]',
				className
			)}
		>
			<div>
				<div className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<div className="size-11 shrink-0 overflow-hidden rounded-xl border border-white/10">
							<CreatorInitialsAvatar
								name={title}
								creatorId={id}
								imageSrc={avatarUrl ?? undefined}
								className="text-sm"
							/>
						</div>
						<div className="min-w-0">
							<h3 className="truncate font-jakarta text-sm font-bold text-white transition-colors group-hover:text-amber-300">
								<Link to={`/creator/${id}`}>{title}</Link>
							</h3>
							{handle && (
								<p className="truncate font-mono text-[0.7rem] text-white/45">
									{handle}
								</p>
							)}
						</div>
					</div>

					<span
						data-testid="deployed-key-status"
						data-status={status}
						className={cn(
							'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em]',
							STATUS_STYLES[status]
						)}
					>
						{STATUS_LABELS[status]}
					</span>
				</div>

				{category && (
					<p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/40">
						{category}
					</p>
				)}

				<div className="mt-4 flex items-baseline gap-2">
					<Coins className="size-4 text-amber-400" aria-hidden="true" />
					<span
						data-testid="deployed-key-price"
						className="font-jakarta text-lg font-extrabold text-white"
					>
						{formatDisplayKeyPrice(priceStroops)}
					</span>
					<span className="text-[0.7rem] font-semibold uppercase tracking-wider text-white/40">
						per key
					</span>
				</div>

				<dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
					{metrics.map(({ id: metricId, icon: Icon, label, value }) => (
						<div key={metricId} className="min-w-0">
							<dt className="flex items-center gap-1 text-[0.62rem] font-semibold uppercase tracking-wider text-white/40">
								<Icon className="size-3" aria-hidden="true" />
								<span className="truncate">{label}</span>
							</dt>
							<dd className="mt-1 truncate font-jakarta text-xs font-bold text-white/85">
								{value}
							</dd>
						</div>
					))}
				</dl>
			</div>

			<Link
				to={`/creator/${id}`}
				data-testid="deployed-key-invest-cta"
				aria-label={`Invest in ${title}`}
				className="mt-5 inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111f]"
			>
				Invest
			</Link>
		</article>
	);
};

export default DeployedCreatorKeyCard;
