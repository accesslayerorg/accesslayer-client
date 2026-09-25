import { describe, expect, it, vi } from 'vitest';
import {
	createWalletDisconnectLog,
	logWalletDisconnectSession,
} from '@/lib/walletSessionLog';

describe('walletSessionLog', () => {
	it('builds a structured disconnect log with a truncated address and session duration', () => {
		const address = '0x1234567890abcdef1234567890abcdef12345678';
		const connectedAt = 1_000;
		const disconnectedAt = 4_250;

		expect(
			createWalletDisconnectLog(address, connectedAt, disconnectedAt)
		).toEqual({
			truncated_address: '0x12...5678',
			session_duration_ms: 3_250,
			disconnected_at: '1970-01-01T00:00:04.250Z',
		});
	});

	it('does not emit a disconnect log in the test environment', () => {
		const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

		logWalletDisconnectSession(
			'0x1234567890abcdef1234567890abcdef12345678',
			1_000,
			2_000
		);

		expect(debugSpy).not.toHaveBeenCalled();
		debugSpy.mockRestore();
	});
});
