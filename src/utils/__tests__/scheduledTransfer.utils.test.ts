import { describe, expect, it } from 'vitest';
import { splitScheduledTransfers, validateScheduledTransfer } from '../scheduledTransfer.utils';

describe('scheduled transfer helpers', () => {
	it('validates a future transfer draft', () => {
		expect(validateScheduledTransfer({ to: '', keyId: 'key', amount: '1', scheduledAt: '2030-01-01' })).toMatch(/required/);
		expect(validateScheduledTransfer({ to: 'GRECIPIENT', keyId: 'key', amount: '0', scheduledAt: '2030-01-01' })).toMatch(/greater/);
		expect(validateScheduledTransfer({ to: 'GRECIPIENT', keyId: 'key', amount: '1', scheduledAt: '2030-01-01' })).toBeNull();
	});

	it('separates outgoing pending and incoming transfers', () => {
		const transfers = [
			{ id: '1', from: 'wallet', to: 'other', keyId: 'key', amount: 1, scheduledAt: '2030-01-01', status: 'pending' as const },
			{ id: '2', from: 'other', to: 'wallet', keyId: 'key', amount: 2, scheduledAt: '2030-01-01', status: 'incoming' as const },
			{ id: '3', from: 'wallet', to: 'other', keyId: 'key', amount: 3, scheduledAt: '2030-01-01', status: 'completed' as const },
		];
		expect(splitScheduledTransfers(transfers, 'wallet')).toMatchObject({ pending: [{ id: '1' }], incoming: [{ id: '2' }] });
	});
});
