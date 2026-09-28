import { describe, expect, it, vi } from 'vitest';
import { Address } from '@stellar/stellar-sdk';
import type { Signer } from '@/lib/signing/types';
import {
	LpContractError,
	LpContractService,
	type LpAssembledTransaction,
	type LpContractClient,
} from '../lpContract.service';

const PROVIDER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const KEY = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';

const signer: Signer = {
	type: 'software',
	getPublicKey: vi.fn().mockResolvedValue(PROVIDER),
	sign: vi.fn().mockResolvedValue('signed-xdr'),
};

/** Mimics the SDK's `Ok` / `Err` contract `Result`. */
const okResult = (value: unknown) => ({
	isOk: () => true,
	isErr: () => false,
	unwrap: () => value,
});
const errResult = () => ({
	isOk: () => false,
	isErr: () => true,
	unwrap: () => {
		throw new Error('unwrap on Err');
	},
});

function assembled({
	simulated = okResult(0n),
	simulation = {},
	sendStatus = 'SUCCESS',
	hash = 'a'.repeat(64),
	returned = okResult(0n),
}: {
	simulated?: unknown;
	simulation?: unknown;
	sendStatus?: string;
	hash?: string | null;
	returned?: unknown;
} = {}): LpAssembledTransaction & { signAndSend: ReturnType<typeof vi.fn> } {
	return {
		simulation,
		result: simulated,
		signAndSend: vi.fn().mockResolvedValue({
			sendTransactionResponse: { hash: hash ?? undefined },
			getTransactionResponse: { status: sendStatus },
			result: returned,
		}),
	};
}

function serviceWith(client: Partial<LpContractClient>) {
	const factory = vi.fn().mockResolvedValue(client);
	return { service: new LpContractService(factory), factory };
}

describe('LpContractService.addLiquidity', () => {
	it('calls add_liquidity(key_id, provider, amount) and returns the new lp_id', async () => {
		const tx = assembled({ simulated: okResult(9n), returned: okResult(9n) });
		const add_liquidity = vi.fn().mockResolvedValue(tx);
		const { service, factory } = serviceWith({ add_liquidity });

		const result = await service.addLiquidity({
			keyId: KEY,
			provider: PROVIDER,
			amountStroops: 25_000_000n,
			signer,
		});

		expect(factory).toHaveBeenCalledWith(PROVIDER, signer);
		const args = add_liquidity.mock.calls[0][0];
		expect(args.key_id).toBeInstanceOf(Address);
		expect(args.key_id.toString()).toBe(KEY);
		expect(args.provider.toString()).toBe(PROVIDER);
		expect(args.amount).toBe(25_000_000n);
		expect(tx.signAndSend).toHaveBeenCalledOnce();
		expect(result).toEqual({ hash: 'a'.repeat(64), value: 9n });
	});

	it('rejects a non-positive amount before building a transaction', async () => {
		const add_liquidity = vi.fn();
		const { service } = serviceWith({ add_liquidity });
		await expect(
			service.addLiquidity({
				keyId: KEY,
				provider: PROVIDER,
				amountStroops: 0n,
				signer,
			})
		).rejects.toMatchObject({ code: 'INVALID_INPUT' });
		expect(add_liquidity).not.toHaveBeenCalled();
	});

	it('rejects an invalid key address', async () => {
		const add_liquidity = vi.fn();
		const { service } = serviceWith({ add_liquidity });
		await expect(
			service.addLiquidity({
				keyId: 'alpha',
				provider: PROVIDER,
				amountStroops: 1n,
				signer,
			})
		).rejects.toMatchObject({ code: 'INVALID_INPUT' });
	});
});

describe('LpContractService.claimRewards', () => {
	it('submits claim_lp_rewards with the u64 lp_id and returns the claimed amount', async () => {
		const tx = assembled({
			simulated: okResult(500n),
			returned: okResult(500n),
		});
		const claim_lp_rewards = vi.fn().mockResolvedValue(tx);
		const { service } = serviceWith({ claim_lp_rewards });

		const result = await service.claimRewards({
			lpId: '42',
			provider: PROVIDER,
			signer,
		});

		expect(claim_lp_rewards).toHaveBeenCalledWith({ lp_id: 42n });
		expect(result.value).toBe(500n);
		expect(tx.signAndSend).toHaveBeenCalledOnce();
	});

	it('does not ask the wallet to sign when the contract would claim nothing', async () => {
		const tx = assembled({ simulated: okResult(0n) });
		const { service } = serviceWith({
			claim_lp_rewards: vi.fn().mockResolvedValue(tx),
		});

		await expect(
			service.claimRewards({ lpId: '1', provider: PROVIDER, signer })
		).rejects.toMatchObject({ code: 'NOTHING_TO_CLAIM' });
		expect(tx.signAndSend).not.toHaveBeenCalled();
	});

	it('maps a contract simulation error without prompting the wallet', async () => {
		const tx = assembled({
			simulation: { error: 'HostError: Error(Contract, #6)' },
			simulated: errResult(),
		});
		const { service } = serviceWith({
			claim_lp_rewards: vi.fn().mockResolvedValue(tx),
		});

		await expect(
			service.claimRewards({ lpId: '1', provider: PROVIDER, signer })
		).rejects.toThrow('This liquidity position has already been closed.');
		expect(tx.signAndSend).not.toHaveBeenCalled();
	});

	it('rejects a non-numeric lp id', async () => {
		const claim_lp_rewards = vi.fn();
		const { service } = serviceWith({ claim_lp_rewards });
		await expect(
			service.claimRewards({ lpId: 'abc', provider: PROVIDER, signer })
		).rejects.toMatchObject({ code: 'INVALID_INPUT' });
		expect(claim_lp_rewards).not.toHaveBeenCalled();
	});
});

describe('LpContractService.removeLiquidity', () => {
	it('submits remove_liquidity and returns principal + rewards', async () => {
		const tx = assembled({
			simulated: okResult(1_000n),
			returned: okResult(1_000n),
		});
		const remove_liquidity = vi.fn().mockResolvedValue(tx);
		const { service } = serviceWith({ remove_liquidity });

		const result = await service.removeLiquidity({
			lpId: '3',
			provider: PROVIDER,
			signer,
		});

		expect(remove_liquidity).toHaveBeenCalledWith({ lp_id: 3n });
		expect(result).toEqual({ hash: 'a'.repeat(64), value: 1_000n });
	});

	it('never reports success for a transaction that failed on-chain', async () => {
		const tx = assembled({ sendStatus: 'FAILED', hash: 'b'.repeat(64) });
		const { service } = serviceWith({
			remove_liquidity: vi.fn().mockResolvedValue(tx),
		});

		const error = await service
			.removeLiquidity({ lpId: '3', provider: PROVIDER, signer })
			.catch(e => e);
		expect(error).toBeInstanceOf(LpContractError);
		expect(error.code).toBe('TRANSACTION_FAILED');
		expect(error.hash).toBe('b'.repeat(64));
	});

	it('treats a missing transaction hash as a failure', async () => {
		const tx = assembled({ hash: null });
		const { service } = serviceWith({
			remove_liquidity: vi.fn().mockResolvedValue(tx),
		});
		await expect(
			service.removeLiquidity({ lpId: '3', provider: PROVIDER, signer })
		).rejects.toMatchObject({ code: 'TRANSACTION_FAILED' });
	});

	it('propagates a wallet rejection unchanged', async () => {
		const rejection = new Error('User declined access');
		const tx = assembled();
		tx.signAndSend.mockRejectedValue(rejection);
		const { service } = serviceWith({
			remove_liquidity: vi.fn().mockResolvedValue(tx),
		});
		await expect(
			service.removeLiquidity({ lpId: '3', provider: PROVIDER, signer })
		).rejects.toBe(rejection);
	});

	it('maps a thrown simulation result with a contract code', async () => {
		const tx = {
			simulation: undefined,
			get result(): unknown {
				throw new Error(
					'Transaction simulation failed: Error(Contract, #2)'
				);
			},
			signAndSend: vi.fn(),
		};
		const { service } = serviceWith({
			remove_liquidity: vi.fn().mockResolvedValue(tx),
		});
		await expect(
			service.removeLiquidity({ lpId: '3', provider: PROVIDER, signer })
		).rejects.toThrow('This liquidity position no longer exists.');
		expect(tx.signAndSend).not.toHaveBeenCalled();
	});
});
