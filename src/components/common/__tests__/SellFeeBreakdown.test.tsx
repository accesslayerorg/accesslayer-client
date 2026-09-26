import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SellFeeBreakdown from '@/components/common/SellFeeBreakdown';
import type { LaunchPenaltyBreakdown } from '@/utils/launchPenalty.utils';

const noPenalty: LaunchPenaltyBreakdown = {
	applies: false,
	penaltyBps: 0,
	penaltyStroops: 0,
	netProceedsStroops: 1_000_000,
};

describe('SellFeeBreakdown', () => {
	it('shows only the gross proceeds estimate when no penalty applies', () => {
		render(
			<SellFeeBreakdown
				grossProceedsStroops={1_000_000}
				launchPenalty={noPenalty}
			/>
		);

		expect(screen.getByText(/Estimated proceeds/i)).toBeInTheDocument();
		expect(screen.getByText(/0\.10? XLM/)).toBeInTheDocument();
		expect(
			screen.queryByTestId('sell-fee-breakdown-penalty')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('sell-fee-breakdown-net')
		).not.toBeInTheDocument();
	});

	it('shows "Estimated proceeds unavailable" when gross proceeds are null', () => {
		render(
			<SellFeeBreakdown grossProceedsStroops={null} launchPenalty={noPenalty} />
		);

		expect(
			screen.getByText('Estimated proceeds unavailable')
		).toBeInTheDocument();
	});

	it('shows the penalty line item and net proceeds when the penalty applies', () => {
		const penalty: LaunchPenaltyBreakdown = {
			applies: true,
			penaltyBps: 500,
			penaltyStroops: 50_000,
			netProceedsStroops: 950_000,
		};

		render(
			<SellFeeBreakdown
				grossProceedsStroops={1_000_000}
				launchPenalty={penalty}
			/>
		);

		const penaltyRow = screen.getByTestId('sell-fee-breakdown-penalty');
		expect(penaltyRow).toHaveTextContent('Launch penalty (5%)');
		expect(penaltyRow).toHaveTextContent('0.005 XLM');

		const netRow = screen.getByTestId('sell-fee-breakdown-net');
		expect(netRow).toHaveTextContent('Net proceeds');
		expect(netRow).toHaveTextContent('0.095 XLM');
	});

	it('formats the net proceeds correctly for a large penalty', () => {
		const penalty: LaunchPenaltyBreakdown = {
			applies: true,
			penaltyBps: 2000, // 20%
			penaltyStroops: 200_000,
			netProceedsStroops: 800_000,
		};

		render(
			<SellFeeBreakdown
				grossProceedsStroops={1_000_000}
				launchPenalty={penalty}
			/>
		);

		expect(screen.getByTestId('sell-fee-breakdown-penalty')).toHaveTextContent(
			'Launch penalty (20%)'
		);
		expect(screen.getByTestId('sell-fee-breakdown-net')).toHaveTextContent(
			'0.08 XLM'
		);
	});
});
