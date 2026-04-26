import { describe, expect, it } from 'vitest';
import {
	getClaimActionDisabledReasonText,
	type ClaimActionDisabledReasonKey,
} from '@/utils/claimActionDisabledReason';

describe('getClaimActionDisabledReasonText', () => {
	it('returns standardized helper text for each disabled reason', () => {
		const cases: Array<[ClaimActionDisabledReasonKey, string]> = [
			[
				'wallet_not_connected',
				'Claim is unavailable because your wallet is not connected. Connect your wallet to continue.',
			],
			[
				'no_claimable_rewards',
				'Claim is unavailable because there are no rewards ready yet. Check back after a new payout accrues.',
			],
			[
				'claim_in_progress',
				'Claim is unavailable because a claim transaction is already in progress. Wait for confirmation before trying again.',
			],
			[
				'network_mismatch',
				'Claim is unavailable because your wallet is on the wrong network. Switch to the supported network to continue.',
			],
			[
				'insufficient_gas',
				'Claim is unavailable because your wallet balance is too low for network fees. Add funds for gas, then retry.',
			],
			[
				'unknown',
				'Claim is temporarily unavailable due to a validation issue. Refresh and try again, or contact support if it persists.',
			],
		];

		for (const [reason, expectedText] of cases) {
			expect(getClaimActionDisabledReasonText(reason)).toBe(expectedText);
		}
	});
});
