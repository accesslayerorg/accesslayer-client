import { Mail } from 'lucide-react';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatAbsoluteDateTime } from '@/utils/time.utils';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface RetirementNoticeEmailCardProps {
	keyName: string;
	holdingsCount: number;
	buybackPriceStroops: number | null;
	noticeExpiresAt: string | null;
}

export default function RetirementNoticeEmailCard({
	keyName,
	holdingsCount,
	buybackPriceStroops,
	noticeExpiresAt,
}: RetirementNoticeEmailCardProps) {
	const expiryLabel = noticeExpiresAt
		? (formatAbsoluteDateTime(noticeExpiresAt) ?? noticeExpiresAt)
		: 'No end date announced';

	return (
		<aside
			className="overflow-hidden rounded-2xl border border-red-500/20 bg-white/[0.03] text-white"
			data-testid="retirement-holder-notification"
			aria-label="Retirement notice for key holders"
		>
			<div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/55">
				<Mail className="size-4" aria-hidden="true" />
				<span>Holder notice</span>
				<span className="ml-auto normal-case tracking-normal text-red-300">
					Retirement update
				</span>
			</div>
			<div className="space-y-3 p-5">
				<div className="text-xs text-white/45">
					From <span className="text-white/75">AccessLayer</span>
				</div>
				<h2 className="font-grotesque text-lg font-bold">
					Important update about {keyName}
				</h2>
				<p className="text-sm leading-relaxed text-white/70">
					This key is in its retirement notice period. You currently hold{' '}
					<span className="font-semibold text-white">
						{formatNumber(holdingsCount)}{' '}
						{holdingsCount === 1 ? 'key' : 'keys'}
					</span>
					. You may sell at the market rate before the notice ends, or
					receive the guaranteed buyback price of{' '}
					<span className="font-semibold text-red-300">
						{formatDisplayKeyPrice(buybackPriceStroops)}
					</span>{' '}
					per key when retirement is executed.
				</p>
				<div className="border-t border-white/10 pt-3 text-xs text-white/50">
					Notice period ends: {expiryLabel}
				</div>
				{buybackPriceStroops != null && holdingsCount > 0 && (
					<p className="text-xs text-white/50">
						Estimated guaranteed payout for your current balance:{' '}
						<span className="font-semibold text-white/75">
							{formatNumber(
								(holdingsCount * buybackPriceStroops) / STROOPS_PER_XLM,
								{ minimumFractionDigits: 2, maximumFractionDigits: 4 }
							)}{' '}
							XLM
						</span>
					</p>
				)}
			</div>
		</aside>
	);
}
