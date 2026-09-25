import { TransactionBuilder, xdr } from '@stellar/stellar-sdk';
import { SigningPipelineError } from './errors';

function signatureKey(signature: xdr.DecoratedSignature): string {
	return `${Buffer.from(signature.hint.value).toString('hex')}:${Buffer.from(signature.signature.value).toString('base64')}`;
}

/** Aggregate signatures only when every payload represents the exact same transaction hash. */
export function aggregateSignedTransactions(
	unsignedXdr: string,
	signedXdrs: readonly string[],
	networkPassphrase: string
): string {
	const aggregate = TransactionBuilder.fromXDR(unsignedXdr, networkPassphrase);
	const expectedHash = Buffer.from(aggregate.hash()).toString('hex');
	const signatures = new Map(
		aggregate.signatures.map(signature => [
			signatureKey(signature),
			signature,
		])
	);

	for (const signedXdr of signedXdrs) {
		const candidate = TransactionBuilder.fromXDR(
			signedXdr,
			networkPassphrase
		);
		if (Buffer.from(candidate.hash()).toString('hex') !== expectedHash) {
			throw new SigningPipelineError(
				'NetworkMismatch',
				'Cannot aggregate signatures from different transaction payloads.'
			);
		}
		for (const signature of candidate.signatures) {
			signatures.set(signatureKey(signature), signature);
		}
	}

	aggregate.signatures.splice(
		0,
		aggregate.signatures.length,
		...signatures.values()
	);
	return aggregate.toXDR();
}
