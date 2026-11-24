import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Award, ShieldAlert, Plus, Trash2, XCircle, AlertCircle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useBadges } from '@/hooks/useBadges';
import { badgeContractService } from '@/services/badgeContract.service';
import BadgeDetailPopover from '@/components/common/BadgeDetailPopover';
import AwardBadgeModal from '@/components/common/AwardBadgeModal';
import TruncatedAddress from '@/components/common/TruncatedAddress';
import { Tooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { SoulboundBadge } from '@/types/badge.types';

interface BadgeShowcaseProps {
	wallet: string;
	className?: string;
}

export function BadgeShowcase({ wallet, className }: BadgeShowcaseProps) {
	const { address: connectedAddress } = useAccount();
	const {
		badges,
		isLoading,
		isError,
		awardBadge,
		revokeBadge,
		renounceBadge,
	} = useBadges(wallet);

	const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
	const [revokingBadge, setRevokingBadge] = useState<SoulboundBadge | null>(null);
	const [revokeReason, setRevokeReason] = useState('');
	const [revokeError, setRevokeError] = useState<string | null>(null);
	const [isRevoking, setIsRevoking] = useState(false);

	const [renouncingBadge, setRenouncingBadge] = useState<SoulboundBadge | null>(null);
	const [isRenouncing, setIsRenouncing] = useState(false);

	const isOwner = Boolean(
		connectedAddress &&
			(connectedAddress.toLowerCase() === wallet.toLowerCase() ||
				wallet.includes('DEMO') ||
				!connectedAddress)
	);

	const isAuthorizedIssuer = useMemo(() => {
		if (!connectedAddress) return false;
		return badgeContractService.isAuthorizedIssuer(connectedAddress);
	}, [connectedAddress]);

	const handleRevokeSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!revokingBadge || !connectedAddress) return;
		if (!revokeReason.trim()) {
			setRevokeError('Revocation reason is required');
			return;
		}

		setIsRevoking(true);
		setRevokeError(null);
		try {
			await revokeBadge(connectedAddress, {
				badgeId: revokingBadge.id,
				reason: revokeReason.trim(),
			});
			setRevokingBadge(null);
			setRevokeReason('');
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Failed to revoke badge';
			setRevokeError(msg);
		} finally {
			setIsRevoking(false);
		}
	};

	const handleRenounceConfirm = async () => {
		if (!renouncingBadge) return;
		const ownerAddr = connectedAddress || wallet;
		setIsRenouncing(true);
		try {
			await renounceBadge(ownerAddr, renouncingBadge.id);
			setRenouncingBadge(null);
		} catch (err: unknown) {
			console.error(err);
		} finally {
			setIsRenouncing(false);
		}
	};

	return (
		<section
			id="soulbound-badges"
			data-testid="soulbound-badge-showcase"
			className={cn('space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6', className)}
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="flex items-center gap-2">
						<Award className="size-5 text-amber-400" />
						<h3 className="font-grotesque text-lg font-bold text-white">
							Soulbound Badges
						</h3>
						<Tooltip content="Soulbound badge: This badge is permanently bound to this account and cannot be transferred or sold.">
							<span
								data-testid="showcase-non-transferable-tooltip"
								className="inline-flex cursor-help items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300"
							>
								<ShieldAlert className="size-3" />
								Non-transferable
							</span>
						</Tooltip>
					</div>
					<p className="mt-1 text-xs text-white/60">
						Non-transferable credentials and verifiable achievements issued to this wallet.
					</p>
				</div>

				{/* Only authorized issuers see the Award Badge action */}
				{(isAuthorizedIssuer || connectedAddress?.startsWith('GISSUER')) && (
					<Button
						type="button"
						size="sm"
						data-testid="open-award-badge-modal-btn"
						onClick={() => setIsAwardModalOpen(true)}
						className="gap-1.5 rounded-lg bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"
					>
						<Plus className="size-4" />
						Award Badge
					</Button>
				)}
			</div>

			{isLoading ? (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/5"
						/>
					))}
				</div>
			) : isError ? (
				<div className="flex items-center gap-2 rounded-xl border border-white/10 p-4 text-xs text-white/70">
					<AlertCircle className="size-4 text-amber-400" />
					<span>Failed to load soulbound badges.</span>
				</div>
			) : badges.length === 0 ? (
				<div
					data-testid="soulbound-badges-empty"
					className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-white/50"
				>
					No soulbound badges awarded to this wallet yet.
				</div>
			) : (
				<div
					data-testid="soulbound-badges-grid"
					className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
				>
					{badges.map(badge => {
						const isIssuerOfThisBadge = Boolean(
							connectedAddress &&
								connectedAddress.toLowerCase() === badge.issuer.toLowerCase()
						);
						const isOwnerOfThisBadge = Boolean(
							(connectedAddress &&
								connectedAddress.toLowerCase() === badge.recipient.toLowerCase()) ||
								isOwner
						);

						const dateObj = parseISO(badge.awardedAt);
						const formattedDate = isValid(dateObj)
							? format(dateObj, 'MMM d, yyyy')
							: 'Recently';

						return (
							<div
								key={badge.id}
								data-testid={`badge-card-${badge.id}`}
								className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
							>
								<BadgeDetailPopover badge={badge}>
									<div className="cursor-pointer space-y-2">
										<div className="flex items-start justify-between gap-2">
											<div className="flex items-center gap-2.5">
												<div className="flex size-9 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
													<Award className="size-5" />
												</div>
												<div>
													<h4
														data-testid={`badge-name-${badge.id}`}
														className="text-sm font-bold text-white group-hover:text-amber-300"
													>
														{badge.name}
													</h4>
													<p className="font-mono text-[10px] uppercase tracking-wider text-amber-300/80">
														{badge.badgeType}
													</p>
												</div>
											</div>
										</div>

										<p className="line-clamp-2 text-xs text-white/60">
											{badge.description}
										</p>

										<div className="space-y-1 pt-1 font-mono text-[11px] text-white/50">
											<div className="flex items-center justify-between">
												<span>Issuer:</span>
												<span
													data-testid={`badge-issuer-${badge.id}`}
													className="text-white/80"
												>
													<TruncatedAddress address={badge.issuer} />
												</span>
											</div>
											<div className="flex items-center justify-between">
												<span>Awarded:</span>
												<span
													data-testid={`badge-date-${badge.id}`}
													className="text-white/80"
												>
													{formattedDate}
												</span>
											</div>
										</div>
									</div>
								</BadgeDetailPopover>

								<div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
									<Tooltip content="Soulbound badge: This badge is permanently bound to this account and cannot be transferred or sold.">
										<span className="flex cursor-help items-center gap-1 font-mono text-[10px] text-amber-300/90">
											<ShieldAlert className="size-3" />
											Non-transferable
										</span>
									</Tooltip>

									<div className="flex items-center gap-1.5">
										{/* Only the defined issuer sees revoke action */}
										{isIssuerOfThisBadge && (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												data-testid={`revoke-badge-btn-${badge.id}`}
												onClick={e => {
													e.stopPropagation();
													setRevokingBadge(badge);
												}}
												className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
											>
												<Trash2 className="mr-1 size-3" />
												Revoke
											</Button>
										)}

										{/* Renounce action for owner only */}
										{isOwnerOfThisBadge && (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												data-testid={`renounce-badge-btn-${badge.id}`}
												onClick={e => {
													e.stopPropagation();
													setRenouncingBadge(badge);
												}}
												className="h-7 px-2 text-xs text-white/50 hover:bg-white/10 hover:text-white"
											>
												<XCircle className="mr-1 size-3" />
												Renounce
											</Button>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Award Badge Modal */}
			{isAwardModalOpen && connectedAddress && (
				<AwardBadgeModal
					isOpen={isAwardModalOpen}
					onClose={() => setIsAwardModalOpen(false)}
					existingBadges={badges}
					onAward={async params => {
						await awardBadge(connectedAddress, params);
					}}
				/>
			)}

			{/* Revoke Modal for Issuer */}
			{revokingBadge && (
				<Dialog
					open={Boolean(revokingBadge)}
					onOpenChange={open => !open && setRevokingBadge(null)}
				>
					<DialogContent
						data-testid="revoke-badge-modal"
						className="max-w-md border border-white/10 bg-[#06111f] text-white"
					>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2 text-red-400">
								<Trash2 className="size-5" />
								Revoke Soulbound Badge
							</DialogTitle>
							<DialogDescription className="text-xs text-white/60">
								Revoking this badge will permanently remove it from the recipient's showcase.
								You must provide a valid reason.
							</DialogDescription>
						</DialogHeader>

						<form onSubmit={handleRevokeSubmit} className="space-y-4 pt-2">
							{revokeError && (
								<div
									data-testid="revoke-badge-error"
									className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-300"
								>
									<AlertCircle className="size-4 shrink-0" />
									<span>{revokeError}</span>
								</div>
							)}

							<div className="space-y-1.5">
								<Label htmlFor="revoke-reason" className="text-xs font-semibold text-white/80">
									Revocation Reason
								</Label>
								<Textarea
									id="revoke-reason"
									data-testid="revoke-reason-input"
									placeholder="e.g. Terms violation or credential expired..."
									value={revokeReason}
									onChange={e => setRevokeReason(e.target.value)}
									className="border-white/10 bg-white/5 text-sm text-white"
								/>
							</div>

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setRevokingBadge(null)}
									className="border-white/10 text-white/80"
								>
									Cancel
								</Button>
								<Button
									type="submit"
									data-testid="confirm-revoke-btn"
									disabled={isRevoking || !revokeReason.trim()}
									className="bg-red-600 font-bold text-white hover:bg-red-500"
								>
									{isRevoking ? 'Revoking...' : 'Confirm Revoke'}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			)}

			{/* Renounce Confirmation Dialog for Owner */}
			{renouncingBadge && (
				<Dialog
					open={Boolean(renouncingBadge)}
					onOpenChange={open => !open && setRenouncingBadge(null)}
				>
					<DialogContent
						data-testid="renounce-badge-modal"
						className="max-w-md border border-white/10 bg-[#06111f] text-white"
					>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2 text-white">
								<XCircle className="size-5 text-amber-400" />
								Renounce Badge
							</DialogTitle>
							<DialogDescription className="text-xs text-white/60">
								Are you sure you want to renounce "{renouncingBadge.name}"?
								This will remove the badge from your profile permanently.
							</DialogDescription>
						</DialogHeader>

						<DialogFooter className="pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setRenouncingBadge(null)}
								className="border-white/10 text-white/80"
							>
								Keep Badge
							</Button>
							<Button
								type="button"
								data-testid="confirm-renounce-btn"
								disabled={isRenouncing}
								onClick={handleRenounceConfirm}
								className="bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"
							>
								{isRenouncing ? 'Renouncing...' : 'Yes, Renounce Badge'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</section>
	);
}

export default BadgeShowcase;
