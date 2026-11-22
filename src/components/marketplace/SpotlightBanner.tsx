import { Link } from 'react-router';
import { ArrowRight, Clock, Star } from 'lucide-react';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import { useActiveSpotlight } from '@/hooks/useSpotlightAuction';
import { useNowMs } from '@/hooks/useNowMs';
import { cn } from '@/lib/utils';
import { formatCreatorHandle } from '@/utils/handleDisplay.utils';
import {
	formatHolderCount,
	formatNumber,
	formatXlmPrice,
} from '@/utils/numberFormat.utils';
import { formatSpotlightTimeRemaining } from '@/utils/spotlightAuction.utils';

interface SpotlightBannerProps {
	className?: string;
}

interface SpotlightStatProps {
	label: string;
	value: string;
	testId: string;
}

function SpotlightStat({ label, value, testId }: SpotlightStatProps) {
	return (
		<div className="min-w-0">
			<dt className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/50">
				{label}
			</dt>
			<dd
				data-testid={testId}
				className="mt-1 truncate font-mono text-sm font-semibold tabular-nums text-white"
			>
				{value}
			</dd>
		</div>
	);
}

/**
 * Premium spotlight banner for the marketplace discovery surfaces (#1219).
 *
 * Shows the key currently holding the paid spotlight placement with its live
 * price, 24h volume, holder count and a ticking countdown to the end of the
 * placement. Renders nothing while loading, on error, when no placement is
 * active, or once the countdown reaches zero.
 */
export default function SpotlightBanner({ className }: SpotlightBannerProps) {
	const { data: spotlight } = useActiveSpotlight();
	const nowMs = useNowMs();

	const timeRemaining = formatSpotlightTimeRemaining(spotlight?.endsAt, nowMs);
	if (!spotlight || !timeRemaining) return null;

	const handle = spotlight.creatorHandle
		? formatCreatorHandle(spotlight.creatorHandle)
		: null;

	return (
		<section
			aria-labelledby="spotlight-banner-title"
			data-testid="spotlight-banner"
			className={cn(
				'relative overflow-hidden rounded-3xl border border-amber-300/30 bg-[linear-gradient(120deg,rgba(251,191,36,0.16)_0%,rgba(15,23,42,0.85)_45%,rgba(16,185,129,0.12)_100%)] p-5 shadow-[0_0_60px_-20px_rgba(251,191,36,0.45)] backdrop-blur-md sm:p-7',
				className
			)}
		>
			<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex min-w-0 items-center gap-4">
					<div className="size-14 shrink-0 overflow-hidden rounded-2xl bg-white/10 ring-2 ring-amber-300/40 sm:size-16">
						<CreatorInitialsAvatar
							name={spotlight.creatorName || spotlight.keyName}
							creatorId={spotlight.creatorId}
							imageSrc={spotlight.thumbnail ?? undefined}
						/>
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<span className="inline-flex items-center gap-1 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-amber-300">
								<Star className="size-3.5 fill-amber-300" aria-hidden="true" />
								Spotlight
							</span>
							<span
								data-testid="spotlight-sponsor-label"
								className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-white/70"
							>
								{spotlight.sponsorLabel || 'Sponsored'}
							</span>
						</div>
						<h2
							id="spotlight-banner-title"
							data-testid="spotlight-key-name"
							className="mt-1 truncate font-grotesque text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
						>
							{spotlight.keyName}
						</h2>
						<p
							data-testid="spotlight-creator"
							className="truncate font-jakarta text-sm text-white/60"
						>
							by {spotlight.creatorName}
							{handle && <span className="text-white/40"> · {handle}</span>}
						</p>
					</div>
				</div>

				<dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:flex-1 lg:max-w-2xl">
					<SpotlightStat
						label="Price"
						value={formatXlmPrice(spotlight.priceXlm)}
						testId="spotlight-price"
					/>
					<SpotlightStat
						label="24h volume"
						value={`${formatNumber(spotlight.volume24hXlm, { style: 'compact' })} XLM`}
						testId="spotlight-volume"
					/>
					<SpotlightStat
						label="Holders"
						value={formatHolderCount(spotlight.holderCount)}
						testId="spotlight-holders"
					/>
					<div className="min-w-0">
						<dt className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/50">
							<Clock className="size-3" aria-hidden="true" />
							Ends in
						</dt>
						<dd
							role="timer"
							aria-live="off"
							data-testid="spotlight-countdown"
							className="mt-1 font-mono text-sm font-semibold tabular-nums text-amber-200"
						>
							{timeRemaining}
						</dd>
					</div>
				</dl>

				<Link
					to={`/creator/${spotlight.creatorId}`}
					data-testid="spotlight-buy-now"
					aria-label={`Buy ${spotlight.keyName} keys now`}
					className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-amber-400 px-6 font-jakarta text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
				>
					Buy Now
					<ArrowRight className="size-4" aria-hidden="true" />
				</Link>
			</div>
		</section>
	);
}
