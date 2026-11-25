export interface BalanceCheckpoint {
	id: string;
	ledger: number;
	timestamp: number; // Unix timestamp in milliseconds
	keyId: string;
	keyName?: string;
	balance: number;
	change: number;
	eventType: 'buy' | 'sell' | 'initial';
}

export interface AsOfHoldingItem {
	keyId: string;
	keyName: string;
	balance: number;
	asOfCheckpointLedger: number | null;
}

export interface AsOfLookupResult {
	targetDate: Date;
	targetTimestamp: number;
	estimatedLedger: number;
	referenceLedger: number;
	referenceTimestamp: number;
	approximationNote: string;
	holdings: AsOfHoldingItem[];
	totalBalance: number;
}
