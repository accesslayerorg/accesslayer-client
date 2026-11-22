import { useMemo } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Lock } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import Skeleton from '@/components/ui/skeleton';
import { useWalletBadges } from '@/hooks/useWallet';
import { splitBadges } from '@/utils/walletBadges.utils';
import { cn } from '@/lib/utils';
import SocialShareButton from '@/components/common/SocialShareButton';

interface WalletBadgeShowcaseProps {
	wallet: string;
	className?: string;
}

function formatEarnedDate(earnedAt: string): string {
	const date = parseISO(earnedAt);
	return isValid(date) ? format(date, 'MMM d, yyyy') : 'Date unavailable';
}

const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5';

export default function WalletBadgeShowcase({
	wallet,
	className,
}: WalletBadgeShowcaseProps) {
	const { data, isLoading, isError, refetch } = useWalletBadges(wallet);

	const { earned, locked } = useMemo(() => splitBadges(data ?? []), [data]);

	return (
		<section
			id="wallet-badges"
			data-testid="wallet-badge-showcase"
			aria-labelledby="wallet-badges-heading"
			className={cn('space-y-3 scroll-mt-24', className)}
		>
			<h2
				id="wallet-badges-heading"
				className="text-lg font-semibold text-white"
			>
				Badges
			</h2>

			{isLoading ? (
				<div className={GRID_CLASS}>
					{Array.from({ length: 5 }, (_, index) => (
						<Skeleton key={index} className="h-28 w-full" />
					))}
				</div>
			) : isError ? (
				<div className="flex items-center gap-3 rounded-lg border border-white/10 p-4 text-sm text-white/70">
					<span>Couldn't load badges.</span>
					<button
						type="button"
						onClick={() => void refetch()}
						className="rounded-md border border-white/20 px-3 py-1 text-white hover:bg-white/10"
					>
						Retry
					</button>
				</div>
			) : (
				<>
					{earned.length === 0 && (
						<div
							data-testid="wallet-badge-empty-state"
							className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-white/70"
						>
							No badges earned yet. Complete the activities below to earn
							your first badge.
						</div>
					)}

					{earned.length > 0 && (
						<div className={GRID_CLASS}>
							{earned.map(badge => {
								const Icon = badge.icon;
								return (
									<Tooltip key={badge.id} content={badge.criteria}>
										<div
											tabIndex={0}
											data-testid={`wallet-badge-earned-${badge.id}`}
											className="flex w-full flex-col items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
										>
											<Icon className="h-8 w-8 text-white" aria-hidden="true" />
											<span className="text-sm font-medium text-white">
												{badge.name}
											</span>
											<span className="text-xs text-white/60">
												{formatEarnedDate(badge.earnedAt)}
											</span>
											<SocialShareButton
												share={{
													context: 'badge',
													badgeName: badge.name,
													criteria: badge.criteria,
													url:
														typeof window !== 'undefined'
															? `${window.location.origin}/profile/${wallet}`
															: `/profile/${wallet}`,
												}}
												title={`Share "${badge.name}" badge`}
												className="h-auto px-1.5 py-0.5"
												data-testid={`wallet-badge-share-${badge.id}`}
											/>
										</div>
									</Tooltip>
								);
							})}
						</div>
					)}

					{locked.length > 0 && (
						<div className={GRID_CLASS}>
							{locked.map(badge => (
								<Tooltip key={badge.id} content={badge.criteria}>
									<div
										tabIndex={0}
										data-testid={`wallet-badge-locked-${badge.id}`}
										className="flex w-full flex-col items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-center opacity-60 grayscale focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
									>
										<Lock
											className="h-8 w-8 text-white/60"
											aria-hidden="true"
										/>
										<span className="text-sm font-medium text-white/80">
											{badge.name}
										</span>
										<span className="text-xs text-white/60">
											{badge.criteria}
										</span>
										<span className="text-[10px] uppercase tracking-wide text-white/50">
											Locked
										</span>
									</div>
								</Tooltip>
							))}
						</div>
					)}
				</>
			)}
		</section>
	);
}
