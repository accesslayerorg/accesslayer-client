export interface RescuedTokenRecord {
	token: string;
	amount: number;
	rescuedAt: string;
	transactionHash?: string;
}

export interface RescuedTokenTotal {
	token: string;
	total: number;
	count: number;
}
