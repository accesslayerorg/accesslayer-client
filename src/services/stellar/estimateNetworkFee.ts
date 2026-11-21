/**
 * Estimates the Soroban network (resource) fee for a transaction by calling
 * the RPC `simulateTransaction` endpoint and reading `minResourceFee`.
 */

import {
	rpc,
	TransactionBuilder,
	Networks,
	Transaction,
	FeeBumpTransaction,
} from '@stellar/stellar-sdk';

const STROOPS_PER_XLM = 10_000_000;

export interface NetworkFeeEstimate {
	/** Resource fee in stroops as reported by the simulation. */
	feeStroops: number;
	/** Resource fee expressed in XLM. */
	feeXlm: number;
}

export interface EstimateNetworkFeeOptions {
	/** Soroban RPC server instance. */
	server: rpc.Server;
	/** Network passphrase the transaction was built for. Defaults to testnet. */
	networkPassphrase?: string;
}

/**
 * Simulates the given transaction XDR and returns the minimum resource fee.
 *
 * @throws Error when the simulation fails or the RPC reports an error.
 */
export async function estimateNetworkFee(
	txXdr: string,
	options: EstimateNetworkFeeOptions
): Promise<NetworkFeeEstimate> {
	if (!txXdr) {
		throw new Error('Transaction XDR is required to estimate network fee');
	}

	const { server, networkPassphrase = Networks.TESTNET } = options;
	const tx: Transaction | FeeBumpTransaction = TransactionBuilder.fromXDR(
		txXdr,
		networkPassphrase
	);
	const response = await server.simulateTransaction(tx);

	if (rpc.Api.isSimulationError(response)) {
		throw new Error(`Simulation failed: ${response.error}`);
	}

	const feeStroops = Number(response.minResourceFee ?? 0);
	if (!Number.isFinite(feeStroops) || feeStroops < 0) {
		throw new Error('Simulation returned an invalid resource fee');
	}

	return {
		feeStroops,
		feeXlm: feeStroops / STROOPS_PER_XLM,
	};
}
