import { Networks } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import {
	buildPermitPayload,
	classifyPermitError,
	createPermitDeadline,
	DEFAULT_PERMIT_DEADLINE_MINUTES,
	getPermitErrorMessage,
	hashNetworkPassphrase,
	MAX_PERMIT_DEADLINE_MINUTES,
	PERMIT_ERROR_MESSAGES,
} from '@/utils/permit.utils';

describe('permit payload utilities (#1390)', () => {
	it('builds the canonical payload with stable field order and precision', () => {
		const payload = buildPermitPayload({
			contractId: 'CCONTRACT',
			networkPassphrase: Networks.TESTNET,
			owner: 'GOWNER',
			spender: 'CSPENDER',
			key: 'CKEY',
			amount: 3,
			deadline: 1_800_000_000,
			nonce: 9_007_199_254_740_993n,
		});

		expect(payload).toMatchObject({
			domain: 'accesslayer.creator-keys.permit',
			version: 1,
			contract: 'CCONTRACT',
			networkPassphraseHash:
				'cee0302d59844d32bdca915c8203dd44b33fbb7edc19051ea37abedf28ecd472',
			owner: 'GOWNER',
			spender: 'CSPENDER',
			key: 'CKEY',
			amount: '3',
			deadline: '1800000000',
			nonce: '9007199254740993',
		});
		expect(payload.message).toBe(
			JSON.stringify(
				{
					domain: 'accesslayer.creator-keys.permit',
					version: 1,
					contract: 'CCONTRACT',
					networkPassphraseHash:
						'cee0302d59844d32bdca915c8203dd44b33fbb7edc19051ea37abedf28ecd472',
					owner: 'GOWNER',
					spender: 'CSPENDER',
					key: 'CKEY',
					amount: '3',
					deadline: '1800000000',
					nonce: '9007199254740993',
				},
				null,
				2
			)
		);
	});

	it('hashes the network passphrase with SHA-256', () => {
		expect(hashNetworkPassphrase(Networks.TESTNET)).toBe(
			'cee0302d59844d32bdca915c8203dd44b33fbb7edc19051ea37abedf28ecd472'
		);
	});

	it('defaults deadlines to 30 minutes and clamps them to the maximum', () => {
		const now = 1_700_000_000_000;
		expect(createPermitDeadline(now)).toBe(
			1_700_000_000 + DEFAULT_PERMIT_DEADLINE_MINUTES * 60
		);
		expect(createPermitDeadline(now, MAX_PERMIT_DEADLINE_MINUTES + 1)).toBe(
			1_700_000_000 + MAX_PERMIT_DEADLINE_MINUTES * 60
		);
	});

	it.each([
		[Object.assign(new Error('DeadlinePassed'), { code: 41 }), 'expired'],
		[new Error('HostError: Error(Contract, #41)'), 'expired'],
		[
			Object.assign(new Error('NonceAlreadyUsed'), { code: 104 }),
			'nonce-reused',
		],
		[new Error('HostError: Error(Contract, #104)'), 'nonce-reused'],
		[
			Object.assign(new Error('InvalidSignature'), { code: 103 }),
			'signature-mismatch',
		],
		[new Error('HostError: Error(Contract, #103)'), 'signature-mismatch'],
	] as const)('classifies %s as %s', (error, kind) => {
		expect(classifyPermitError(error)).toBe(kind);
		expect(getPermitErrorMessage(error)).toBe(PERMIT_ERROR_MESSAGES[kind]);
	});
});
