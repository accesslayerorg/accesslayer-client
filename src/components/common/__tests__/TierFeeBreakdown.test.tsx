/**
 * Unit tests for TierFeeBreakdown (#1102).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TierFeeBreakdown from '@/components/common/TierFeeBreakdown';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';

describe('TierFeeBreakdown', () => {
	it('shows no discount for a wallet with no tier', () => {
		render(
			<TierFeeBreakdown
				tier={null}
				cumulativeVolumeStroops={0}
				baseFeeStroops={1_000_000}
			/>
		);

		expect(screen.getByTestId('tier-fee-base')).toHaveTextContent(
			formatDisplayKeyPrice(1_000_000)
		);
		expect(screen.getByTestId('tier-fee-discount')).toHaveTextContent(
			formatDisplayKeyPrice(0)
		);
		expect(screen.getByTestId('tier-fee-final')).toHaveTextContent(
			formatDisplayKeyPrice(1_000_000)
		);
		expect(screen.queryByTestId('volume-tier-badge')).not.toBeInTheDocument();
	});

	it('applies the gold tier discount to the base fee', () => {
		render(
			<TierFeeBreakdown
				tier="gold"
				cumulativeVolumeStroops={100_000_000_000}
				baseFeeStroops={1_000_000}
			/>
		);

		// Gold tier is 150 bps (1.5%) off the base fee.
		const expectedDiscount = Math.round((1_000_000 * 150) / 10_000);
		expect(screen.getByTestId('tier-fee-discount')).toHaveTextContent(
			formatDisplayKeyPrice(expectedDiscount)
		);
		expect(screen.getByTestId('tier-fee-final')).toHaveTextContent(
			formatDisplayKeyPrice(1_000_000 - expectedDiscount)
		);
		expect(screen.getByTestId('volume-tier-badge')).toHaveTextContent('Gold');
	});
});
