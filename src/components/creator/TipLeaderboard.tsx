import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface TipLeaderboardEntry {
	rank: number;
	wallet: string;
	totalTipped: number;
	isAnonymous?: boolean;
}

interface TipLeaderboardProps {
	entries: TipLeaderboardEntry[];
	className?: string;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function truncateWallet(wallet: string): string {
	if (wallet.length <= 12) return wallet;
	return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function LeaderboardRow({ entry }: { entry: TipLeaderboardEntry }) {
	const medal = MEDAL[entry.rank];
	const label = entry.isAnonymous ? 'Anonymous' : truncateWallet(entry.wallet);

	return (
		<div className="flex items-center gap-3 border-b border-white/8 px-4 py-3 last:border-b-0">
			<span className="w-7 shrink-0 text-center text-sm font-semibold text-white/50">
				{medal ?? entry.rank}
			</span>
			<span
				className={cn(
					'min-w-0 flex-1 truncate text-sm',
					entry.isAnonymous ? 'italic text-white/40' : 'text-white/80',
				)}
				title={entry.isAnonymous ? undefined : entry.wallet}
			>
				{label}
			</span>
			<span className="shrink-0 text-sm font-medium text-white">
				{formatNumber(entry.totalTipped)} XLM
			</span>
		</div>
	);
}

export default function TipLeaderboard({ entries, className }: TipLeaderboardProps) {
	if (!entries.length) return null;

	return (
		<section
			className={cn(
				'rounded-2xl border border-white/10 bg-white/[0.02] shadow-xl backdrop-blur-md',
				className,
			)}
		>
			<div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
				<Trophy className="size-4 text-yellow-400" aria-hidden />
				<h2 className="text-sm font-semibold text-white">Top Tippers</h2>
			</div>
			<div role="list" aria-label="Top tippers leaderboard">
				{entries.map(entry => (
					<div key={entry.rank} role="listitem">
						<LeaderboardRow entry={entry} />
					</div>
				))}
			</div>
		</section>
	);
}
