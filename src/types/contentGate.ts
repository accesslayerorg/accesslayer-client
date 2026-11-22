/**
 * Gate types a creator can configure for their key's gated content (#1221).
 *
 * `none` disables the gate entirely; the other three are the access rules the
 * `SubscriptionAccessGate` component renders for holders.
 */
export type ContentGateType = 'none' | 'holder' | 'subscriber' | 'threshold';

/** A key's content gate configuration. */
export interface ContentGateConfig {
	/** Configured gate type. */
	gateType: ContentGateType;
	/**
	 * Minimum token amount required by the threshold gate.
	 * Null for every other gate type.
	 */
	thresholdAmount: number | null;
}
