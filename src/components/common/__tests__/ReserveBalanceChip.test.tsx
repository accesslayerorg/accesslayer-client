import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReserveBalanceChip from '@/components/common/ReserveBalanceChip';
import { RESERVE_TOOLTIP_TEXT } from '@/utils/keyReserve.utils';

describe('ReserveBalanceChip', () => {
	it('renders the balance and the explanatory tooltip', () => {
		render(
			<ReserveBalanceChip
				reserve={{ reserveStroops: 500_000_000, marketCapStroops: 1_000_000_000 }}
			/>
		);

		expect(screen.getByTestId('reserve-balance-value')).toHaveTextContent('50');
		expect(screen.getByRole('tooltip')).toHaveTextContent(RESERVE_TOOLTIP_TEXT);
		expect(screen.queryByTestId('reserve-low-warning')).not.toBeInTheDocument();
	});

	it('shows the low reserve warning below 10% of market cap', () => {
		render(
			<ReserveBalanceChip
				reserve={{ reserveStroops: 50_000_000, marketCapStroops: 1_000_000_000 }}
			/>
		);

		expect(screen.getByTestId('reserve-low-warning')).toHaveTextContent(
			'Low reserve'
		);
	});

	it('renders nothing for a key with zero reserve', () => {
		const { container } = render(
			<ReserveBalanceChip
				reserve={{ reserveStroops: 0, marketCapStroops: 1_000_000_000 }}
			/>
		);

		expect(container).toBeEmptyDOMElement();
	});
});
