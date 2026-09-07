import { useCallback, useEffect, useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { useAccount, useConnect } from 'wagmi';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'connect-wallet-banner-dismissed';

function wasDismissed(): boolean {
	try {
		return sessionStorage.getItem(DISMISS_KEY) === 'true';
	} catch {
		return false;
	}
}

function markDismissed(): void {
	try {
		sessionStorage.setItem(DISMISS_KEY, 'true');
	} catch {
		// sessionStorage unavailable – silently ignore
	}
}

interface ConnectWalletCtaBannerProps {
	className?: string;
}

const ConnectWalletCtaBanner: React.FC<ConnectWalletCtaBannerProps> = ({
	className,
}) => {
	const { isConnected } = useAccount();
	const { connect, connectors, isPending } = useConnect();
	const [dismissed, setDismissed] = useState(wasDismissed);

	const visible = !isConnected && !dismissed;

	useEffect(() => {
		if (isConnected) {
			setDismissed(false);
			try {
				sessionStorage.removeItem(DISMISS_KEY);
			} catch {
				// ignore
			}
		}
	}, [isConnected]);

	const handleDismiss = useCallback(() => {
		setDismissed(true);
		markDismissed();
	}, []);

	const handleConnect = useCallback(() => {
		const primaryConnector = connectors[0];
		if (primaryConnector) {
			connect({ connector: primaryConnector });
		}
	}, [connect, connectors]);

	if (!visible) {
		return null;
	}

	return (
		<div
			role="status"
			aria-label="Connect your wallet"
			className={cn(
				'w-full border-b border-blue-500/20 bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-emerald-500/10',
				className
			)}
		>
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
				<div className="flex items-center gap-3">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600/15">
						<Wallet className="size-4 text-blue-400" />
					</div>
					<p className="font-jakarta text-sm font-medium text-gray-200">
						Connect your Stellar wallet to buy creator keys and start
						earning
					</p>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					<button
						type="button"
						onClick={handleConnect}
						disabled={isPending}
						className="rounded-lg bg-blue-600 px-4 py-2 font-jakarta text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
					>
						{isPending ? 'Connecting...' : 'Connect Wallet'}
					</button>

					<button
						type="button"
						onClick={handleDismiss}
						aria-label="Dismiss banner"
						className="flex size-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200"
					>
						<X className="size-4" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConnectWalletCtaBanner;
