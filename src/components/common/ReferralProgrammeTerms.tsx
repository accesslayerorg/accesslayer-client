import React from 'react';
import { buildReferralTerms } from '@/utils/referral.utils';

export interface ReferralProgrammeTermsProps {
	/** Referrer's share of a referred wallet's first-trade fee, in bps. */
	rewardBps: number;
	className?: string;
}

/**
 * Programme terms for the referral dashboard (#963).
 *
 * Explains the fee structure in plain language: what share of the fee a
 * referral earns, that only the referred wallet's first trade counts, and how
 * rewards are withdrawn.
 */
export const ReferralProgrammeTerms: React.FC<ReferralProgrammeTermsProps> = ({
	rewardBps,
	className,
}) => {
	const terms = buildReferralTerms(rewardBps);

	return (
		<section className={className} data-testid="referral-programme-terms">
			<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
				How the referral programme works
			</h2>
			<ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-white/60">
				{terms.map(term => (
					<li key={term} data-testid="referral-term">
						{term}
					</li>
				))}
			</ul>
		</section>
	);
};

export default ReferralProgrammeTerms;
