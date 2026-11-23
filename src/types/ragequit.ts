export interface RagequitWindowStatus {
	proposalId: string;
	isOpen: boolean;
	windowEndsAt: string; // ISO string
	remainingSeconds: number;
	totalReserveXlm: number;
	totalCirculatingKeys: number;
	/** Cumulative keys exited through ragequit so far. */
	cumulativeExits: number;
	/** Maximum keys allowed to exit in this grace window (e.g. 20% cap). */
	exitCap: number;
	/** Whether proposal was executed after window closed. */
	isExecuted: boolean;
	executedProposalId?: string;
}

export interface RagequitEligibility {
	isEligible: boolean;
	/** Explanation reason if ineligible (e.g. voted in favor, zero keys, window closed). */
	ineligibilityReason?: string;
	userKeys: number;
	userVoteDirection?: 'for' | 'against' | 'abstain' | 'none';
	estimatedPayoutXlm: number;
	payoutPerKeyXlm: number;
}

export type RagequitState = RagequitWindowStatus & RagequitEligibility;
