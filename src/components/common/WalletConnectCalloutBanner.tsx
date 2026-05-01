import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { useAccount, useConnect, useReconnect } from 'wagmi';
import { cn } from '@/lib/utils';
import showToast from '@/utils/toast.util';

interface WalletConnectCalloutBannerProps {
	title?: string;
	description?: string;
	className?: string;
}

const WalletConnectCalloutBanner: React.FC<WalletConnectCalloutBannerProps> = ({
	title = 'Wallet connection required',
	description = 'Connect your wallet to continue with creator key purchases and on-chain actions.',
	className,
}) => {
	const { isConnected } = useAccount();
	const { reconnectAsync, connectors: reconnectConnectors } = useReconnect();
	const { connectAsync, connectors: connectConnectors } = useConnect();
	const [isReconnecting, setIsReconnecting] = useState(false);

	const retryConnector = reconnectConnectors[0] ?? connectConnectors[0];

	const handleReconnect = async () => {
		if (isReconnecting) {
			return;
		}

		if (isConnected) {
			showToast.success('Wallet is already connected.');
			return;
		}

		setIsReconnecting(true);
		showToast.loading('Reconnecting wallet...');

		try {
			const reconnectResults = await reconnectAsync();
			const didReconnect = reconnectResults.some(
				result => result.accounts.length > 0
			);

			if (didReconnect) {
				showToast.success('Wallet reconnected successfully.');
				return;
			}

			if (!retryConnector) {
				showToast.error(
					'No wallet connector is available. Open your wallet extension and try again.'
				);
				return;
			}

			await connectAsync({ connector: retryConnector });
			showToast.success('Wallet connected successfully.');
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: 'Please try again after unlocking your wallet.';
			showToast.error(`Reconnect failed. ${message}`);
		} finally {
			setIsReconnecting(false);
		}
	};

	return (
		<div
			className={cn(
				'rounded-2xl border border-amber-300/30 bg-gradient-to-r from-amber-400/10 via-amber-200/5 to-emerald-300/10 p-4',
				className
			)}
		>
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="min-w-0">
					<div className="mb-1 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/85">
						<Wallet className="size-3.5" />
						Wallet required
					</div>
					<p className="font-jakarta text-sm font-bold text-amber-100">
						{title}
					</p>
					<p className="mt-1 text-xs text-amber-100/75">{description}</p>
				</div>
				<div className="shrink-0">
					<button
						type="button"
						onClick={handleReconnect}
						disabled={isReconnecting}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
					>
						{isReconnecting ? 'Reconnecting...' : 'Reconnect Wallet'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default WalletConnectCalloutBanner;
