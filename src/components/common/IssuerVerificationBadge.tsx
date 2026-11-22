import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import type {
	IssuerVerification,
	IssuerVerificationTier,
} from '@/services/issuerVerification.service';
import { useIssuerVerification } from '@/hooks/useIssuerVerification';

const TIER_LABELS: Record<IssuerVerificationTier, string> = {
	basic: 'Basic',
	enhanced: 'Enhanced',
	institutional: 'Institutional',
};

const TIER_COLOURS: Record<IssuerVerificationTier, string> = {
	basic: 'border-white/15 bg-white/[0.06] text-white/70',
	enhanced: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
	institutional: 'border-amber-400/35 bg-amber-400/10 text-amber-300',
};

export interface IssuerVerificationBadgeProps {
	/** Issuer wallet address used for GET /issuers/:wallet/verification. */
	wallet?: string | null;
	/** Pre-fetched verification; skips the network call when provided. */
	verification?: IssuerVerification | null;
	/** Show the expiry date in a tooltip (issuer profile header). */
	showExpiryTooltip?: boolean;
	className?: string;
}

/**
 * Issuer verification tier badge (#1233).
 *
 * Renders Basic (grey) / Enhanced (blue) / Institutional (gold) chips for
 * verified issuers. Nothing is shown for unverified issuers or when the
 * verification lookup fails.
 */
export const IssuerVerificationBadge: React.FC<IssuerVerificationBadgeProps> = ({
	wallet,
	verification,
	showExpiryTooltip = false,
	className,
}) => {
	const { data: fetched, isLoading } = useIssuerVerification(
		wallet ?? '',
		!verification && !!wallet
	);
	const data = verification ?? fetched;

	if (verification === undefined && isLoading) return null;
	if (!data || !data.verified) return null;

	const label = TIER_LABELS[data.tier] ?? TIER_LABELS.basic;

	const badge = (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
				TIER_COLOURS[data.tier] ?? TIER_COLOURS.basic,
				className
			)}
			data-testid="issuer-verification-badge"
			data-tier={data.tier}
		>
			<ShieldCheck className="size-3" aria-hidden="true" />
			{label}
		</span>
	);

	if (showExpiryTooltip) {
		return (
			<Tooltip
				content={
					data.expiresAt
						? `Verification expires ${new Date(data.expiresAt).toLocaleDateString()}`
						: 'No verification expiry recorded'
				}
			>
				{badge}
			</Tooltip>
		);
	}

	return badge;
};

export default IssuerVerificationBadge;
