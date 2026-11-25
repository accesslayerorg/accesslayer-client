import { Link } from 'react-router';
import {
	CalendarClock,
	LockKeyhole,
	Trophy,
	Users,
	Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Bounty } from '@/services/bounty.service';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';

const CARD =
	'rounded-2xl border border-white/10 bg-white/[0.02] shadow-xl backdrop-blur-md';

function formatCountdown(deadline: string, nowMs: number): string {
	const remaining = new Date(deadline).getTime() - nowMs;
	if (remaining <= 0) return 'Expired';

	const days = Math.floor(remaining / 86_400_000);
	const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
	const minutes = Math.floor((remaining % 3_600_000) / 60_000);

	if (days > 0) return `${days}d ${hours}h left`;
	if (hours > 0) return `${hours}h ${minutes}m left`;
	return `${minutes}m left`;
}

export interface BountyCardProps {
	bounty: Bounty;
	nowMs: number;
	remainingWinners: number;
	awardedCount: number;
	isCreator: boolean;
	canSubmit: boolean;
	eligibilityReason?: string | null;
	onSubmit?: (bounty: Bounty) => void;
	onReclaim?: (bounty: Bounty) => void;
	isReclaiming?: boolean;
}

export default function BountyCard({
	bounty,
	nowMs,
	remainingWinners,
	awardedCount,
	isCreator,
	canSubmit,
	eligibilityReason,
	onSubmit,
	onReclaim,
	isReclaiming = false,
}: BountyCardProps) {
	const expired = new Date(bounty.deadline).getTime() <= nowMs;
	const claimable = isCreator && expired && bounty.status === 'open';

	return (
		<article
			className={cn(CARD, 'flex flex-col gap-4 p-5')}
			data-testid={`bounty-card-${bounty.id}`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<Link
						to={`/creator/${bounty.keyId}`}
						className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/80 hover:text-amber-300"
					>
						{bounty.keyName}
					</Link>
					<h3 className="mt-1 truncate text-base font-bold text-white">
						{bounty.title}
					</h3>
				</div>
				<span
					className={cn(
						'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
						bounty.status === 'open'
							? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
							: 'border-white/15 bg-white/5 text-white/50'
					)}
				>
					{bounty.status}
				</span>
			</div>

			<p className="line-clamp-2 text-sm text-white/50">
				{bounty.description}
			</p>

			<dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
				<div>
					<dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
						<Wallet className="size-3" aria-hidden="true" /> Reward
					</dt>
					<dd className="mt-1 font-mono font-bold text-emerald-300">
						{formatDisplayKeyPrice(bounty.rewardStroops)}
					</dd>
				</div>
				<div>
					<dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
						<CalendarClock className="size-3" aria-hidden="true" />{' '}
						Deadline
					</dt>
					<dd
						className={cn(
							'mt-1 font-mono font-bold',
							expired ? 'text-rose-300' : 'text-white/80'
						)}
						data-testid={`bounty-countdown-${bounty.id}`}
					>
						{formatCountdown(bounty.deadline, nowMs)}
					</dd>
				</div>
				<div>
					<dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
						<Trophy className="size-3" aria-hidden="true" /> Winners left
					</dt>
					<dd className="mt-1 font-mono font-bold text-white/80">
						<span data-testid={`bounty-remaining-${bounty.id}`}>
							{remainingWinners}
						</span>{' '}
						/ {bounty.winnersLimit}
						<span className="ml-1 text-xs font-normal text-white/35">
							({awardedCount} awarded)
						</span>
					</dd>
				</div>
				<div>
					<dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
						<Users className="size-3" aria-hidden="true" /> Requirement
					</dt>
					<dd className="mt-1 text-xs font-semibold text-white/70">
						{bounty.holderGated ? (
							<span className="inline-flex items-center gap-1">
								<LockKeyhole
									className="size-3 text-amber-400"
									aria-hidden="true"
								/>
								Holders only
							</span>
						) : (
							'Open to all'
						)}
					</dd>
				</div>
			</dl>

			{eligibilityReason && (
				<p
					role="status"
					className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200"
				>
					{eligibilityReason}
				</p>
			)}

			<div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-4">
				<Link
					to={`/bounties/${bounty.id}`}
					className="text-xs font-semibold text-white/45 hover:text-white"
				>
					Manage submissions
				</Link>
				<div className="flex items-center gap-2">
					{claimable && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => onReclaim?.(bounty)}
							disabled={isReclaiming}
							data-testid={`bounty-reclaim-${bounty.id}`}
							className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
						>
							{isReclaiming ? 'Reclaiming…' : 'Reclaim unpaid rewards'}
						</Button>
					)}
					{onSubmit && bounty.status === 'open' && !expired && (
						<Button
							size="sm"
							onClick={() => onSubmit(bounty)}
							disabled={!canSubmit}
							data-testid={`bounty-submit-${bounty.id}`}
							className="bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300 disabled:bg-white/10 disabled:text-white/30"
						>
							Submit work
						</Button>
					)}
				</div>
			</div>
		</article>
	);
}
