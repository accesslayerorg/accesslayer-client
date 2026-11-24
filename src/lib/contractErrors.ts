export interface ContractErrorEntry {
	title: string;
	message: string;
	recoveryAction: 'adjust-slippage' | 'add-funds' | 'retry' | 'contact-support' | 'none';
	recoveryLabel: string;
}

export const CONTRACT_ERROR_MAP: Record<string, ContractErrorEntry> = {
	// LP reward contract error codes (accesslayer-contracts #1002)
	LP_1: {
		title: 'Invalid amount',
		message: 'The amount must be greater than zero.',
		recoveryAction: 'retry',
		recoveryLabel: 'Try again',
	},
	LP_2: {
		title: 'Position not found',
		message: 'This liquidity position no longer exists on-chain.',
		recoveryAction: 'none',
		recoveryLabel: 'Dismiss',
	},
	LP_3: {
		title: 'Unauthorized',
		message: 'Your wallet is not authorized to manage this position.',
		recoveryAction: 'none',
		recoveryLabel: 'Dismiss',
	},
	LP_4: {
		title: 'Nothing to claim',
		message: 'There are no rewards available to claim at this time.',
		recoveryAction: 'retry',
		recoveryLabel: 'Refresh',
	},
	LP_5: {
		title: 'No liquidity',
		message: 'This pool has no liquidity yet.',
		recoveryAction: 'none',
		recoveryLabel: 'Dismiss',
	},
	LP_6: {
		title: 'Position closed',
		message: 'This liquidity position has already been closed.',
		recoveryAction: 'none',
		recoveryLabel: 'Dismiss',
	},
	LP_7: {
		title: 'Amount too large',
		message: 'The amount exceeds what the contract can process in a single transaction.',
		recoveryAction: 'retry',
		recoveryLabel: 'Adjust amount',
	},
	// Trade / swap error codes
	SLIPPAGE_EXCEEDED: {
		title: 'Slippage exceeded',
		message:
			'The price moved beyond your slippage tolerance before the trade could execute. Try increasing slippage or submit the transaction again.',
		recoveryAction: 'adjust-slippage',
		recoveryLabel: 'Adjust slippage',
	},
	INSUFFICIENT_BALANCE: {
		title: 'Insufficient balance',
		message: 'Your wallet does not have enough XLM to complete this transaction, including network fees.',
		recoveryAction: 'add-funds',
		recoveryLabel: 'Add funds',
	},
	HOLDING_CAP_EXCEEDED: {
		title: 'Holding cap reached',
		message: 'This purchase would exceed the maximum number of keys allowed per wallet for this creator.',
		recoveryAction: 'retry',
		recoveryLabel: 'Adjust quantity',
	},
	CIRCUIT_BREAKER_TRIPPED: {
		title: 'Price impact too high',
		message:
			'Your trade would move the price beyond the circuit breaker limit set for this key. Reduce the quantity and try again.',
		recoveryAction: 'retry',
		recoveryLabel: 'Adjust quantity',
	},
	PRICE_FLOOR_ACTIVE: {
		title: 'Sell blocked by price floor',
		message: 'Selling is disabled while the current price is at or below the floor price.',
		recoveryAction: 'none',
		recoveryLabel: 'Dismiss',
	},
	// Governance
	INVALID_OPTION: {
		title: 'Invalid vote option',
		message: 'The selected vote option is not valid for this proposal.',
		recoveryAction: 'retry',
		recoveryLabel: 'Try again',
	},
	VOTE_CLOSED: {
		title: 'Voting closed',
		message: 'The voting period for this proposal has ended.',
		recoveryAction: 'none',
		recoveryLabel: 'Dismiss',
	},
	// Generic / fallback
	TRANSACTION_FAILED: {
		title: 'Transaction failed',
		message: 'The transaction was submitted but the network rejected it. No funds were moved.',
		recoveryAction: 'retry',
		recoveryLabel: 'Try again',
	},
	NOT_CONFIGURED: {
		title: 'Service not available',
		message: 'This action is unavailable because the contract endpoint is not configured.',
		recoveryAction: 'contact-support',
		recoveryLabel: 'Get help',
	},
};

export const FALLBACK_ERROR: ContractErrorEntry = {
	title: 'Unexpected error',
	message: 'Something went wrong. The transaction may not have been submitted.',
	recoveryAction: 'retry',
	recoveryLabel: 'Try again',
};

const SOROBAN_ERROR_CODE_PATTERN = /Error\(Contract,\s*#(\d+)\)/;
const KNOWN_KEYWORD_PATTERNS: Array<{ pattern: RegExp; key: string }> = [
	{ pattern: /slippage/i, key: 'SLIPPAGE_EXCEEDED' },
	{ pattern: /insufficient.*(balance|fund)/i, key: 'INSUFFICIENT_BALANCE' },
	{ pattern: /holding.?cap/i, key: 'HOLDING_CAP_EXCEEDED' },
	{ pattern: /circuit.?breaker/i, key: 'CIRCUIT_BREAKER_TRIPPED' },
	{ pattern: /price.?floor/i, key: 'PRICE_FLOOR_ACTIVE' },
	{ pattern: /invalid.?option/i, key: 'INVALID_OPTION' },
	{ pattern: /vote.?(closed|ended)/i, key: 'VOTE_CLOSED' },
	{ pattern: /not.?configured/i, key: 'NOT_CONFIGURED' },
	{ pattern: /transaction.?failed/i, key: 'TRANSACTION_FAILED' },
];

export interface DecodedContractError {
	entry: ContractErrorEntry;
	rawCode: string | null;
	rawMessage: string;
}

export function decodeContractError(error: unknown): DecodedContractError {
	const rawMessage =
		error instanceof Error
			? error.message
			: typeof error === 'string'
				? error
				: 'Unknown error';

	// Try matching a Soroban numeric error code first
	const sorobanMatch = SOROBAN_ERROR_CODE_PATTERN.exec(rawMessage);
	if (sorobanMatch) {
		const numeric = Number(sorobanMatch[1]);
		const lpKey = `LP_${numeric}`;
		const entry = CONTRACT_ERROR_MAP[lpKey];
		if (entry) {
			return { entry, rawCode: lpKey, rawMessage };
		}
	}

	// Try matching error codes from Error class `.code` property
	const errorCode =
		error != null && typeof error === 'object' && 'code' in error
			? String((error as { code: unknown }).code)
			: null;

	if (errorCode && CONTRACT_ERROR_MAP[errorCode]) {
		return {
			entry: CONTRACT_ERROR_MAP[errorCode],
			rawCode: errorCode,
			rawMessage,
		};
	}

	// Try keyword matching on message text
	for (const { pattern, key } of KNOWN_KEYWORD_PATTERNS) {
		if (pattern.test(rawMessage)) {
			return {
				entry: CONTRACT_ERROR_MAP[key],
				rawCode: key,
				rawMessage,
			};
		}
	}

	return { entry: FALLBACK_ERROR, rawCode: null, rawMessage };
}
