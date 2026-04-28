import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { shortenAddress } from '@/lib/web3/format';
import CircularSpinner from './CircularSpinnerProps';
import { cn } from '@/lib/utils';

function ConnectWalletButton() {
	const { address, isConnected } = useAccount();
	const { connect, connectors, error, isPending } = useConnect();
	const { disconnect } = useDisconnect();

	const primaryConnector = connectors[0];

	if (isConnected && address) {
		return (
			<button
				type="button"
				onClick={() => disconnect()}
				className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
			>
				{shortenAddress(address)}
			</button>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="sr-only" aria-live="polite">
				{isPending ? 'Connecting to wallet...' : ''}
			</div>
			<button
				type="button"
				onClick={() =>
					primaryConnector && connect({ connector: primaryConnector })
				}
				disabled={!primaryConnector || isPending}
				aria-busy={isPending}
				className={cn(
					'flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300',
					isPending && 'opacity-90'
				)}
			>
				{isPending ? (
					<>
						<CircularSpinner size={16} color="white" />
						<span>Connecting...</span>
					</>
				) : (
					'Connect Wallet'
				)}
			</button>
			{error ? (
				<p className="text-sm text-red-600" role="alert">
					{error.message}
				</p>
			) : null}
		</div>
	);
}

export default ConnectWalletButton;
