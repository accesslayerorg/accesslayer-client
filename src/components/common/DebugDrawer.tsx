import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
	X,
	Copy,
	Check,
	RefreshCw,
	Trash2,
	Terminal,
	Server,
	Layers,
	AlertTriangle,
	ShieldCheck,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { Networks } from '@stellar/stellar-sdk';
import { env } from '@/utils/env.utils';
import { useSigner } from '@/hooks/useSigner';
import { useDebugDrawerStore } from '@/hooks/useDebugDrawerStore';
import {
	recentErrorsBuffer,
	type RecentErrorEntry,
} from '@/utils/recentErrors.utils';
import { serializeRedactedDiagnostics } from '@/utils/debugRedaction.utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import showToast from '@/utils/toast.util';

export function DebugDrawer() {
	const { isOpen, close, toggle } = useDebugDrawerStore();
	const queryClient = useQueryClient();
	const { connector } = useAccount();
	const { activeSigner } = useSigner(
		env.VITE_STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET
	);

	const [errors, setErrors] = useState<RecentErrorEntry[]>([]);
	const [activeTab, setActiveTab] = useState<'env' | 'queries' | 'errors'>('env');
	const [copied, setCopied] = useState(false);
	const [isRefetching, setIsRefetching] = useState(false);

	// Keyboard shortcut listener: Ctrl + Shift + D / Cmd + Shift + D
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			const isInput =
				target?.tagName === 'INPUT' ||
				target?.tagName === 'TEXTAREA' ||
				target?.tagName === 'SELECT' ||
				target?.isContentEditable;

			if (isInput) return;

			if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
				e.preventDefault();
				toggle();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [toggle]);

	// Subscribe to recent errors
	useEffect(() => {
		return recentErrorsBuffer.subscribe(setErrors);
	}, []);

	// Active queries from TanStack React Query cache
	const queryCache = queryClient.getQueryCache();
	const activeQueries = queryCache.getAll();

	// Wallet adapter name without exposing user's addresses
	const walletAdapterName = activeSigner
		? activeSigner.type === 'hardware'
			? 'Ledger (Hardware)'
			: 'Freighter (Software)'
		: connector?.name || 'Disconnected';

	const networkPassphrase =
		env.VITE_STELLAR_NETWORK === 'mainnet'
			? Networks.PUBLIC
			: Networks.TESTNET;

	const rpcEndpoint =
		env.VITE_STELLAR_RPC_URL ||
		(env.VITE_STELLAR_NETWORK === 'mainnet'
			? 'https://mainnet.sorobanrpc.com'
			: 'https://soroban-testnet.stellar.org');

	const buildVersion = '0.0.0';
	const appEnvironment = import.meta.env.MODE || 'development';

	const handleCopyDiagnostics = async () => {
		const diagnosticsData = {
			timestamp: new Date().toISOString(),
			build: {
				version: buildVersion,
				mode: appEnvironment,
			},
			network: {
				stellarNetwork: env.VITE_STELLAR_NETWORK,
				networkPassphrase,
				rpcEndpoint,
			},
			wallet: {
				adapter: walletAdapterName,
				isConnected: Boolean(activeSigner || connector),
			},
			reactQuery: {
				totalQueries: activeQueries.length,
				activeQueries: activeQueries.map(q => ({
					queryKey: Array.isArray(q.queryKey) ? q.queryKey.join('/') : String(q.queryKey),
					status: q.state.status,
					fetchStatus: q.state.fetchStatus,
					updatedAt: q.state.dataUpdatedAt,
				})),
			},
			recentErrors: errors.map(err => ({
				message: err.message,
				source: err.source,
				timestamp: err.timestamp,
			})),
		};

		const redactedJson = serializeRedactedDiagnostics(diagnosticsData);
		try {
			await copyTextToClipboard(redactedJson);
			setCopied(true);
			showToast.success('Diagnostics copied to clipboard (redacted).');
			setTimeout(() => setCopied(false), 2000);
		} catch {
			showToast.error('Failed to copy diagnostics.');
		}
	};

	const handleClearAndRefetch = async () => {
		setIsRefetching(true);
		try {
			queryClient.clear();
			await queryClient.refetchQueries();
			showToast.success('Cache cleared & active queries refetched.');
		} catch (err) {
			console.error(err);
			showToast.error('Failed to refetch queries.');
		} finally {
			setIsRefetching(false);
		}
	};

	if (!isOpen) return null;

	return (
		<aside
			data-testid="debug-drawer"
			aria-label="Developer Debug Drawer"
			className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-white/10 bg-[#06111f] text-white shadow-2xl backdrop-blur-xl"
		>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
				<div className="flex items-center gap-2">
					<Terminal className="size-5 text-amber-400" />
					<h2 className="font-grotesque text-base font-bold tracking-tight">
						Developer Diagnostics
					</h2>
					<span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
						Ctrl+Shift+D
					</span>
				</div>
				<button
					type="button"
					data-testid="debug-drawer-close-btn"
					onClick={close}
					aria-label="Close debug drawer"
					className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
				>
					<X className="size-5" />
				</button>
			</div>

			{/* Subnav Tabs */}
			<div className="flex border-b border-white/10 bg-white/[0.02] px-4 text-xs font-semibold">
				<button
					type="button"
					data-testid="tab-env"
					onClick={() => setActiveTab('env')}
					className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors ${
						activeTab === 'env'
							? 'border-amber-400 text-amber-300'
							: 'border-transparent text-white/60 hover:text-white'
					}`}
				>
					<Server className="size-3.5" />
					Environment
				</button>
				<button
					type="button"
					data-testid="tab-queries"
					onClick={() => setActiveTab('queries')}
					className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors ${
						activeTab === 'queries'
							? 'border-amber-400 text-amber-300'
							: 'border-transparent text-white/60 hover:text-white'
					}`}
				>
					<Layers className="size-3.5" />
					Query Cache ({activeQueries.length})
				</button>
				<button
					type="button"
					data-testid="tab-errors"
					onClick={() => setActiveTab('errors')}
					className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors ${
						activeTab === 'errors'
							? 'border-amber-400 text-amber-300'
							: 'border-transparent text-white/60 hover:text-white'
					}`}
				>
					<AlertTriangle className="size-3.5" />
					Errors ({errors.length})
				</button>
			</div>

			{/* Main Content Area */}
			<ScrollArea className="flex-1 p-5">
				{activeTab === 'env' && (
					<div data-testid="panel-env" className="space-y-4">
						<div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
							<h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">
								System & Environment
							</h3>
							<dl className="space-y-2.5 text-xs">
								<div className="flex items-center justify-between">
									<dt className="text-white/60">Build Version</dt>
									<dd data-testid="debug-version" className="font-mono text-white">
										{buildVersion}
									</dd>
								</div>
								<div className="flex items-center justify-between">
									<dt className="text-white/60">Environment Mode</dt>
									<dd data-testid="debug-env" className="font-mono text-amber-300">
										{appEnvironment}
									</dd>
								</div>
							</dl>
						</div>

						<div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
							<h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">
								Stellar Network & RPC
							</h3>
							<dl className="space-y-2.5 text-xs">
								<div className="flex flex-col gap-1">
									<dt className="text-white/60">Network Passphrase</dt>
									<dd
										data-testid="debug-network-passphrase"
										className="break-all rounded bg-white/5 p-1.5 font-mono text-[11px] text-white/90"
									>
										{networkPassphrase}
									</dd>
								</div>
								<div className="flex flex-col gap-1">
									<dt className="text-white/60">RPC Endpoint</dt>
									<dd
										data-testid="debug-rpc-endpoint"
										className="break-all rounded bg-white/5 p-1.5 font-mono text-[11px] text-white/90"
									>
										{rpcEndpoint}
									</dd>
								</div>
							</dl>
						</div>

						<div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
							<h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">
								Wallet Adapter
							</h3>
							<dl className="space-y-2 text-xs">
								<div className="flex items-center justify-between">
									<dt className="text-white/60">Connected Adapter</dt>
									<dd data-testid="debug-wallet-adapter" className="font-mono text-white">
										{walletAdapterName}
									</dd>
								</div>
								<p className="text-[11px] text-white/40">
									(Public & private keys are strictly scrubbed to prevent accidental leaks)
								</p>
							</dl>
						</div>
					</div>
				)}

				{activeTab === 'queries' && (
					<div data-testid="panel-queries" className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-xs text-white/60">
								Active queries in memory ({activeQueries.length})
							</span>
							<Button
								type="button"
								size="sm"
								variant="outline"
								data-testid="clear-refetch-queries-btn"
								disabled={isRefetching}
								onClick={handleClearAndRefetch}
								className="h-7 border-amber-400/30 text-xs text-amber-300 hover:bg-amber-400/10"
							>
								<RefreshCw className={`mr-1.5 size-3 ${isRefetching ? 'animate-spin' : ''}`} />
								Clear & Refetch All
							</Button>
						</div>

						{activeQueries.length === 0 ? (
							<p className="py-8 text-center text-xs text-white/40">
								No active queries currently loaded.
							</p>
						) : (
							<div className="space-y-2">
								{activeQueries.map((query, idx) => {
									const keyString = Array.isArray(query.queryKey)
										? query.queryKey.join(' / ')
										: String(query.queryKey);
									const status = query.state.status;
									const lastUpdated = query.state.dataUpdatedAt
										? new Date(query.state.dataUpdatedAt).toLocaleTimeString()
										: 'Never';

									return (
										<div
											key={idx}
											data-testid="query-cache-item"
											className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5 text-xs"
										>
											<div className="flex items-start justify-between gap-2">
												<span className="font-mono text-[11px] font-semibold text-white/90">
													{keyString}
												</span>
												<span
													data-testid="query-item-status"
													className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
														status === 'success'
															? 'bg-emerald-500/20 text-emerald-400'
															: status === 'error'
																? 'bg-rose-500/20 text-rose-400'
																: 'bg-amber-500/20 text-amber-300'
													}`}
												>
													{status}
												</span>
											</div>
											<div className="mt-1 flex items-center justify-between text-[10px] text-white/40">
												<span>Updated: {lastUpdated}</span>
												<span>Fetch: {query.state.fetchStatus}</span>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				)}

				{activeTab === 'errors' && (
					<div data-testid="panel-errors" className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-xs text-white/60">
								Recent 20 errors logged (redacted)
							</span>
							{errors.length > 0 && (
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={() => recentErrorsBuffer.clear()}
									className="h-7 text-xs text-white/50 hover:text-white"
								>
									<Trash2 className="mr-1 size-3" />
									Clear List
								</Button>
							)}
						</div>

						{errors.length === 0 ? (
							<div className="py-8 text-center text-xs text-white/40">
								<ShieldCheck className="mx-auto mb-2 size-6 text-emerald-400" />
								No recent errors recorded.
							</div>
						) : (
							<div className="space-y-2">
								{errors.map(err => (
									<div
										key={err.id}
										data-testid="recent-error-item"
										className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3 text-xs"
									>
										<div className="flex items-center justify-between text-[10px] text-white/40">
											<span className="font-mono uppercase text-red-400">
												[{err.source}]
											</span>
											<span>{new Date(err.timestamp).toLocaleTimeString()}</span>
										</div>
										<p
											data-testid="recent-error-message"
											className="mt-1 font-mono text-[11px] text-red-200"
										>
											{err.message}
										</p>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</ScrollArea>

			{/* Footer Actions */}
			<div className="border-t border-white/10 bg-white/[0.02] p-4">
				<Button
					type="button"
					data-testid="copy-diagnostics-btn"
					onClick={handleCopyDiagnostics}
					className="w-full gap-2 rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"
				>
					{copied ? <Check className="size-4" /> : <Copy className="size-4" />}
					{copied ? 'Diagnostics Copied!' : 'Copy Redacted Diagnostics'}
				</Button>
			</div>
		</aside>
	);
}

export default DebugDrawer;
