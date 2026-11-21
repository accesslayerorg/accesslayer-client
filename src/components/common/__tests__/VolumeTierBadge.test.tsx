/**
 * Unit tests for VolumeTierBadge (#1102).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import VolumeTierBadge from '@/components/common/VolumeTierBadge';
import { TIER_THRESHOLDS_STROOPS } from '@/utils/volumeDiscountTier.utils';

describe('VolumeTierBadge', () => {
	it('renders nothing for a wallet with no discount tier', () => {
		const { container } = render(
			<VolumeTierBadge tier={null} cumulativeVolumeStroops={0} />
		);
		expect(container).toBeEmptyDOMElement();
	});

	it('renders the bronze badge', () => {
		render(
			<VolumeTierBadge
				tier="bronze"
				cumulativeVolumeStroops={TIER_THRESHOLDS_STROOPS.bronze}
			/>
		);
		const badge = screen.getByTestId('volume-tier-badge');
		expect(badge).toHaveAttribute('data-tier', 'bronze');
		expect(badge).toHaveTextContent('Bronze');
	});

	it('renders the silver badge', () => {
		render(
			<VolumeTierBadge
				tier="silver"
				cumulativeVolumeStroops={TIER_THRESHOLDS_STROOPS.silver}
			/>
		);
		expect(screen.getByTestId('volume-tier-badge')).toHaveTextContent(
			'Silver'
		);
	});

	it('renders the gold badge', () => {
		render(
			<VolumeTierBadge
				tier="gold"
				cumulativeVolumeStroops={TIER_THRESHOLDS_STROOPS.gold}
			/>
		);
		expect(screen.getByTestId('volume-tier-badge')).toHaveTextContent('Gold');
	});

	it('shows a tooltip with the distance to the next tier', () => {
		render(
			<VolumeTierBadge
				tier="bronze"
				cumulativeVolumeStroops={TIER_THRESHOLDS_STROOPS.bronze}
			/>
		);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Silver');
	});

	it('shows a top-tier tooltip for gold', () => {
		render(
			<VolumeTierBadge
				tier="gold"
				cumulativeVolumeStroops={TIER_THRESHOLDS_STROOPS.gold}
			/>
		);
		expect(screen.getByRole('tooltip')).toHaveTextContent(
			"You've reached the highest tier"
		);
	});
});
