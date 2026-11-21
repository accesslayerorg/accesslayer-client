import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, Share2, Link as LinkIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGraduatedCurveConfig } from '@/hooks/useGraduatedCurveConfig';
import { playPurchaseConfetti } from '@/utils/confetti.utils';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import {
	buildGraduationReferralLink,
	buildGraduationStats,
	buildGraduationTweetUrl,
	hasCelebratedThisSession,
	hasKeyGraduated,
	markCelebratedThisSession,
} from '@/utils/graduation.utils';

export interface GraduationCelebrationProps {
	keyId: string;
	keyName: string;
	currentSupply?: number | null;
	holderCount?: number | null;
	/** Connected wallet; included in the copied link as the referral code. */
	walletAddress?: string | null;
	className?: string;
}

/**
 * Graduation card for the key detail page (#1110). Appears once the key's
 * supply reaches its final curve milestone, plays confetti once per session
 * per key, and offers a pre-filled share and a referral link.
 */
export const GraduationCelebration: React.FC<GraduationCelebrationProps> = ({
	keyId,
	keyName,
	currentSupply,
	holderCount,
	walletAddress,
	className,
}) => {
	const { data: config } = useGraduatedCurveConfig(keyId);
	const graduated = hasKeyGraduated(config, currentSupply);
	const [copied, setCopied] = useState(false);
	const played = useRef(false);

	useEffect(() => {
		if (!graduated || played.current) return;
		played.current = true;
		if (hasCelebratedThisSession(keyId)) return;
		markCelebratedThisSession(keyId);
		playPurchaseConfetti(3000);
	}, [graduated, keyId]);

	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 2000);
		return () => clearTimeout(timer);
	}, [copied]);

	const stats = graduated ? buildGraduationStats(config, holderCount) : null;
	if (!graduated || !stats) return null;

	const link = buildGraduationReferralLink(keyId, walletAddress);
	const tweetUrl = buildGraduationTweetUrl({ keyName, stats, link });

	const handleCopy = async () => {
		try {
			await copyTextToClipboard(link);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	};

	return (
		<section
			className={cn(
				'rounded-[2rem] border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-emerald-400/5 p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			aria-labelledby="graduation-heading"
			data-testid="graduation-card"
		>
			<div className="flex items-center gap-3">
				<GraduationCap
					className="h-6 w-6 text-amber-300"
					aria-hidden="true"
				/>
				<h2
					id="graduation-heading"
					className="font-grotesque text-xl font-black tracking-tight text-white"
				>
					{keyName} has graduated!
				</h2>
			</div>
			<p className="mt-2 text-sm text-white/65">
				This key reached its final supply milestone. Thank you to every
				holder.
			</p>

			<dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div>
					<dt className="text-xs text-white/50">Final supply</dt>
					<dd
						className="text-lg font-bold tabular-nums text-white"
						data-testid="graduation-stat-supply"
					>
						{formatNumber(stats.finalSupply)}
					</dd>
				</div>
				<div>
					<dt className="text-xs text-white/50">Milestones passed</dt>
					<dd
						className="text-lg font-bold tabular-nums text-white"
						data-testid="graduation-stat-milestones"
					>
						{formatNumber(stats.milestonesReached)}
					</dd>
				</div>
				<div>
					<dt className="text-xs text-white/50">Price at graduation</dt>
					<dd
						className="text-lg font-bold tabular-nums text-white"
						data-testid="graduation-stat-price"
					>
						{stats.graduationPriceXlm != null
							? `${formatNumber(stats.graduationPriceXlm)} XLM`
							: '—'}
					</dd>
				</div>
				<div>
					<dt className="text-xs text-white/50">Holders</dt>
					<dd
						className="text-lg font-bold tabular-nums text-white"
						data-testid="graduation-stat-holders"
					>
						{stats.holderCount != null
							? formatNumber(stats.holderCount)
							: '—'}
					</dd>
				</div>
			</dl>

			<div
				className="mt-6 flex flex-wrap gap-3"
				data-testid="graduation-share"
			>
				<Button asChild variant="default">
					<a
						href={tweetUrl}
						target="_blank"
						rel="noopener noreferrer"
						data-testid="graduation-share-tweet"
					>
						<Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
						Share on X
					</a>
				</Button>
				<Button
					type="button"
					variant="ghost"
					onClick={handleCopy}
					data-testid="graduation-copy-link"
				>
					{copied ? (
						<Check className="mr-2 h-4 w-4" aria-hidden="true" />
					) : (
						<LinkIcon className="mr-2 h-4 w-4" aria-hidden="true" />
					)}
					{copied ? 'Link copied' : 'Copy referral link'}
				</Button>
				<span className="sr-only" role="status" aria-live="polite">
					{copied ? 'Referral link copied to clipboard' : ''}
				</span>
			</div>
		</section>
	);
};

export default GraduationCelebration;
