export type ScheduledTransferStatus = 'pending' | 'incoming' | 'completed' | 'cancelled';

export interface ScheduledTransfer {
	id: string;
	from: string;
	to: string;
	keyId: string;
	amount: number;
	scheduledAt: string;
	status: ScheduledTransferStatus;
}
