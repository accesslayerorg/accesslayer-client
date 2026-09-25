import { describe, expect, it, vi, beforeEach } from 'vitest';
import { queryClient } from '@/providers/Web3Provider';

describe('QueryClient MutationCache Error Logger', () => {
	let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
	});

	it('emits structured log on final failure and filters sensitive fields', () => {
		const mutationCache = queryClient.getMutationCache();
		const onError = mutationCache.config.onError;

		expect(onError).toBeDefined();

		const stellarAddress = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
		const ethAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

		const error = {
			status: 400,
			message: `Failed for ${stellarAddress} and wallet ${ethAddress}`,
		};

		const variables = {
			creator_id: 'creator-123',
			amount: 50.5,
			price: '10.0',
			walletAddress: ethAddress,
		};

		const mutation = { options: { mutationKey: ['submitTrade', ethAddress, '100'] } } as unknown;

		onError!(error, variables, {}, mutation);

		expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
		const logArgs = consoleDebugSpy.mock.calls[0][1];

		// All 4 fields must be present
		expect(logArgs).toHaveProperty('mutation_key');
		expect(logArgs).toHaveProperty('status_code', 400);
		expect(logArgs).toHaveProperty('error_message');
		expect(logArgs).toHaveProperty('creator_id', 'creator-123');

		// Sensitive fields must not appear in the log
		expect(JSON.stringify(logArgs)).not.toContain(stellarAddress);
		expect(JSON.stringify(logArgs)).not.toContain(ethAddress);
		expect(JSON.stringify(logArgs)).not.toContain('50.5');
		expect(JSON.stringify(logArgs)).not.toContain('100');
	});
});
