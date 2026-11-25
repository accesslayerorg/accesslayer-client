import { useEffect, useMemo, useState } from 'react';
import { useContractVersion } from '@/hooks/useContractVersion';

const DISMISSED_KEY = 'protocol-upgrade-dismissed';
const WARNING_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

function readDismissedVersion(): string | null {
	if (typeof window === 'undefined') return null;
	try {
		return window.localStorage.getItem(DISMISSED_KEY);
	} catch {
		return null;
	}
}

function formatCountdown(msRemaining: number): string {
	const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (n: number) => n.toString().padStart(2, '0');
	if (hours > 0) {
		return `${pad(hours)}h${pad(minutes)}m${pad(seconds)}s`;
	}
	return `${pad(minutes)}m${pad(seconds)}s`;
}

/**
 * App-wide banner announcing a pending protocol upgrade.
 *
 * Renders nothing when no upgrade is pending or when the user has
 * dismissed this particular target version. The countdown updates every
 * second and the banner disappears once the execution time has passed.
 */
export default function PendingUpgradeBanner() {
	const { pendingUpgrade } = useContractVersion();
	const [now, setNow] = useState<number>(() => Date.now());
	const [dismissedVersion, setDismissedVersion] = useState<string | null>(() =>
		readDismissedVersion()
	);

	useEffect(() => {
		if (!pendingUpgrade) return undefined;
		const interval = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(interval);
	}, [pendingUpgrade]);

	const msRemaining = useMemo(() => {
		if (!pendingUpgrade) return 0;
		return pendingUpgrade.executableAt - now;
	}, [pendingUpgrade, now]);

	if (!pendingUpgrade) return null;
	if (msRemaining <= 0) return null;
	if (dismissedVersion === pendingUpgrade.version) return null;

	const isWarning = msRemaining <= WARNING_THRESHOLD_MS;

	const handleDismiss = () => {
		try {
			window.localStorage.setItem(DISMISSED_KEY, pendingUpgrade.version);
		} catch {
			// localStorage may be unavailable (private mode); still hide for session.
		}
		setDismissedVersion(pendingUpgrade.version);
	};

	return (
		<div
			role="alert"
			data-testid="pending-upgrade-banner"
			className={[
				'fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-sm',
				isWarning ? 'bg-red-600 text-white' : 'bg-amber-500 text-amber-950',
			].join(' ')}
		>
			<span className="font-semibold">
				{isWarning ? 'Upgrade imminent' : 'Protocol upgrade scheduled'}
			</span>
			<span>
				v<strong>{pendingUpgrade.version}</strong> executable in
				<span data-testid="upgrade-countdown" className="font-mono">
					{formatCountdown(msRemaining)}
				</span>
			</span>
			{isWarning && (
				<span className="hidden sm:inline">
					Avoid open trades until the upgrade completes.
				</span>
			)}
			<button
				type="button"
				onClick={handleDismiss}
				className="ml-2 rounded border border-current px-2 py-0.5 text-xs font-medium hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-black/30"
				aria-label="Dismiss upgrade banner"
			>
				Dismiss
			</button>
		</div>
	);
}
