import { ShieldCheck } from 'lucide-react';
import CopyValueButton from '@/components/governance/CopyValueButton';
import {
	buildStellarExpertAccountUrl,
	type StellarNetwork,
} from '@/constants/stellar';
import type { GovernanceAdminState } from '@/types/governance';
import {
	formatCountdown,
	getCountdownParts,
	shortenValue,
} from '@/utils/governanceAudit.utils';

interface CurrentAdminCardProps {
	admin: GovernanceAdminState | undefined;
	isLoading: boolean;
	isError: boolean;
	network: StellarNetwork;
	nowMs: number;
}

function AddressLine({
	label,
	address,
	network,
	copyLabel,
	note,
}: {
	label: string;
	address: string;
	network: StellarNetwork;
	copyLabel: string;
	note?: string;
}) {
	return (
		<div>
			<dt className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40">
				{label}
			</dt>
			<dd className="mt-1 flex items-center gap-1">
				<a
					href={buildStellarExpertAccountUrl(address, network)}
					target="_blank"
					rel="noopener noreferrer"
					title={address}
					className="truncate font-mono text-sm text-white hover:text-amber-200 hover:underline"
				>
					{shortenValue(address, 6, 6)}
				</a>
				<CopyValueButton value={address} label={copyLabel} />
			</dd>
			{note && <dd className="mt-1 text-xs text-amber-200/80">{note}</dd>}
		</div>
	);
}

function pendingNote(
	expiresAt: string | null,
	nowMs: number
): string | undefined {
	if (!expiresAt) return undefined;
	const parts = getCountdownParts(expiresAt, nowMs);
	return parts.totalMs === 0
		? 'Offer expired'
		: `Expires in ${formatCountdown(parts)}`;
}

/**
 * Shows who controls the protocol right now and any admin waiting to take
 * over, with the time left on that pending transfer (#1351).
 */
export default function CurrentAdminCard({
	admin,
	isLoading,
	isError,
	network,
	nowMs,
}: CurrentAdminCardProps) {
	return (
		<section
			aria-labelledby="current-admin-heading"
			data-testid="current-admin-card"
			className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
		>
			<div className="flex items-center gap-2 text-white/70">
				<ShieldCheck
					className="size-4 text-emerald-400"
					aria-hidden="true"
				/>
				<h2
					id="current-admin-heading"
					className="text-sm font-bold uppercase tracking-[0.15em]"
				>
					Protocol admin
				</h2>
			</div>

			{isLoading && (
				<p className="mt-4 text-sm text-white/50" aria-live="polite">
					Loading admin…
				</p>
			)}

			{!isLoading && (isError || !admin) && (
				<p className="mt-4 text-sm text-red-300" role="alert">
					Could not load the current admin.
				</p>
			)}

			{!isLoading && admin && (
				<dl className="mt-4 grid gap-4 sm:grid-cols-2">
					{admin.currentAdmin ? (
						<AddressLine
							label="Current admin"
							address={admin.currentAdmin}
							network={network}
							copyLabel="current admin address"
						/>
					) : (
						<div>
							<dt className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40">
								Current admin
							</dt>
							<dd className="mt-1 text-sm text-white/50">Unknown</dd>
						</div>
					)}

					{admin.pendingAdmin ? (
						<AddressLine
							label="Pending admin"
							address={admin.pendingAdmin}
							network={network}
							copyLabel="pending admin address"
							note={pendingNote(admin.pendingExpiresAt, nowMs)}
						/>
					) : (
						<div>
							<dt className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40">
								Pending admin
							</dt>
							<dd className="mt-1 text-sm text-white/50">None</dd>
						</div>
					)}
				</dl>
			)}
		</section>
	);
}
