import { useState } from 'react';
import {
	Check,
	Clock3,
	History,
	Loader2,
	LockKeyhole,
	PenLine,
	ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMultiSigActions } from '@/hooks/useMultiSigActions';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { cn } from '@/lib/utils';
import { shortenAddress } from '@/lib/web3/format';
import type { MultiSigAction } from '@/services/admin.service';
import showToast from '@/utils/toast.util';

interface MultiSigAdminPanelProps {
	/** The caller must resolve this from a trusted server/config allowlist. */
	isAdmin: boolean;
}

const PANEL_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

function sameAddress(left: string, right: string): boolean {
	return left.toLowerCase() === right.toLowerCase();
}

function uniqueSignatureCount(action: MultiSigAction): number {
	return new Set(action.signatures.map(signature => signature.signer.toLowerCase())).size;
}

function formatActionTime(timestamp: string): string {
	const date = new Date(timestamp);
	return Number.isNaN(date.getTime())
		? timestamp
		: date.toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
		});
}

function ActionTypeLabel({ type }: { type: string }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
			<LockKeyhole className="size-3" aria-hidden="true" />
			{type === 'deprecate-key' ? 'Key deprecation' : 'Governance action'}
		</span>
	);
}

function PendingAction({
	action,
	walletAddress,
	isSigning,
	isExecuting,
	onSign,
	onExecute,
}: {
	action: MultiSigAction;
	walletAddress: string;
	isSigning: boolean;
	isExecuting: boolean;
	onSign: (action: MultiSigAction) => void;
	onExecute: (action: MultiSigAction) => void;
}) {
	const signatureCount = uniqueSignatureCount(action);
	const thresholdMet = signatureCount >= action.requiredSignatures;
	const hasSigned = action.signatures.some(signature =>
		sameAddress(signature.signer, walletAddress)
	);
	const progress = Math.min(100, (signatureCount / action.requiredSignatures) * 100);

	return (
		<li className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<ActionTypeLabel type={action.type} />
						<span className="text-xs text-white/35">{formatActionTime(action.createdAt)}</span>
					</div>
					<h3 className="mt-3 font-grotesque text-lg font-bold text-white">
						{action.title}
					</h3>
					{action.description && (
						<p className="mt-1 max-w-2xl text-sm leading-6 text-white/55">
							{action.description}
						</p>
					)}
				</div>
				<div className="shrink-0 text-left lg:text-right">
					<p className="font-mono text-sm font-bold text-amber-200">
						{signatureCount} / {action.requiredSignatures} signatures
					</p>
					<p className="mt-1 text-xs text-white/35">
						{action.totalSigners} admin wallets in the quorum
					</p>
				</div>
			</div>

			<div className="mt-5" aria-label={`${signatureCount} of ${action.requiredSignatures} signatures`}>
				<div className="flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={action.requiredSignatures} aria-valuenow={signatureCount}>
					{Array.from({ length: action.requiredSignatures }).map((_, index) => (
						<span
							key={index}
							className={cn(
								'h-2 flex-1 rounded-full transition-colors',
								index < signatureCount ? 'bg-amber-300' : 'bg-white/10'
							)}
						/>
					))}
				</div>
				<div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
					<div className="h-full rounded-full bg-amber-300/70 transition-all" style={{ width: `${progress}%` }} />
				</div>
			</div>

			<div className="mt-5 flex flex-col-reverse gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex -space-x-1.5" aria-label="Signers">
					{action.signatures.length === 0 ? (
						<span className="text-xs text-white/35">No admin signatures yet</span>
					) : (
						action.signatures.map(signature => (
							<span
								key={`${signature.signer}-${signature.signature}`}
								title={signature.signer}
								className="flex size-7 items-center justify-center rounded-full border-2 border-[#091728] bg-emerald-400/20 text-emerald-200"
							>
								<Check className="size-3.5" aria-label={`Signed by ${signature.signer}`} />
							</span>
						))
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => onSign(action)}
						disabled={isSigning || isExecuting || hasSigned}
						className="rounded-xl border-white/15 bg-white/5 font-bold text-white hover:border-amber-300/40 hover:bg-amber-300/10"
					>
						{isSigning ? <Loader2 className="animate-spin" aria-hidden="true" /> : hasSigned ? <Check aria-hidden="true" /> : <PenLine aria-hidden="true" />}
						{isSigning ? 'Waiting for signature…' : hasSigned ? 'Signed' : 'Sign action'}
					</Button>
					<Button
						type="button"
						onClick={() => onExecute(action)}
						disabled={!thresholdMet || isSigning || isExecuting}
						className="rounded-xl font-bold"
						data-testid={`multisig-execute-${action.id}`}
					>
						{isExecuting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
						{isExecuting ? 'Executing…' : 'Execute action'}
					</Button>
				</div>
			</div>
		</li>
	);
}

export default function MultiSigAdminPanel({ isAdmin }: MultiSigAdminPanelProps) {
	const { address, isConnected, activeSigner } = useStellarWallet();
	const [signingId, setSigningId] = useState<string | null>(null);
	const [executingId, setExecutingId] = useState<string | null>(null);
	const { pending, history, sign, execute, enabled } = useMultiSigActions(
		isAdmin,
		address,
		isConnected
	);

	if (!enabled || !address) return null;

	const handleSign = async (action: MultiSigAction) => {
		setSigningId(action.id);
		try {
			if (!activeSigner?.signMessage) {
				throw new Error('The connected Stellar wallet cannot sign this action.');
			}
			const signature = await activeSigner.signMessage(action.payload);
			sign.mutate(
				{ action, signature },
				{ onSettled: () => setSigningId(null) }
			);
		} catch (error) {
			setSigningId(null);
			showToast.error(
				error instanceof Error
					? error.message
					: 'The wallet signature was not completed.'
			);
		}
	};

	const handleExecute = (action: MultiSigAction) => {
		setExecutingId(action.id);
		execute.mutate(action, { onSettled: () => setExecutingId(null) });
	};

	return (
		<section className={PANEL_CLASS} data-testid="multisig-admin-panel">
			<div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
				<div>
					<div className="flex items-center gap-2 text-amber-300">
						<ShieldCheck className="size-5" aria-hidden="true" />
						<span className="text-xs font-bold uppercase tracking-[0.22em]">Protocol safety</span>
					</div>
					<h2 className="mt-2 font-grotesque text-2xl font-black tracking-tight">Multi-sig confirmation</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
						Sensitive governance actions stay paused until two of the three admin wallets sign the exact action payload.
					</p>
				</div>
				<div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/5 px-4 py-3 text-sm">
					<p className="text-xs uppercase tracking-[0.16em] text-white/40">Connected admin</p>
					<p className="mt-1 font-mono text-xs font-bold text-emerald-200">{shortenAddress(address)}</p>
				</div>
			</div>

			<div className="mt-8">
				<div className="mb-4 flex items-center justify-between gap-4">
					<div>
						<h3 className="font-grotesque text-lg font-bold">Pending actions</h3>
						<p className="mt-1 text-xs text-white/40">Operations waiting for the 2-of-3 threshold</p>
					</div>
					<Clock3 className="size-5 text-white/25" aria-hidden="true" />
				</div>
				{pending.isLoading && (
					<div className="space-y-3" role="status" aria-label="Loading pending actions">
						<div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
						<div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
					</div>
				)}
				{pending.isError && (
					<div className="rounded-2xl border border-rose-300/20 bg-rose-300/5 p-5 text-sm text-rose-100" role="alert">
						Pending actions could not be loaded. Retry from the dashboard refresh.
					</div>
				)}
				{!pending.isLoading && !pending.isError && (pending.data?.length ?? 0) === 0 && (
					<div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm text-white/40">
						No sensitive actions are waiting for confirmation.
					</div>
				)}
				{!pending.isLoading && !pending.isError && (pending.data?.length ?? 0) > 0 && (
					<ul className="space-y-4" data-testid="multisig-pending-list" aria-label="Pending multi-sig actions">
						{pending.data?.map(action => (
							<PendingAction
								key={action.id}
								action={action}
								walletAddress={address}
								isSigning={signingId === action.id || sign.isPending}
								isExecuting={executingId === action.id || execute.isPending}
								onSign={actionToSign => void handleSign(actionToSign)}
								onExecute={handleExecute}
							/>
						))}
					</ul>
				)}
			</div>

			<div className="mt-10 border-t border-white/10 pt-8">
				<div className="mb-4 flex items-center gap-2">
					<History className="size-4 text-white/40" aria-hidden="true" />
					<h3 className="font-grotesque text-lg font-bold">Completed actions</h3>
				</div>
				{history.isLoading && <p className="text-sm text-white/40" role="status">Loading action history…</p>}
				{history.isError && <p className="text-sm text-rose-200" role="alert">Action history could not be loaded.</p>}
				{!history.isLoading && !history.isError && (history.data?.length ?? 0) === 0 && (
					<p className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-white/35">Completed multi-sig actions will appear here.</p>
				)}
				{!history.isLoading && !history.isError && (history.data?.length ?? 0) > 0 && (
					<ul className="divide-y divide-white/10 rounded-2xl border border-white/10" data-testid="multisig-history-list" aria-label="Completed multi-sig actions">
						{history.data?.map(action => (
							<li key={action.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="min-w-0">
									<p className="font-semibold text-white/85">{action.title}</p>
									<p className="mt-1 text-xs text-white/40">{action.signatures.length} signatures · {action.id}</p>
								</div>
								<time className="shrink-0 text-xs text-emerald-200/75" dateTime={action.executedAt}>
									{action.executedAt ? formatActionTime(action.executedAt) : 'Completed'}
								</time>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
