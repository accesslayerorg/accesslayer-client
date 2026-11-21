import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReferralEarningsTable from '../ReferralEarningsTable';
import type { ReferralEarningRow } from '@/utils/referral.utils';

const rows: ReferralEarningRow[] = [
	{
		id: 'r1',
		date: '2026-03-01T00:00:00.000Z',
		sourceWallet: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567abcdefghijklmnop',
		tier: 1,
		amountXlm: 2.5,
		claimed: false,
	},
	{
		id: 'r2',
		date: '2026-02-01T00:00:00.000Z',
		sourceWallet: 'GSHORT',
		tier: 3,
		amountXlm: 0.75,
		claimed: true,
	},
];

describe('ReferralEarningsTable (#1119)', () => {
	it('renders every earning row with date, truncated wallet, tier, and amount', () => {
		render(<ReferralEarningsTable rows={rows} />);

		const renderedRows = screen.getAllByTestId('referral-earning-row');
		expect(renderedRows).toHaveLength(2);

		// Long addresses are truncated to first 4 + last 4 characters.
		expect(screen.getAllByTestId('referral-earning-source')[0]).toHaveTextContent(
			'GABC…mnop'
		);
		expect(screen.getAllByTestId('referral-earning-tier')[0]).toHaveTextContent(
			'Tier 1'
		);
		expect(
			screen.getAllByTestId('referral-earning-amount')[0]
		).toHaveTextContent('2.5 XLM');

		// Short addresses stay intact.
		expect(screen.getAllByTestId('referral-earning-source')[1]).toHaveTextContent(
			'GSHORT'
		);
		expect(screen.getAllByTestId('referral-earning-tier')[1]).toHaveTextContent(
			'Tier 3'
		);
	});

	it('shows an empty state when there are no earnings', () => {
		render(<ReferralEarningsTable rows={[]} />);

		expect(screen.getByTestId('referral-earnings-empty')).toBeInTheDocument();
		expect(
			screen.queryByTestId('referral-earnings-rows')
		).not.toBeInTheDocument();
	});

	it('shows a skeleton while loading', () => {
		render(<ReferralEarningsTable rows={[]} isLoading />);

		expect(
			screen.getByTestId('referral-earnings-table-skeleton')
		).toBeInTheDocument();
	});
});
