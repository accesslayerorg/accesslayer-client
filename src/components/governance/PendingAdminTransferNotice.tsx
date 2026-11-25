import { AlertTriangle } from 'lucide-react';
import CopyValueButton from '@/components/governance/CopyValueButton';
import {
	formatCountdown,
	getCountdownParts,
	shortenValue,
} from '@/utils/governanceAudit.utils';

interface PendingAdminTransferNoticeProps {
	pendingAdmin: string;
	/** ISO timestamp when the pending transfer stops being acceptable. */
	expiresAt: string | null;
	/** Current time in ms, owned by the page so every countdown ticks together. */
	nowMs: number;
}

/**
 * Prominent alert shown while an admin transfer awaits acceptance (#1351).
 * Holders see who would take control and how long the offer stays open.
 */
export default function PendingAdminTransferNotice({
	pendingAdmin,
	expiresAt,
	nowMs,
}: PendingAdminTransferNoticeProps) {
	const parts = expiresAt ? getCountdownParts(expiresAt, nowMs) : null;
	const expired = parts !== null && parts.totalMs === 0;

	return (
		<section
			role="alert"
			aria-labelledby="pending-admin-transfer-heading"
			data-testid="pending-admin-transfer-notice"
			className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.08] p-5 sm:p-6"
		>
			<div className="flex items-start gap-3">
				<AlertTriangle
					className="mt-0.5 size-5 shrink-0 text-amber-400"
					aria-hidden="true"
				/>
				<div className="min-w-0 flex-1">
					<h2
						id="pending-admin-transfer-heading"
						className="font-grotesque text-lg font-bold text-amber-100"
					>
						Admin transfer pending
					</h2>
					<p className="mt-1 font-jakarta text-sm text-white/70">
						Control of the protocol is being handed to a new admin. The
						transfer completes only if the new admin accepts it before it
						expires.
					</p>

					<div className="mt-3 flex flex-wrap items-center gap-1 text-sm">
						<span className="text-white/50">Proposed admin:</span>
						<span className="font-mono text-white" title={pendingAdmin}>
							{shortenValue(pendingAdmin, 6, 6)}
						</span>
						<CopyValueButton
							value={pendingAdmin}
							label="pending admin address"
						/>
					</div>

					{parts && (
						<p
							className="mt-3 font-mono text-2xl font-black tabular-nums text-amber-200"
							data-testid="pending-admin-countdown"
						>
							{expired ? (
								'Expired'
							) : (
								<>
									<span className="sr-only">Expires in </span>
									{formatCountdown(parts)}
								</>
							)}
						</p>
					)}
					{expiresAt && (
						<p className="mt-1 text-xs text-white/45">
							{expired ? 'Expired at ' : 'Expires '}
							<time dateTime={expiresAt}>
								{new Date(expiresAt).toLocaleString()}
							</time>
						</p>
					)}
				</div>
			</div>
		</section>
	);
}
