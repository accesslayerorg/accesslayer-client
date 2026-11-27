export type OracleSource = 'primary' | 'fallback';

export type OracleHealthState = 'healthy' | 'fallback' | 'stale';

export interface OracleStatus {
	/** Asset identifier (e.g., 'XLM' or creator key ID). */
	asset: string;
	/** Reference price in stroops (1 XLM = 10,000,000 stroops). */
	priceStroops: number;
	/** Reference price in XLM. */
	priceXlm: number;
	/** Active feed source: primary or fallback. */
	source: OracleSource;
	/** Human-readable source name (e.g. 'Primary Feed' vs 'Secondary Fallback'). */
	sourceName: string;
	/** Contract-reported health status. */
	status: OracleHealthState;
	/** Epoch timestamp in ms of last oracle report. */
	updatedAt: number;
	/** Age of the price report in milliseconds. */
	ageMs: number;
	/** Deviation between oracle price and contract spot view in basis points. */
	deviationBps: number;
	/** Deviation as a percentage. */
	deviationPercent: number;
	/** Whether price age exceeds staleness threshold. */
	isStale: boolean;
	/** Whether active source is fallback. */
	isFallback: boolean;
	/** Maximum age before price is considered stale (e.g. 5 minutes). */
	maxStaleAgeMs: number;
}
