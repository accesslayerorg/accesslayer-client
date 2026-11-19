import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReferralTierBreakdown from '../ReferralTierBreakdown';

describe('ReferralTierBreakdown (#1119)', () => {
	it('renders the count for each tier', () => {
		render(<ReferralTierBreakdown counts={{ 1: 12, 2: 3, 3: 1 }} />);

		expect(screen.getByTestId('referral-tier-1')).toHaveTextContent('12');
		expect(screen.getByTestId('referral-tier-2')).toHaveTextContent('3');
		expect(screen.getByTestId('referral-tier-3')).toHaveTextContent('1');
	});

	it('renders zero counts for an empty network', () => {
		render(<ReferralTierBreakdown counts={{ 1: 0, 2: 0, 3: 0 }} />);

		expect(screen.getByTestId('referral-tier-1')).toHaveTextContent('0');
		expect(screen.getByTestId('referral-tier-2')).toHaveTextContent('0');
		expect(screen.getByTestId('referral-tier-3')).toHaveTextContent('0');
	});

	it('shows a skeleton while loading', () => {
		render(<ReferralTierBreakdown counts={{ 1: 0, 2: 0, 3: 0 }} isLoading />);

		expect(
			screen.getByTestId('referral-tier-breakdown-skeleton')
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('referral-tier-breakdown')
		).not.toBeInTheDocument();
	});
});
