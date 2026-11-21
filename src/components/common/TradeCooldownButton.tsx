import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import type { ActiveTradeCooldown } from '@/utils/tradeCooldown.utils';
import {
	formatTradeCooldownTooltip,
	getCooldownRemainingSeconds,
} from '@/utils/tradeCooldown.utils';
import { formatCooldownDuration } from '@/utils/buyCooldown.utils';

export interface TradeCooldownButtonProps {
	/** The active cooldown, or `null` when trading is currently allowed. */
	cooldown: ActiveTradeCooldown | null;
	/** Base button label, e.g. "Buy" or "Sell". */
	label: string;
	/** Called when the button is clicked and no cooldown blocks the action. */
	onClick?: () => void;
	/** Variant for the underlying Button (e.g. `default` for Buy, `outline` for Sell). */
	variant?: React.ComponentProps<typeof Button>['variant'];
	size?: React.ComponentProps<typeof Button>['size'];
	className?: string;
	/**
	 * Extra props forwarded to the underlying button, e.g. `data-testid` or an
	 * additional `disabled` for unrelated reasons (network mismatch, submit
	 * in flight). During a cooldown the cooldown disable always wins.
	 */
	buttonProps?: Omit<
		React.ComponentPropsWithoutRef<'button'>,
		'children' | 'onClick'
	> & {
		/** Arbitrary data-* attributes (e.g. test ids) are allowed here. */
		'data-testid'?: string;
	};
}

/**
 * Trade button that shows an active cooldown countdown in place of its label
 * while a cooldown is in force (#998).
 *
 * During the cooldown the button is fully disabled (no click, no keyboard
 * activation) and shows e.g. "Cooldown 4m 32s", accurate to the second and
 * updating live. A tooltip explains the cooldown policy set by the key's
 * creator. The moment the countdown reaches zero the regular label is
 * restored and the button re-enables — no reload required.
 *
 * With no cooldown (`cooldown === null`) this renders an ordinary button,
 * so existing behaviour is untouched.
 */
export const TradeCooldownButton: React.FC<TradeCooldownButtonProps> = ({
	cooldown,
	label,
	onClick,
	variant,
	size,
	className,
	buttonProps,
}) => {
	const [remainingSeconds, setRemainingSeconds] = useState(() =>
		cooldown ? getCooldownRemainingSeconds(cooldown) : 0
	);
	// Pull `disabled` out so the spread below can never clobber the
	// cooldown-enforced disabled state.
	const { disabled: externalDisabled = false, ...restButtonProps } =
		buttonProps ?? {};

	useEffect(() => {
		if (!cooldown) {
			setRemainingSeconds(0);
			return;
		}

		setRemainingSeconds(getCooldownRemainingSeconds(cooldown));

		const intervalId = window.setInterval(() => {
			setRemainingSeconds(getCooldownRemainingSeconds(cooldown));
		}, 1000);

		return () => window.clearInterval(intervalId);
	}, [cooldown]);

	const isOnCooldown = cooldown != null && remainingSeconds > 0;

	const button = (
		<Button
			type="button"
			variant={variant}
			size={size}
			className={className}
			onClick={isOnCooldown ? undefined : onClick}
			disabled={isOnCooldown || externalDisabled}
			aria-disabled={isOnCooldown || externalDisabled || undefined}
			{...restButtonProps}
		>
			{isOnCooldown ? (
				<span
					className="inline-flex items-center gap-1.5"
					data-testid="trade-cooldown-countdown"
				>
					<Timer className="size-3.5 shrink-0" aria-hidden="true" />
					<span
						className="font-mono tabular-nums"
						data-testid="trade-cooldown-text"
					>
						{`Cooldown ${formatCooldownDuration(remainingSeconds)}`}
					</span>
				</span>
			) : (
				label
			)}
		</Button>
	);

	if (!isOnCooldown) {
		return button;
	}

	return (
		<Tooltip
			content={formatTradeCooldownTooltip(
				remainingSeconds,
				cooldown.cooldownDurationSeconds
			)}
		>
			{button}
		</Tooltip>
	);
};

export default TradeCooldownButton;
