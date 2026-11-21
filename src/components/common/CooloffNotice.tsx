import * as React from 'react';
import { Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	computeRemainingCooldownSeconds,
	formatCooldownDuration,
} from '@/utils/buyCooldown.utils';

export interface CooloffNoticeProps {
	cooloffEndsAt?: number | string | null;
	onExpire?: () => void;
	className?: string;
}

const CooloffNotice: React.FC<CooloffNoticeProps> = ({
	cooloffEndsAt,
	onExpire,
	className,
}) => {
	const [remainingSeconds, setRemainingSeconds] = React.useState(() =>
		computeRemainingCooldownSeconds(cooloffEndsAt)
	);

	React.useEffect(() => {
		const initialRemaining = computeRemainingCooldownSeconds(cooloffEndsAt);
		setRemainingSeconds(initialRemaining);

		if (initialRemaining <= 0) {
			onExpire?.();
			return;
		}

		const intervalId = window.setInterval(() => {
			const remaining = computeRemainingCooldownSeconds(cooloffEndsAt);
			setRemainingSeconds(remaining);

			if (remaining <= 0) {
				window.clearInterval(intervalId);
				onExpire?.();
			}
		}, 1000);

		return () => window.clearInterval(intervalId);
	}, [cooloffEndsAt, onExpire]);

	if (remainingSeconds <= 0) return null;

	const formatted = formatCooldownDuration(remainingSeconds);

	return (
		<div
			data-testid="cooloff-notice"
			role="status"
			aria-live="polite"
			aria-label={`Buying resumes in ${formatted}`}
			className={cn(
				'flex items-start gap-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-100',
				className
			)}
		>
			<Snowflake
				className="mt-0.5 size-4 shrink-0 text-sky-300"
				aria-hidden="true"
			/>
			<div>
				<p className="font-semibold text-sky-200">Buying paused</p>
				<p
					data-testid="cooloff-notice-text"
					className="mt-0.5 text-sky-100/80"
				>
					Price ceiling cool-off active. Buying resumes in{' '}
					<span className="font-mono tabular-nums">{formatted}</span>.
				</p>
			</div>
		</div>
	);
};

export default CooloffNotice;
