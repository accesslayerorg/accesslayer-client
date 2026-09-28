import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhitelistStatusBadgeProps {
	className?: string;
	label?: string;
}

/**
 * Whitelist status badge shown on the key detail page for locked-out / non-whitelisted visitors (#1031).
 */
export const WhitelistStatusBadge: React.FC<WhitelistStatusBadgeProps> = ({
	className,
	label = 'Whitelist Only',
}) => {
	return (
		<span
			data-testid="whitelist-status-badge"
			className={cn(
				'inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur-sm',
				className
			)}
			title="This key is currently in early access and only accessible to whitelisted wallets"
		>
			<Lock className="size-3 text-amber-400 shrink-0" aria-hidden="true" />
			<span>{label}</span>
		</span>
	);
};

export default WhitelistStatusBadge;
