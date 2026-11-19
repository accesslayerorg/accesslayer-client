import { useState } from 'react';
import { Copy, Check, UserCheck, Wallet } from 'lucide-react';
import { truncateTxHash } from '@/constants/stellar';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import { bpsToPercent } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import SetCoCreatorModal from './SetCoCreatorModal';

interface CoCreatorSectionProps {
	courseId: string;
	coCreatorAddress?: string;
	coCreatorSplitBps?: number;
	totalPaidToCoCreator?: number;
	totalPaidToCreator?: number;
	className?: string;
}

export function CoCreatorSection({
	courseId,
	coCreatorAddress,
	coCreatorSplitBps,
	totalPaidToCoCreator = 0,
	totalPaidToCreator = 0,
	className = '',
}: CoCreatorSectionProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	const hasCoCreator = Boolean(coCreatorAddress && coCreatorSplitBps && coCreatorSplitBps > 0);

	const handleCopyAddress = async () => {
		if (!coCreatorAddress) return;
		try {
			await copyTextToClipboard(coCreatorAddress);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Handle copy error silently
		}
	};

	return (
		<div
			data-testid="cocreator-section"
			className={`rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8 ${className}`}
		>
			<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
						<UserCheck className="size-5" aria-hidden="true" />
					</div>
					<div>
						<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
							Co-Creator Royalty Split
						</h2>
						<p className="text-xs text-white/60">
							Revenue split arrangement for secondary royalties and key sales
						</p>
					</div>
				</div>

				<button
					type="button"
					data-testid="set-cocreator-button"
					onClick={() => setIsModalOpen(true)}
					className="rounded-xl border border-amber-400/30 bg-amber-400/15 px-4 py-2 text-sm font-semibold font-jakarta text-amber-300 transition-all hover:bg-amber-400/25 hover:text-amber-200"
				>
					{hasCoCreator ? 'Edit Co-Creator' : 'Set Co-Creator'}
				</button>
			</div>

			{!hasCoCreator ? (
				<div
					data-testid="cocreator-empty-state"
					className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-center"
				>
					<Wallet className="size-8 text-white/30 mb-2" aria-hidden="true" />
					<p className="text-sm font-medium text-white/70">
						No co-creator configured
					</p>
					<p className="mt-1 text-xs text-white/40 max-w-xs">
						Configure a co-creator address and split percentage to automatically divide revenues.
					</p>
				</div>
			) : (
				<div className="space-y-6" data-testid="cocreator-details">
					{/* Co-creator Config Info */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
						<div>
							<span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
								Co-Creator Address
							</span>
							<div className="mt-1 flex items-center gap-2">
								<span
									data-testid="cocreator-address-display"
									className="font-mono text-sm font-semibold text-white"
									title={coCreatorAddress}
								>
									{truncateTxHash(coCreatorAddress ?? '', 8, 8)}
								</span>
								<button
									type="button"
									data-testid="copy-cocreator-address-button"
									onClick={handleCopyAddress}
									aria-label="Copy co-creator wallet address"
									className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
								>
									{copied ? (
										<Check className="size-4 text-green-400" aria-hidden="true" />
									) : (
										<Copy className="size-4" aria-hidden="true" />
									)}
								</button>
							</div>
						</div>

						<div>
							<span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
								Split Percentage
							</span>
							<div className="mt-1">
								<span
									data-testid="cocreator-split-display"
									className="inline-flex items-center rounded-lg bg-amber-400/20 px-3 py-1 font-mono text-sm font-bold text-amber-300"
								>
									{bpsToPercent(coCreatorSplitBps ?? 0)}
								</span>
							</div>
						</div>
					</div>

					{/* Stat Cards */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="cocreator-stat-cards">
						<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
							<span className="text-xs font-medium text-white/60">
								Total Paid to Co-Creator
							</span>
							<p
								data-testid="total-paid-cocreator"
								className="mt-1 font-grotesque text-2xl font-black text-white"
							>
								{formatDisplayKeyPrice(totalPaidToCoCreator)}
							</p>
						</div>

						<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
							<span className="text-xs font-medium text-white/60">
								Total Paid to Creator
							</span>
							<p
								data-testid="total-paid-creator"
								className="mt-1 font-grotesque text-2xl font-black text-white"
							>
								{formatDisplayKeyPrice(totalPaidToCreator)}
							</p>
						</div>
					</div>
				</div>
			)}

			<SetCoCreatorModal
				courseId={courseId}
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				initialAddress={coCreatorAddress}
				initialSplitBps={coCreatorSplitBps}
			/>
		</div>
	);
}

export default CoCreatorSection;
