import { format, parseISO, isValid } from 'date-fns';
import { Award, ShieldAlert, User, Calendar } from 'lucide-react';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Tooltip } from '@/components/ui/tooltip';
import TruncatedAddress from '@/components/common/TruncatedAddress';
import type { SoulboundBadge } from '@/types/badge.types';

interface BadgeDetailPopoverProps {
	badge: SoulboundBadge;
	children: React.ReactNode;
}

export function BadgeDetailPopover({ badge, children }: BadgeDetailPopoverProps) {
	const parsedDate = parseISO(badge.awardedAt);
	const formattedDate = isValid(parsedDate)
		? format(parsedDate, 'MMMM d, yyyy')
		: 'Date unavailable';

	return (
		<Popover>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent
				className="w-80 rounded-xl border border-white/10 bg-[#0b1728] p-4 text-white shadow-2xl"
				align="center"
			>
				<div className="space-y-3">
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-2">
							<div className="rounded-lg bg-amber-400/10 p-2 text-amber-400">
								<Award className="size-5" />
							</div>
							<div>
								<h4 className="font-semibold text-white">{badge.name}</h4>
								<span className="font-mono text-[10px] uppercase tracking-wider text-amber-300">
									{badge.badgeType}
								</span>
							</div>
						</div>

						<Tooltip content="Soulbound badge: This badge is permanently bound to this account and cannot be transferred or sold.">
							<span
								data-testid="soulbound-non-transferable-badge"
								className="inline-flex cursor-help items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
							>
								<ShieldAlert className="size-3" />
								Non-transferable
							</span>
						</Tooltip>
					</div>

					<p className="text-xs leading-relaxed text-white/70">
						{badge.description}
					</p>

					<div className="space-y-1.5 border-t border-white/10 pt-2 text-xs">
						<div className="flex items-center justify-between text-white/60">
							<span className="flex items-center gap-1">
								<User className="size-3" /> Issuing Authority
							</span>
							<span className="font-mono text-white">
								<TruncatedAddress address={badge.issuer} />
							</span>
						</div>

						<div className="flex items-center justify-between text-white/60">
							<span className="flex items-center gap-1">
								<Calendar className="size-3" /> Awarded Date
							</span>
							<span className="text-white/80">{formattedDate}</span>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export default BadgeDetailPopover;
