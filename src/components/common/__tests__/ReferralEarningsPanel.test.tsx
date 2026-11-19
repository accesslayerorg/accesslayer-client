import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReferralEarningsPanel } from '../ReferralEarningsPanel';

describe('ReferralEarningsPanel', () => {
	it('shows the referee count alongside the earnings summary', () => {
		render(
			<ReferralEarningsPanel
				earnings={{
					totalEarnedXlm: 42.5,
					pendingXlm: 17.25,
					claimedXlm: 25.25,
					rewardBps: 500,
					referredCount: 12,
					convertedCount: 8,
					hasClaimable: true,
				}}
			/>
		);

		expect(screen.getByText('Referees')).toBeInTheDocument();
		expect(screen.getByTestId('referral-referees')).toHaveTextContent('12');
		expect(screen.getByTestId('referral-total-earned')).toHaveTextContent('42.5');
		expect(screen.getByTestId('referral-pending')).toHaveTextContent('17.25');
	});
});
