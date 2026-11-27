import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';

interface RestrictedAccessScreenProps {
	onDisconnect?: () => void;
	contactHref?: string;
}

/**
 * Neutral restricted-access screen shown in place of protected pages when the
 * connected wallet cannot use the platform. Intentionally does not disclose
 * screening source, match details, or list names.
 */
export default function RestrictedAccessScreen({
	onDisconnect,
	contactHref = '/contact',
}: RestrictedAccessScreenProps) {
	return (
		<div
			role="alert"
			aria-live="polite"
			className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-5 px-6 py-16 text-center"
		>
			<ShieldAlert className="size-12 text-amber-400" aria-hidden="true" />
			<h1 className="text-xl font-semibold text-white">
				Access to this account is restricted
			</h1>
			<p className="text-sm leading-relaxed text-white/60">
				This wallet cannot use trading, transfers, or claims on this platform.
				Public pages remain available. If you believe this is in error, please
				contact us.
			</p>
			<div className="flex flex-wrap items-center justify-center gap-3">
				<Link
					to={contactHref}
					className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5"
				>
					Contact support
				</Link>
				{onDisconnect && (
					<button
						type="button"
						onClick={onDisconnect}
						className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
					>
						Disconnect or switch wallet
					</button>
				)}
			</div>
		</div>
	);
}
