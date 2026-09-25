import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Clock3, Copy, XCircle } from 'lucide-react';
import { formatRecentActivityCompactTimestamp } from '@/utils/recentActivityTimestamp.utils';
import { groupEntriesByDate, formatDateHeader } from '@/utils/activityTimeline.utils';
import CopySuccessAnnouncement from '@/components/common/CopySuccessAnnouncement';
import { useCopySuccessAnnouncement } from '@/hooks/useCopySuccessAnnouncement';
import showToast from '@/utils/toast.util';
import { copyTextToClipboard } from '@/utils/clipboard.utils';

type CopyState = 'idle' | 'success' | 'error';

interface TimelineEntry {
	id: string;
	action: string;
	amount: string;
	txHash: string;
	compactTimestamp?: string | null;
	status: 'confirmed' | 'pending' | 'failed';
	timestamp?: number;
}

const DEFAULT_TIMELINE_ENTRIES: TimelineEntry[] = [
	{
		id: 'entry-1',
		action: 'Buy',
		amount: '+2 keys',
		txHash:
			'0x2a43bcfdef77ca4c50ef7d38148dd5d7f0149a6e2e20f70f04ce1f4b66fe55dd',
		compactTimestamp: '2m ago',
		status: 'confirmed',
		timestamp: Date.now(),
	},
	{
		id: 'entry-2',
		action: 'Sell',
		amount: '-1 key',
		txHash:
			'0x90c82ac01478b42fcbf9db73a26ed32bd8e50a8917e2408c31c95e9f6a59fc19',
		compactTimestamp: '18m ago',
		status: 'pending',
		timestamp: Date.now() - 18 * 60 * 1000,
	},
	{
		id: 'entry-3',
		action: 'Buy',
		amount: '+3 keys',
		txHash:
			'0x16d2ffbc4297a8c2c3086e07c16e66f47287df0d5a1ce1aef9e448e2f0f3ab51',
		compactTimestamp: 'Yesterday',
		status: 'failed',
		timestamp: Date.now() - 24 * 60 * 60 * 1000,
	},
	{
		id: 'entry-4',
		action: 'Sell',
		amount: '-2 keys',
		txHash:
			'0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
		compactTimestamp: '2 days ago',
		status: 'confirmed',
		timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
	},
];

const shortenTxHash = (hash: string) =>
	`${hash.slice(0, 8)}...${hash.slice(-6)}`;

interface EmptyTransactionTimelineStateProps {
	/** Optional transaction data. If provided and empty, the component returns null. */
	data?: TimelineEntry[];
}

const EmptyTransactionTimelineState: React.FC<
	EmptyTransactionTimelineStateProps
> = ({ data = DEFAULT_TIMELINE_ENTRIES }) => {
	const [copyStateById, setCopyStateById] = useState<
		Record<string, CopyState>
	>({});
	const { announcement, announceCopySuccess } = useCopySuccessAnnouncement();

	if (!data || data.length === 0) {
		return null;
	}

	const copyTxHash = async (entryId: string, txHash: string) => {
		try {
			await copyTextToClipboard(txHash);
			announceCopySuccess('Transaction hash copied.');
			setCopyStateById(current => ({ ...current, [entryId]: 'success' }));
		} catch {
			setCopyStateById(current => ({ ...current, [entryId]: 'error' }));
			showToast.error(
				'Could not copy the transaction hash. Please copy it manually.'
			);
		}

		window.setTimeout(() => {
			setCopyStateById(current => ({ ...current, [entryId]: 'idle' }));
		}, 1300);
	};

	const groupedEntries = groupEntriesByDate(data);

	return (
		<section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
			<div className="mx-auto max-w-4xl">
				<div className="mb-5 flex items-start justify-between gap-3">
					<div>
						<h3 className="font-grotesque text-2xl font-bold text-white">
							Transaction timeline
						</h3>
						<p className="mt-2 text-sm text-white/65">
							Recent trade events with quick copy access for tx hashes.
						</p>
					</div>
					<div className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-amber-300">
						<Clock3 className="size-5" />
					</div>
				</div>

				<div className="space-y-4">
					{groupedEntries.map(group => (
						<div key={group.date.toDateString()}>
							<h4
								className="mb-2 font-grotesque text-sm font-semibold text-white/70"
								role="heading"
								aria-level={4}
							>
								{formatDateHeader(group.date)}
							</h4>
							<div className="space-y-2">
								{group.entries.map(entry => {
									const copyState = copyStateById[entry.id] ?? 'idle';
									const isSuccess = copyState === 'success';
									const isError = copyState === 'error';
									const statusClass =
										entry.status === 'confirmed'
											? 'text-emerald-300'
											: entry.status === 'pending'
												? 'text-amber-300'
												: 'text-rose-300';

									return (
										<div
											key={entry.id}
											className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-white/5 bg-white/[0.04] px-3 py-2 text-xs md:text-sm"
										>
											<span className="text-white/80">{entry.action}</span>
											<span className="font-semibold text-white">
												{entry.amount}
											</span>
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<span
														className="truncate font-mono text-white/70"
														title={entry.txHash}
													>
														{shortenTxHash(entry.txHash)}
													</span>
													<button
														type="button"
														onClick={() =>
															copyTxHash(entry.id, entry.txHash)
														}
														className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
														aria-label={
															isSuccess
																? 'Transaction hash copied'
																: isError
																	? 'Transaction hash copy failed'
																	: 'Copy transaction hash'
														}
													>
														{isSuccess ? (
															<Check className="size-3 text-emerald-400" />
														) : isError ? (
															<XCircle className="size-3 text-rose-400" />
														) : (
															<Copy className="size-3" />
														)}
													</button>
												</div>
												<span
													role="status"
													aria-live="polite"
													aria-atomic="true"
													className="sr-only"
												>
													{isError ? 'Failed to copy transaction hash' : ''}
												</span>
											</div>
											<div className="text-right">
												<p className={statusClass}>{entry.status}</p>
												<p className="text-[10px] text-white/40">
													{formatRecentActivityCompactTimestamp(
														entry.compactTimestamp
													)}
												</p>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					))}
				</div>

				<CopySuccessAnnouncement message={announcement} />

				<div className="mt-5 flex justify-center">
					<Button className="rounded-xl">Open full history</Button>
				</div>
			</div>
		</section>
	);
};

export default EmptyTransactionTimelineState;
