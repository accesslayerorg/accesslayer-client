import { useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Copy, Check, Loader2 } from 'lucide-react';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { shortenAddress } from '@/lib/web3/format';
import {
	WALLET_CONNECTION_AD_BLOCKER_MESSAGE,
	useWalletConnectionStallDetection,
} from '@/hooks/useWalletConnectionStallDetection';
import { useCopySuccessAnnouncement } from '@/hooks/useCopySuccessAnnouncement';
import CopySuccessAnnouncement from '@/components/common/CopySuccessAnnouncement';
import showToast from '@/utils/toast.util';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import { logWalletDisconnectSession } from '@/lib/walletSessionLog';

function ConnectWalletButton() {
	const [showAddressPopover, setShowAddressPopover] = useState(false);
	const [copied, setCopied] = useState(false);
	const connectedAtRef = useRef<number | null>(null);
	const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
	const [showConnectDialog, setShowConnectDialog] = useState(false);
	const [connectError, setConnectError] = useState<string | null>(null);
	const { address, isConnected } = useAccount();
	const { connect, connectors, error, isPending } = useConnect();
	const { disconnect } = useDisconnect();
	const { announcement, announceCopySuccess } = useCopySuccessAnnouncement();

	const primaryConnector = connectors[0];
	const showAdBlockerSuggestion = useWalletConnectionStallDetection({
		isAwaitingWalletResponse: isPending,
		hasWalletResponse: isConnected || Boolean(error),
	});

	const handleConnect = () => {
		setConnectError(null);
		if (primaryConnector) connect({ connector: primaryConnector });
	};

	const handleRetry = () => {
		setConnectError(null);
		if (primaryConnector) connect({ connector: primaryConnector });
	};

	const handleCopyAddress = async () => {
		if (!address) return;
		try {
			await copyTextToClipboard(address);
			announceCopySuccess('Wallet address copied.');
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			setCopied(false);
			showToast.error(
				'Could not copy the wallet address. Please copy it manually.'
			);
		}
	};

	useEffect(() => {
		if (isConnected && address && connectedAtRef.current == null) {
			connectedAtRef.current = Date.now();
			setShowConnectDialog(false);
			setConnectError(null);
			return;
		}

		if (!isConnected) {
			connectedAtRef.current = null;
		}
	}, [address, isConnected]);

	useEffect(() => {
		if (error && !isConnected) {
			setConnectError(error.message);
		}
	}, [error, isConnected]);

	if (isConnected && address) {
		return (
			<>
				<div className="flex items-center gap-1.5">
					<Popover
						open={showAddressPopover}
						onOpenChange={setShowAddressPopover}
					>
						<PopoverTrigger asChild>
							<button
								type="button"
								className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
							>
								{shortenAddress(address)}
							</button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-80">
							<div className="flex flex-col gap-3">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-gray-900">
										Wallet address
									</span>
									<button
										type="button"
										onClick={() => setShowAddressPopover(false)}
										className="text-gray-400 hover:text-gray-600"
									>
										×
									</button>
								</div>
								<div className="rounded-md bg-gray-100 p-3">
									<p className="font-mono text-xs break-all text-gray-700">
										{address}
									</p>
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={handleCopyAddress}
										className="flex flex-1 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
									>
										{copied ? (
											<Check className="size-4 text-emerald-500" />
										) : (
											<Copy className="size-4" />
										)}
										{copied ? 'Copied!' : 'Copy Address'}
									</button>
									<button
										type="button"
										onClick={() => {
											setShowAddressPopover(false);
											setShowDisconnectDialog(true);
										}}
										className="flex-1 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
									>
										Disconnect
									</button>
								</div>
							</div>
						</PopoverContent>
					</Popover>
				</div>
				<Dialog
					open={showDisconnectDialog}
					onOpenChange={setShowDisconnectDialog}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Disconnect wallet?</DialogTitle>
							<DialogDescription>
								Disconnecting clears your current wallet session and any
								pending wallet state. You will need to reconnect to
								continue.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline">Cancel</Button>
							</DialogClose>
							<Button
								type="button"
								variant="destructive"
								onClick={() => {
									if (connectedAtRef.current != null) {
										logWalletDisconnectSession(
											address,
											connectedAtRef.current
										);
									}
									disconnect();
									setShowDisconnectDialog(false);
								}}
							>
								Disconnect
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
				<CopySuccessAnnouncement message={announcement} />
			</>
		);
	}

	const connectLabel = isPending ? 'Connecting...' : 'Connect Wallet';

	return (
		<>
			<button
				type="button"
				onClick={() => setShowConnectDialog(true)}
				className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
			>
				{connectLabel}
			</button>
			<Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Connect Wallet</DialogTitle>
						<DialogDescription>
							Connect your Stellar wallet to access the marketplace and
							trade creator keys.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<button
							type="button"
							onClick={handleConnect}
							disabled={!primaryConnector || isPending}
							className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
						>
							{isPending ? (
								<Loader2 className="size-4 animate-spin" aria-hidden="true" />
							) : null}
							{isPending ? 'Connecting...' : 'Connect Wallet'}
						</button>
						{connectError ? (
							<div className="flex flex-col gap-2">
								<p role="alert" className="text-sm text-red-600">
									Wallet signature failed. Please try again.
								</p>
								{connectError && (
									<p className="text-xs text-red-500">
										{connectError}
									</p>
								)}
								<button
									type="button"
									onClick={handleRetry}
									className="rounded-lg border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
								>
									Retry
								</button>
							</div>
						) : null}
						{showAdBlockerSuggestion ? (
							<p role="status" className="max-w-sm text-sm text-amber-700">
								{WALLET_CONNECTION_AD_BLOCKER_MESSAGE}
							</p>
						) : null}
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

export default ConnectWalletButton;
