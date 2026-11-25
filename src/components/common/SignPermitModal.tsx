import { AlertCircle, FileSignature, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import type { PermitPayload } from '@/types/permit';
import {
	clampPermitDeadlineMinutes,
	MAX_PERMIT_DEADLINE_MINUTES,
} from '@/utils/permit.utils';

export interface SignPermitModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	payload: PermitPayload | null;
	recipient: string;
	deadlineMinutes: number;
	maxDeadlineMinutes?: number;
	onDeadlineMinutesChange: (minutes: number) => void;
	onSign: () => Promise<void> | void;
	isLoadingNonce?: boolean;
	isSigning?: boolean;
	errorMessage?: string | null;
}

function formatDeadline(deadline: string | undefined): string {
	if (!deadline) return 'Loading…';
	const date = new Date(Number(deadline) * 1000);
	return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString();
}

/** Review screen shown before the wallet's message-signing prompt. */
export function SignPermitModal({
	open,
	onOpenChange,
	payload,
	recipient,
	deadlineMinutes,
	maxDeadlineMinutes = MAX_PERMIT_DEADLINE_MINUTES,
	onDeadlineMinutesChange,
	onSign,
	isLoadingNonce = false,
	isSigning = false,
	errorMessage = null,
}: SignPermitModalProps) {
	const deadlineIso = payload
		? new Date(Number(payload.deadline) * 1000).toISOString()
		: undefined;
	const maximumHours = maxDeadlineMinutes / 60;

	return (
		<Dialog
			open={open}
			onOpenChange={next => !isSigning && onOpenChange(next)}
		>
			<DialogContent
				className="max-h-[calc(100vh-2rem)] max-w-lg overflow-y-auto border-white/10 bg-[#0b1728] text-white"
				showCloseButton={!isSigning}
				showEscapeHint={!isSigning}
				onEscapeKeyDown={event => {
					if (isSigning) event.preventDefault();
				}}
				onInteractOutside={event => {
					if (isSigning) event.preventDefault();
				}}
			>
				<DialogHeader className="text-left">
					<div className="flex items-center gap-2">
						<FileSignature
							className="size-5 text-amber-300"
							aria-hidden="true"
						/>
						<DialogTitle>Review signed permit</DialogTitle>
					</div>
					<DialogDescription className="text-white/60">
						Review every field below. Your wallet will not ask for a
						signature until you continue.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
						<p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
							<ShieldCheck className="size-4" aria-hidden="true" />
							What this signature allows
						</p>
						<p className="mt-2 text-sm leading-relaxed text-white/70">
							{payload
								? `Allow ${payload.spender} to transfer ${payload.amount} creator ${payload.amount === '1' ? 'key' : 'keys'} (${payload.key}) from ${payload.owner} to ${recipient} in one transaction. The permit cannot be reused and expires at the deadline below.`
								: 'Loading the current nonce before building the permit.'}
						</p>
					</div>

					<dl className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
						<div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
							<dt className="text-white/50">Permit type</dt>
							<dd className="break-all font-mono text-white/90">
								{payload
									? `${payload.domain} (version ${payload.version})`
									: 'Loading…'}
							</dd>
						</div>
						<div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
							<dt className="text-white/50">Contract</dt>
							<dd className="break-all font-mono text-white/90">
								{payload?.contract ?? 'Loading…'}
							</dd>
						</div>
						<div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
							<dt className="text-white/50">Network hash</dt>
							<dd className="break-all font-mono text-white/90">
								{payload?.networkPassphraseHash ?? 'Loading…'}
							</dd>
						</div>
						<div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
							<dt className="text-white/50">Owner</dt>
							<dd className="break-all font-mono text-white/90">
								{payload?.owner ?? 'Loading…'}
							</dd>
						</div>
						<div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
							<dt className="text-white/50">Spender</dt>
							<dd className="break-all font-mono text-white/90">
								{payload?.spender ?? 'Loading…'}
							</dd>
						</div>
						<div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
							<dt className="text-white/50">Creator key</dt>
							<dd className="break-all font-mono text-white/90">
								{payload?.key ?? 'Loading…'}
							</dd>
						</div>
						<div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
							<dt className="text-white/50">Amount</dt>
							<dd className="font-mono text-white/90">
								{payload?.amount ?? 'Loading…'}
							</dd>
						</div>
						<div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
							<dt className="text-white/50">Deadline</dt>
							<dd className="text-white/90">
								<time dateTime={deadlineIso}>
									{formatDeadline(payload?.deadline)}
								</time>
							</dd>
						</div>
						<div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
							<dt className="text-white/50">Nonce</dt>
							<dd className="font-mono text-white/90">
								{payload?.nonce ?? 'Loading…'}
							</dd>
						</div>
					</dl>

					<div className="space-y-1.5">
						<label
							htmlFor="permit-deadline-minutes"
							className="text-sm font-medium text-white/80"
						>
							Permit validity in minutes
						</label>
						<input
							id="permit-deadline-minutes"
							type="number"
							min={1}
							max={maxDeadlineMinutes}
							step={1}
							value={deadlineMinutes}
							disabled={isSigning}
							onChange={event =>
								onDeadlineMinutesChange(
									clampPermitDeadlineMinutes(
										Number(event.target.value),
										maxDeadlineMinutes
									)
								)
							}
							className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15"
						/>
						<p className="text-xs text-white/45">
							Defaults to 30 minutes. Maximum:{' '}
							{Number.isInteger(maximumHours)
								? `${maximumHours} hours`
								: `${maxDeadlineMinutes} minutes`}
							.
						</p>
					</div>

					<div className="space-y-1.5">
						<p className="text-sm font-medium text-white/80">
							Exact message to sign
						</p>
						<pre
							aria-label="Exact permit message"
							className="max-h-52 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-black/25 p-3 font-mono text-xs leading-relaxed text-white/70"
						>
							{payload?.message ?? 'Loading current permit nonce…'}
						</pre>
					</div>

					{errorMessage && (
						<div
							role="alert"
							className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200"
						>
							<AlertCircle
								className="mt-0.5 size-4 shrink-0 text-red-400"
								aria-hidden="true"
							/>
							<p>{errorMessage}</p>
						</div>
					)}
				</div>

				<DialogFooter className="sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isSigning}
					>
						Back
					</Button>
					<Button
						type="button"
						onClick={onSign}
						disabled={!payload || isLoadingNonce || isSigning}
						aria-busy={isSigning || undefined}
					>
						<StableButtonContent
							isLoading={isSigning}
							loadingLabel="Signing and submitting…"
							spinner={
								<Loader2
									className="size-4 animate-spin"
									aria-hidden="true"
								/>
							}
						>
							<FileSignature className="size-4" aria-hidden="true" />
							Sign permit and transfer
						</StableButtonContent>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default SignPermitModal;
