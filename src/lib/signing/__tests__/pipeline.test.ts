import { describe, expect, it, vi } from 'vitest';
import { SigningPipelineError } from '../errors';
import { executeSigningPipeline, signWithRetry } from '../pipeline';
import type { Signer, SigningProgressState } from '../types';

function signer(type: Signer['type'], sign: Signer['sign']): Signer {
	return { type, sign, getPublicKey: vi.fn().mockResolvedValue('GTEST') };
}

describe('signWithRetry', () => {
	it('retries Ledger timeouts with 2s, 4s, and 8s delays', async () => {
		const sign = vi
			.fn()
			.mockRejectedValueOnce(new SigningPipelineError('LedgerTimeout'))
			.mockRejectedValueOnce(new SigningPipelineError('LedgerTimeout'))
			.mockRejectedValueOnce(new SigningPipelineError('LedgerTimeout'))
			.mockResolvedValue('signed-xdr');
		const sleep = vi.fn().mockResolvedValue(undefined);
		const onRetry = vi.fn();

		await expect(
			signWithRetry(signer('hardware', sign), 'xdr', { sleep, onRetry })
		).resolves.toBe('signed-xdr');
		expect(sign).toHaveBeenCalledTimes(4);
		expect(sleep.mock.calls.map(([delay]) => delay)).toEqual([
			2_000, 4_000, 8_000,
		]);
		expect(onRetry).toHaveBeenCalledTimes(3);
	});

	it('stops after three timeout retries', async () => {
		const sign = vi
			.fn()
			.mockRejectedValue(new SigningPipelineError('LedgerTimeout'));
		await expect(
			signWithRetry(signer('hardware', sign), 'xdr', {
				sleep: async () => undefined,
			})
		).rejects.toMatchObject({ type: 'LedgerTimeout' });
		expect(sign).toHaveBeenCalledTimes(4);
	});

	it.each(['LedgerLocked', 'LedgerAppNotOpen', 'UserRejected'] as const)(
		'does not retry %s',
		async type => {
			const sign = vi.fn().mockRejectedValue(new SigningPipelineError(type));
			await expect(
				signWithRetry(signer('hardware', sign), 'xdr', {
					sleep: async () => undefined,
				})
			).rejects.toMatchObject({ type });
			expect(sign).toHaveBeenCalledOnce();
		}
	);
});

describe('executeSigningPipeline', () => {
	it('emits progress only after each async step completes', async () => {
		const progress: SigningProgressState[] = [];
		const submit = vi.fn().mockResolvedValue({ hash: 'abc' });
		const result = await executeSigningPipeline({
			prepare: vi.fn().mockResolvedValue('unsigned-xdr'),
			signer: signer('software', vi.fn().mockResolvedValue('signed-xdr')),
			submit,
			onProgress: state => progress.push(state),
		});

		expect(result).toEqual({ hash: 'abc' });
		expect(submit).toHaveBeenCalledWith('signed-xdr');
		expect(progress.map(({ stage }) => stage)).toEqual([
			'preparing',
			'waiting-for-signature',
			'submitting',
			'complete',
		]);
	});
});
