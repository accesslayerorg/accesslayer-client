import { useState } from 'react';
import {
	Laptop,
	Smartphone,
	Monitor,
	ShieldCheck,
	Trash2,
	LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AsyncButton } from '@/components/ui/async-button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Session } from '@/services/session.service';
import { formatTimestampTooltip } from '@/utils/time.utils';

export interface SessionSecuritySectionProps {
	sessions: Session[];
	isLoading?: boolean;
	isError?: boolean;
	isRevoking?: boolean;
	onRevokeSession: (sessionId: string) => void;
	onRevokeAllOtherSessions: () => void;
	className?: string;
}

function DeviceIcon({ device }: { device: string }) {
	const label = device.toLowerCase();
	const className = 'size-5 text-white/60';
	if (label.includes('iphone') || label.includes('android') || label.includes('phone')) {
		return <Smartphone className={className} aria-hidden="true" />;
	}
	if (label.includes('ipad') || label.includes('tablet')) {
		return <Monitor className={className} aria-hidden="true" />;
	}
	return <Laptop className={className} aria-hidden="true" />;
}

/**
 * Session security dashboard (#1111).
 *
 * Lists every active session with its device, browser, IP and last-active
 * time. The current session is badged and cannot be revoked from the list.
 * Single-session and revoke-all-other actions are gated behind a
 * confirmation dialog.
 */
export default function SessionSecuritySection({
	sessions,
	isLoading = false,
	isError = false,
	isRevoking = false,
	onRevokeSession,
	onRevokeAllOtherSessions,
	className,
}: SessionSecuritySectionProps) {
	const [pendingRevoke, setPendingRevoke] = useState<Session | null>(null);
	const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

	const otherSessions = sessions.filter(session => !session.isCurrent);

	const handleConfirmRevoke = () => {
		if (!pendingRevoke) return;
		onRevokeSession(pendingRevoke.id);
		setPendingRevoke(null);
	};

	const handleConfirmRevokeAll = () => {
		onRevokeAllOtherSessions();
		setConfirmRevokeAll(false);
	};

	return (
		<section
			className={cn(
				'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			data-testid="session-security-section"
		>
			<header className="mb-6 flex flex-wrap items-start justify-between gap-4">
				<div className="flex items-start gap-3">
					<ShieldCheck
						className="mt-0.5 size-6 text-amber-300"
						aria-hidden="true"
					/>
					<div>
						<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
							Active sessions
						</h2>
						<p className="mt-1 text-sm text-white/50">
							Devices currently signed in to your account. Revoke any you
							don't recognise.
						</p>
					</div>
				</div>

				{otherSessions.length > 0 && (
					<Button
						type="button"
						variant="destructive"
						data-testid="revoke-all-sessions-button"
						disabled={isRevoking}
						onClick={() => setConfirmRevokeAll(true)}
						className="gap-2"
					>
						<LogOut className="size-4" aria-hidden="true" />
						Revoke all other sessions
					</Button>
				)}
			</header>

			{isLoading && (
				<div
					data-testid="session-security-loading"
					className="space-y-3"
				>
					{Array.from({ length: 3 }).map((_, index) => (
						<div
							key={index}
							className="h-16 w-full animate-pulse rounded-xl bg-white/5"
						/>
					))}
				</div>
			)}

			{!isLoading && isError && (
				<div
					role="alert"
					data-testid="session-security-error"
					className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200"
				>
					We couldn't load your active sessions. Please refresh and try
					again.
				</div>
			)}

			{!isLoading && !isError && sessions.length === 0 && (
				<div
					data-testid="session-security-empty"
					className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 py-16 text-center"
				>
					<div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50">
						<ShieldCheck className="size-6" aria-hidden="true" />
					</div>
					<p className="text-sm text-white/50">
						No active sessions found
					</p>
				</div>
			)}

			{!isLoading && !isError && sessions.length > 0 && (
				<ul
					data-testid="session-security-list"
					className="divide-y divide-white/10 rounded-xl border border-white/10"
				>
					{sessions.map(session => {
						const { display, title } = formatTimestampTooltip(
							session.lastActiveAt
						);
						return (
							<li
								key={session.id}
								data-testid={`session-row-${session.id}`}
								className={cn(
									'flex flex-wrap items-center gap-4 px-4 py-4',
									session.isCurrent && 'bg-amber-400/5'
								)}
							>
								<div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
									<DeviceIcon device={session.device} />
								</div>

								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<p className="truncate font-jakarta text-sm font-semibold text-white">
											{session.device}
										</p>
										{session.isCurrent && (
											<span
												data-testid={`session-current-badge-${session.id}`}
												className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300"
											>
												This device
											</span>
										)}
									</div>
									<p
										className="mt-1 truncate text-xs text-white/50"
										title={title ?? undefined}
									>
										{session.browser} · {session.ipAddress} · Last
										active {display}
									</p>
								</div>

								{session.isCurrent ? (
									<span
										data-testid={`session-not-revokable-${session.id}`}
										className="text-xs font-medium text-white/40"
										aria-label="Current session cannot be revoked"
									>
										Current session
									</span>
								) : (
									<Button
										type="button"
										variant="outline"
										size="sm"
										data-testid={`revoke-session-${session.id}`}
										disabled={isRevoking}
										onClick={() => setPendingRevoke(session)}
										className="gap-1.5 text-red-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-200"
									>
										<Trash2
											className="size-3.5"
											aria-hidden="true"
										/>
										Revoke
									</Button>
								)}
							</li>
						);
					})}
				</ul>
			)}

			{/* Single-session revoke confirmation */}
			<Dialog
				open={pendingRevoke !== null}
				onOpenChange={open => {
					if (!open) setPendingRevoke(null);
				}}
			>
				<DialogContent data-testid="revoke-session-dialog">
					<DialogHeader>
						<DialogTitle>Revoke this session?</DialogTitle>
						<DialogDescription>
							{pendingRevoke
								? `${pendingRevoke.device} (${pendingRevoke.browser}) will be signed out on its next request.`
								: ''}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							data-testid="revoke-session-cancel"
							onClick={() => setPendingRevoke(null)}
						>
							Cancel
						</Button>
						<AsyncButton
							type="button"
							variant="destructive"
							isPending={isRevoking}
							pendingText="Revoking…"
							data-testid="revoke-session-confirm"
							onClick={handleConfirmRevoke}
						>
							Revoke session
						</AsyncButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Revoke-all confirmation */}
			<Dialog
				open={confirmRevokeAll}
				onOpenChange={setConfirmRevokeAll}
			>
				<DialogContent data-testid="revoke-all-sessions-dialog">
					<DialogHeader>
						<DialogTitle>Revoke all other sessions?</DialogTitle>
						<DialogDescription>
							Every session except this device will be signed out. Your
							current session stays active.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							data-testid="revoke-all-sessions-cancel"
							onClick={() => setConfirmRevokeAll(false)}
						>
							Cancel
						</Button>
						<AsyncButton
							type="button"
							variant="destructive"
							isPending={isRevoking}
							pendingText="Revoking…"
							data-testid="revoke-all-sessions-confirm"
							onClick={handleConfirmRevokeAll}
						>
							Revoke all others
						</AsyncButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}
