import type { ScheduledTransfer } from '@/types/scheduledTransfer';

export interface ScheduledTransferDraft {
	to: string;
	keyId: string;
	amount: string;
	scheduledAt: string;
}

export function validateScheduledTransfer(draft: ScheduledTransferDraft): string | null {
	if (!draft.to.trim() || !draft.keyId.trim()) return 'Recipient and key are required.';
	const amount = Number(draft.amount);
	if (!Number.isFinite(amount) || amount <= 0) return 'Amount must be greater than zero.';
	if (!draft.scheduledAt || Number.isNaN(Date.parse(draft.scheduledAt))) return 'Choose a valid date.';
	if (Date.parse(draft.scheduledAt) <= Date.now()) return 'Choose a future date.';
	return null;
}

export function splitScheduledTransfers(
	transfers: ScheduledTransfer[],
	wallet: string
): { pending: ScheduledTransfer[]; incoming: ScheduledTransfer[] } {
	return {
		pending: transfers.filter((transfer) => transfer.from === wallet && transfer.status === 'pending'),
		incoming: transfers.filter((transfer) => transfer.to === wallet && transfer.status === 'incoming'),
	};
}
