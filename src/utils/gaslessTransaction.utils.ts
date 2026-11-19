export interface GaslessSwapPayload {
    creatorId: string;
    amount: number;
    walletAddress: string;
    nonce: number;
    chainId: number;
}

/** Build the signed message envelope sent to a gasless transaction relayer. */
export function buildGaslessSwapPayload(input: GaslessSwapPayload): GaslessSwapPayload {
    if (!input.creatorId || !input.walletAddress) {
        throw new Error('Gasless swaps require a creator and wallet address');
    }
    if (!Number.isSafeInteger(input.nonce) || input.nonce < 0) {
        throw new Error('Gasless swaps require a non-negative integer nonce');
    }
    if (!Number.isInteger(input.chainId) || input.chainId <= 0) {
        throw new Error('Gasless swaps require a valid chain id');
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
        throw new Error('Gasless swaps require a positive amount');
    }
    return { ...input };
}