import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import useTradeCooldown from '@/hooks/useTradeCooldown';

export interface CooldownBadgeProps {
	keyId?: string;
	wallet?: string | null;
	remainingSeconds?: number;
	cooldownDurationSeconds?: number | null;
	nextTradeUnlockAt?: number | string | null;
	nextBuyAllowedAt?: number | string | null;
	className?: string;
}

function formatMmSs(totalSeconds: number): string {
	const safe = Math.max(0, Math.floor(totalSeconds));
	const minutes = Math.floor(safe / 60);
	const seconds = safe % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function normalizeTimestamp(timestamp: number | string): number {
	if (typeof timestamp === 'number') {
		return timestamp > 1e11 ? timestamp : timestamp * 1000;
	}
	return new Date(timestamp).getTime();
}

export const CooldownBadge: React.FC<CooldownBadgeProps> = ({
	keyId = '',
	wallet,
	remainingSeconds: explicitRemaining,
	cooldownDurationSeconds,
	nextTradeUnlockAt,
	nextBuyAllowedAt,
	className,
}) => {
	const live = useTradeCooldown(keyId, wallet);
	const [explicitCountdown, setExplicitCountdown] = useState(
		explicitRemaining ?? 0
	);

	useEffect(() => {
		if (explicitRemaining == null) return;
		setExplicitCountdown(explicitRemaining);
		if (explicitRemaining <= 0) return;
		const intervalId = window.setInterval(() => {
			setExplicitCountdown(current => Math.max(0, current - 1));
		}, 1000);
		return () => window.clearInterval(intervalId);
	}, [explicitRemaining]);

	const remaining =
		explicitRemaining == null ? live.remainingSeconds : explicitCountdown;
	const duration =
		cooldownDurationSeconds ?? live.cooldownDurationSeconds;
	const unlock = nextTradeUnlockAt ?? nextBuyAllowedAt ?? live.cooldownEndsAt;

	if (remaining <= 0 || duration === 0) return null;

	const unlockDate =
		unlock == null ? null : new Date(normalizeTimestamp(unlock));
	const unlockText =
		unlockDate && !Number.isNaN(unlockDate.getTime())
			? unlockDate.toLocaleString()
			: null;
	const tooltip = `You can trade again in ${formatMmSs(remaining)}.${
		duration && duration > 0
			? ` Cooldown duration: ${formatMmSs(duration)}.`
			: ''
	}${unlockText ? ` Next trade unlocks at ${unlockText}.` : ''}`;

	return (
		<Tooltip content={tooltip}>
			<div
				className={cn(
					'inline-flex items-center gap-1.5 rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-300',
					className
				)}
				role="status"
				aria-live="polite"
				aria-label={`Trade cooldown: ${formatMmSs(remaining)} remaining`}
				data-testid="cooldown-badge"
			>
				<Timer className="size-3.5 shrink-0" aria-hidden="true" />
				<span
					className="font-mono tabular-nums"
					data-testid="cooldown-countdown"
				>
					{formatMmSs(remaining)}
				</span>
			</div>
		</Tooltip>
	);
};

export default CooldownBadge;
