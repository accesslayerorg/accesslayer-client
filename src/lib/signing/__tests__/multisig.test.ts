import {
	Account,
	Asset,
	Keypair,
	Networks,
	Operation,
	TransactionBuilder,
} from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { aggregateSignedTransactions } from '../multisig';

function transactionXdr(sequence = '1'): string {
	const source = Keypair.random();
	return new TransactionBuilder(new Account(source.publicKey(), sequence), {
		fee: '100',
		networkPassphrase: Networks.TESTNET,
	})
		.addOperation(
			Operation.payment({
				destination: Keypair.random().publicKey(),
				asset: Asset.native(),
				amount: '1',
			})
		)
		.setTimeout(60)
		.build()
		.toXDR();
}

describe('aggregateSignedTransactions', () => {
	it('deduplicates and aggregates signatures for the same transaction', () => {
		const unsigned = transactionXdr();
		const first = TransactionBuilder.fromXDR(unsigned, Networks.TESTNET);
		const second = TransactionBuilder.fromXDR(unsigned, Networks.TESTNET);
		first.sign(Keypair.random());
		second.sign(Keypair.random());

		const aggregated = aggregateSignedTransactions(
			unsigned,
			[first.toXDR(), second.toXDR(), first.toXDR()],
			Networks.TESTNET
		);
		expect(
			TransactionBuilder.fromXDR(aggregated, Networks.TESTNET).signatures
		).toHaveLength(2);
	});

	it('rejects signatures for a different transaction payload', () => {
		expect(() =>
			aggregateSignedTransactions(
				transactionXdr('1'),
				[transactionXdr('2')],
				Networks.TESTNET
			)
		).toThrow('different transaction payloads');
	});
});
