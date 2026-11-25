// @vitest-environment node
// stellar-sdk 17 cannot encode non-native assets under jsdom.
import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import { EmbeddedWalletAdapter, SigningPipelineError, estimateNativeAmountXlm } from '@/lib/signing';

const source = Keypair.random();
const dest = Keypair.random().publicKey();
const passphrase = Networks.TESTNET;

function xdrWith(...ops: ReturnType<typeof Operation.payment>[]) {
	const builder = new TransactionBuilder(new Account(source.publicKey(), '1'), { fee: '100', networkPassphrase: passphrase });
	for (const op of ops) builder.addOperation(op);
	return builder.setTimeout(30).build().toXDR();
}
const pay = (amount: string, asset = Asset.native()) => Operation.payment({ destination: dest, asset, amount });

const assertion = { id: 'c', rawId: 'c', type: 'public-key' as const, response: { clientDataJSON: '', authenticatorData: '', signature: '', userHandle: null } };

function adapter(overrides: Partial<ConstructorParameters<typeof EmbeddedWalletAdapter>[0]> = {}) {
	const api = { sign: vi.fn(async () => 'SIGNED') };
	const reauthenticate = vi.fn(async () => assertion);
	const a = new EmbeddedWalletAdapter({
		publicKey: 'GEMBEDDED',
		networkPassphrase: passphrase,
		reauthThresholdXlm: 100,
		api,
		reauthenticate,
		...overrides,
	});
	return { a, api, reauthenticate };
}

describe('estimateNativeAmountXlm (#1477)', () => {
	it('sums native payments', () => {
		expect(estimateNativeAmountXlm(xdrWith(pay('40'), pay('2.5')), passphrase)).toBeCloseTo(42.5);
	});

	it('is unknown for other assets, contract calls and garbage', () => {
		const usdc = new Asset('USDC', Keypair.random().publicKey());
		expect(estimateNativeAmountXlm(xdrWith(pay('1', usdc)), passphrase)).toBeNull();
		const offer = Operation.manageSellOffer({ selling: Asset.native(), buying: usdc, amount: '1', price: '1' });
		expect(estimateNativeAmountXlm(xdrWith(offer as never), passphrase)).toBeNull();
		expect(estimateNativeAmountXlm('not-xdr', passphrase)).toBeNull();
	});
});

describe('EmbeddedWalletAdapter (#1477)', () => {
	it('exposes the embedded address and signs small transfers without a prompt', async () => {
		const { a, api, reauthenticate } = adapter();
		expect(a.type).toBe('software');
		expect(await a.getPublicKey()).toBe('GEMBEDDED');
		const xdr = xdrWith(pay('100'));
		expect(await a.sign(xdr)).toBe('SIGNED');
		expect(reauthenticate).not.toHaveBeenCalled();
		expect(api.sign).toHaveBeenCalledWith(xdr, passphrase, undefined);
	});

	it('requires passkey re-authentication above the threshold', async () => {
		const { a, api, reauthenticate } = adapter();
		const xdr = xdrWith(pay('100.0000001'));
		await a.sign(xdr);
		expect(reauthenticate).toHaveBeenCalledTimes(1);
		expect(api.sign).toHaveBeenCalledWith(xdr, passphrase, assertion);
	});

	it('fails safe when the amount cannot be read', async () => {
		const { a, reauthenticate } = adapter();
		await a.sign(xdrWith(pay('1', new Asset('USDC', Keypair.random().publicKey()))));
		expect(reauthenticate).toHaveBeenCalled();
	});

	it('does not sign when the passkey check is cancelled', async () => {
		const { a, api } = adapter({ reauthenticate: vi.fn(async () => Promise.reject(new Error('cancelled'))) });
		await expect(a.sign(xdrWith(pay('500')))).rejects.toBeInstanceOf(SigningPipelineError);
		expect(api.sign).not.toHaveBeenCalled();
	});
});
