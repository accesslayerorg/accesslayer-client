import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import HeldKeysGrid from '@/components/common/HeldKeysGrid';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import type { Course } from '@/services/course.service';

function position(overrides: Partial<HeldKeyPosition> = {}): HeldKeyPosition {
	return {
		creatorId: 'creator-1',
		quantity: 4,
		priceStroops: 2_500_000,
		price: null,
		...overrides,
	};
}

function creator(
	id: string,
	title: string,
	overrides: Partial<Course> = {}
): Course {
	return {
		id,
		title,
		description: '',
		price: 0,
		instructorId: id,
		category: 'creators',
		level: 'BEGINNER',
		...overrides,
	};
}

function renderGrid({
	positions = [position()],
	creators = [creator('creator-1', 'Alpha Creator')],
	isOwnProfile = true,
	isLoading = false,
}: {
	positions?: HeldKeyPosition[];
	creators?: Course[];
	isOwnProfile?: boolean;
	isLoading?: boolean;
} = {}) {
	return render(
		<MemoryRouter>
			<HeldKeysGrid
				positions={positions}
				creators={creators}
				isOwnProfile={isOwnProfile}
				isLoading={isLoading}
			/>
		</MemoryRouter>
	);
}

describe('HeldKeysGrid (#921)', () => {
	it('values each held key from the bond-curve price and quantity', () => {
		renderGrid();

		const card = screen.getByTestId('holding-card-creator-1');
		expect(within(card).getByText('Alpha Creator')).toBeInTheDocument();
		expect(
			within(card).getByTestId('holding-quantity-creator-1')
		).toHaveTextContent('4 keys');
		// priceStroops 2_500_000 = 0.25 XLM; value = 0.25 × 4 = 1 XLM
		expect(
			within(card).getByTestId('holding-current-value-creator-1')
		).toHaveTextContent('1 XLM');
	});

	it('shows unrealised PnL against the position cost basis', () => {
		renderGrid({
			positions: [
				position({
					quantity: 4,
					priceStroops: 2_500_000,
					costBasisStroops: 2_000_000,
				}),
			],
		});

		const card = screen.getByTestId('holding-card-creator-1');
		expect(
			within(card).getByTestId('holding-pnl-creator-1')
		).toHaveTextContent('+0.80 XLM');
	});

	it('shows Buy and Sell actions for the profile owner', () => {
		renderGrid({ isOwnProfile: true });

		expect(
			screen.getByRole('link', { name: 'Buy Alpha Creator' })
		).toHaveAttribute('href', '/creator/creator-1');
		expect(
			screen.getByRole('link', { name: 'Sell Alpha Creator' })
		).toHaveAttribute('href', '/creator/creator-1');
	});

	it('hides wallet-specific actions on a public profile', () => {
		renderGrid({ isOwnProfile: false });

		expect(
			screen.queryByRole('link', { name: /Buy/ })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('link', { name: /Sell/ })
		).not.toBeInTheDocument();
		// Valuation is still shown publicly.
		expect(
			screen.getByTestId('holding-current-value-creator-1')
		).toHaveTextContent('1 XLM');
	});

	it('surfaces the unclaimed-dividend badge to the owner', () => {
		renderGrid({
			positions: [position({ unclaimedDividend: 12 })],
			isOwnProfile: true,
		});

		expect(
			screen.getByTestId('holding-unclaimed-dividend-creator-1')
		).toBeInTheDocument();
	});

	it('offers Redeem instead of Buy/Sell for deprecated keys', () => {
		renderGrid({
			creators: [
				creator('creator-1', 'Alpha Creator', { deprecated: true }),
			],
			isOwnProfile: true,
		});

		expect(screen.getByRole('link', { name: 'Redeem' })).toBeInTheDocument();
		expect(
			screen.queryByRole('link', { name: /Buy/ })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('link', { name: /Sell/ })
		).not.toBeInTheDocument();
	});

	it('shows the empty state when there are no holdings', () => {
		renderGrid({ positions: [] });

		expect(
			screen.getByRole('status', { name: 'No holdings' })
		).toBeInTheDocument();
	});

	it('shows a loading skeleton while holdings load', () => {
		renderGrid({ isLoading: true, positions: [] });

		expect(screen.getByTestId('holdings-list-skeleton')).toBeInTheDocument();
	});
});
